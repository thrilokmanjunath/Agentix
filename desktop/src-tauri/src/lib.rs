use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, State};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use rand::{distributions::Alphanumeric, Rng};

#[derive(Default, Serialize, Deserialize, Clone, Debug)]
pub struct DesktopInfo {
    pub port: u16,
    pub token: String,
    pub data_dir: String,
    pub pid: u32,
    pub is_ready: bool,
    pub platform: String,
    pub version: String,
}

pub struct AppState {
    pub info: Arc<Mutex<DesktopInfo>>,
}

fn generate_session_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(48)
        .map(char::from)
        .collect()
}

#[tauri::command]
fn get_desktop_info(state: State<'_, AppState>) -> Result<DesktopInfo, String> {
    let info = state.info.lock().map_err(|e| e.to_string())?;
    Ok(info.clone())
}

#[tauri::command]
async fn check_backend_health(state: State<'_, AppState>) -> Result<bool, String> {
    let port = {
        let info = state.info.lock().map_err(|e| e.to_string())?;
        info.port
    };
    if port == 0 {
        return Ok(false);
    }
    let url = format!("http://127.0.0.1:{}/health", port);
    match reqwest::get(&url).await {
        Ok(res) => Ok(res.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
fn open_data_folder(state: State<'_, AppState>) -> Result<(), String> {
    let data_dir = {
        let info = state.info.lock().map_err(|e| e.to_string())?;
        info.data_dir.clone()
    };
    if !data_dir.is_empty() {
        let path = PathBuf::from(data_dir);
        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("open").arg(&path).spawn();
        }
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("explorer").arg(&path).spawn();
        }
        #[cfg(target_os = "linux")]
        {
            let _ = std::process::Command::new("xdg-open").arg(&path).spawn();
        }
    }
    Ok(())
}

#[tauri::command]
async fn trigger_shutdown(state: State<'_, AppState>) -> Result<(), String> {
    let (port, token) = {
        let info = state.info.lock().map_err(|e| e.to_string())?;
        (info.port, info.token.clone())
    };
    if port > 0 && !token.is_empty() {
        let client = reqwest::Client::new();
        let _ = client
            .post(format!("http://127.0.0.1:{}/api/v1/system/shutdown", port))
            .header("X-Agentix-Token", token)
            .timeout(Duration::from_secs(2))
            .send()
            .await;
    }
    Ok(())
}

pub fn run() {
    let initial_info = DesktopInfo {
        port: 0,
        token: generate_session_token(),
        data_dir: String::new(),
        pid: 0,
        is_ready: false,
        platform: std::env::consts::OS.to_string(),
        version: "1.0.0".to_string(),
    };

    let shared_info = Arc::new(Mutex::new(initial_info));
    let shared_info_clone = Arc::clone(&shared_info);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            info: shared_info,
        })
        .invoke_handler(tauri::generate_handler![
            get_desktop_info,
            check_backend_health,
            open_data_folder,
            trigger_shutdown
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let session_token = {
                let info = shared_info_clone.lock().unwrap();
                info.token.clone()
            };

            // Spawn the Python FastAPI Sidecar via Tauri Shell Plugin
            let sidecar_result = app.shell().sidecar("agentix-backend");
            match sidecar_result {
                Ok(cmd) => {
                    let cmd = cmd
                        .args(["--port", "0", "--token", &session_token]);

                    match cmd.spawn() {
                        Ok((mut rx, _child)) => {
                            let info_arc = Arc::clone(&shared_info_clone);
                            let app_handle_inner = app_handle.clone();

                            tauri::async_runtime::spawn(async move {
                                while let Some(event) = rx.recv().await {
                                    match event {
                                        CommandEvent::Stdout(bytes) => {
                                            let line = String::from_utf8_lossy(&bytes);
                                            println!("[SIDECAR] {}", line.trim());

                                            if line.contains("[AGENTIX_BACKEND_READY]") {
                                                let mut port = 0u16;
                                                let mut data_dir = String::new();
                                                let mut pid = 0u32;

                                                for part in line.split_whitespace() {
                                                    if part.starts_with("PORT=") {
                                                        port = part.replace("PORT=", "").parse().unwrap_or(0);
                                                    } else if part.starts_with("DATA_DIR=") {
                                                        data_dir = part.replace("DATA_DIR=", "");
                                                    } else if part.starts_with("PID=") {
                                                        pid = part.replace("PID=", "").parse().unwrap_or(0);
                                                    }
                                                }

                                                if port > 0 {
                                                    if let Ok(mut lock) = info_arc.lock() {
                                                        lock.port = port;
                                                        lock.data_dir = data_dir;
                                                        lock.pid = pid;
                                                        lock.is_ready = true;
                                                    }
                                                    let _ = app_handle_inner.emit("backend-ready", port);
                                                }
                                            }
                                        }
                                        CommandEvent::Stderr(bytes) => {
                                            let line = String::from_utf8_lossy(&bytes);
                                            eprintln!("[SIDECAR STDERR] {}", line.trim());
                                        }
                                        CommandEvent::Terminated(status) => {
                                            eprintln!("[SIDECAR] Terminated with status: {:?}", status.code);
                                            if let Ok(mut lock) = info_arc.lock() {
                                                lock.is_ready = false;
                                            }
                                        }
                                        _ => {}
                                    }
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!("[AGENTIX DESKTOP] Failed to spawn sidecar: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[AGENTIX DESKTOP] Sidecar executable not found: {}", e);
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let (port, token) = {
                    let state = window.state::<AppState>();
                    let x = if let Ok(info) = state.info.lock() {
                        (info.port, info.token.clone())
                    } else {
                        (0, String::new())
                    };
                    x
                };
                if port > 0 && !token.is_empty() {
                    let _ = std::process::Command::new("curl")
                        .arg("-X")
                        .arg("POST")
                        .arg(format!("http://127.0.0.1:{}/api/v1/system/shutdown", port))
                        .arg("-H")
                        .arg(format!("X-Agentix-Token: {}", token))
                        .output();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Agentix desktop application");
}
