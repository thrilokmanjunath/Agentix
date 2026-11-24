# DESKTOP ARCHITECTURE: AGENTIX TAURI V2 NATIVE ECOSYSTEM
**Architecture Specification:** v1.0.0  
**Target Operating Systems:** macOS (Apple Silicon ARM64, Intel x64), Windows 10/11 (x64)

---

## 1. High-Level Architectural Blueprint

The native Agentix desktop platform marries a lightweight, secure **Tauri v2** Rust host with an autonomous **Python FastAPI sidecar** and a shared **Next.js React UI**:

```
+-----------------------------------------------------------------------------------------+
|                               TAURI V2 DESKTOP APPLICATION                              |
|                                                                                         |
|  +-------------------------------------+       +-------------------------------------+  |
|  |     NATIVE SYSTEM HOST (RUST)       |       |       NATIVE WEBVIEW (FRONTEND)     |  |
|  |                                     |       |                                     |  |
|  | - Window Lifecycle & System Tray    |  IPC  | - Warm Alabaster Design System      |  |
|  | - Child Process Sidecar Supervisor  |<----->| - Next.js / React 19 Engine         |  |
|  | - Ephemeral Port & Token Generator  | Event | - Zustand State & Dashboard         |  |
|  | - Native File Dialogs & Menus       | Bus   | - Real-time SSE / WebSocket Feed    |  |
|  | - Auto-Updater (Ed25519 Signed)     |       | - Desktop Settings & Status Monitor |  |
|  +-------------------------------------+       +-------------------------------------+  |
|                     |                                             |                     |
+---------------------|---------------------------------------------|---------------------+
                      | Spawns & Monitors (Child Process)           | Loopback REST / SSE
                      v                                             v
+-----------------------------------------------------------------------------------------+
|                  NATIVE PYTHON FASTAPI SIDECAR (PYINSTALLER EXECUTABLE)                 |
|                                                                                         |
|  - Strictly bound to loopback: 127.0.0.1:<dynamic_port>                                 |
|  - Enforces Header Authentication: X-Agentix-Token: <ephemeral_token>                   |
|  - Multi-Agent Orchestrator (9 Bounded Agents: UploadAgent -> ReportAgent)              |
|  - 32-Algorithm AutoML Registry & 3-Tier XAI Attribution (TreeSHAP -> Surrogate -> Corr)|
|  - Local Ollama Client (http://127.0.0.1:11434 with Metal / CUDA Acceleration)         |
|  - Configurable Cloud API Fallback (Gemini / OpenAI / Anthropic)                        |
|                                                                                         |
|  Data Storage Roots:                                                                    |
|    macOS:   ~/Library/Application Support/Agentix/{agentix.db, data/, models/, logs/}   |
|    Windows: %APPDATA%\Agentix\{agentix.db, data/, models/, logs/}                       |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Desktop Shell: Tauri v2 Implementation

### Why Tauri v2?
- **Zero Chromium Overhead:** Utilizes native OS webviews (WebKit on macOS, WebView2 on Windows), reducing memory footprint by >85% compared to Electron (typically 40 MB vs 350 MB idle RAM).
- **Hardened Security Model:** Tauri v2 enforces explicit capability permissions (`capabilities/default.json`). No arbitrary shell execution or filesystem access is exposed to JavaScript.
- **Native Lifecycle Integration:** System tray, native menus, dock badges, native notifications, and OS file pickers are driven directly from Rust.

### Process Supervision & Lifecycle Flow
1. **Startup Phase:**
   - Tauri main process generates a cryptographically secure 256-bit random session token (`session_token`).
   - Tauri discovers an available ephemeral port on `127.0.0.1` (or lets the backend bind to port 0 and report back).
   - Tauri starts the packaged Python sidecar (`agentix-backend`) via `tauri-plugin-process` / `tauri-plugin-shell`, passing:
     ```bash
     agentix-backend --port <port> --token <session_token> --data-dir <app_data_path>
     ```
   - Tauri displays a native splash/loading window while polling `http://127.0.0.1:<port>/health`.
2. **Readiness Phase:**
   - Once `/health` responds with HTTP 200 `{"status":"ok"}`, Tauri reveals the main application window and injects the port and session token into the frontend webview.
3. **Shutdown Phase:**
   - When the user closes the window or triggers exit, Tauri sends a graceful `POST /api/v1/system/shutdown` or `SIGTERM` to the child process.
   - Tauri waits up to 3 seconds for clean exit before issuing a kill, ensuring zero orphaned processes remain in the OS process table.

---

## 3. Python Backend Sidecar Architecture

### PyInstaller Packaging Strategy
- **Executable Name:** `agentix-backend` (or `agentix-backend.exe` on Windows).
- **Packaging Mode:** `onedir` (recommended for fast sub-second startup) or single-file binary with dependencies bundled.
- **Hidden Imports & Runtime Hooks:**
  - `uvicorn.logging`, `uvicorn.loops.auto`, `uvicorn.protocols.http.auto`, `uvicorn.lifespan.on`
  - `sklearn.utils._typedefs`, `scipy.special.cython_special`, `xgboost`, `lightgbm`, `shap`
  - `fastparquet`, `polars`, `duckdb`
- **Dynamic Resource Resolution:**
  - Uses `sys._MEIPASS` detection when frozen to locate bundled static assets, configurations, and migration scripts.

### Port & Security Negotiation Protocol
- **Loopback Restriction:** Hardcoded binding to `127.0.0.1` only. Never binds to `0.0.0.0`.
- **Per-Session Authentication:** The sidecar mounts a dedicated FastAPI middleware:
  ```python
  if request.headers.get("X-Agentix-Token") != expected_token:
      return JSONResponse(status_code=403, content={"detail": "Unauthorized local client"})
  ```
- **CORS Configuration:** Strictly limited to `tauri://localhost`, `http://localhost:<frontend_port>`, and `http://127.0.0.1:<frontend_port>`.

---

## 4. Local Data & Storage Isolation

All desktop application state is strictly segregated from application binaries:

```
[Platform AppData Root]/Agentix/
├── config.json              # Local runtime settings, Ollama endpoints, preferences
├── agentix.db               # SQLite local transactional database (WAL enabled)
├── data/                    # Ingested datasets and Apache Parquet columnar lake
│   ├── raw/                 # Staged incoming files
│   └── parquet/             # 99.1% Snappy-compressed analytics files
├── models/                  # Serialized machine learning artifacts (.joblib)
├── logs/                    # Rotating application and sidecar logs (agentix.log)
└── cache/                   # Sub-5ms exact-match LLMCache storage
```

### Standard Path Locations
- **macOS:** `/Users/<User>/Library/Application Support/Agentix/`
- **Windows:** `C:\Users\<User>\AppData\Roaming\Agentix\`
- **Linux:** `/home/<User>/.local/share/Agentix/`

---

## 5. Local AI & Model Connectivity

1. **Local Ollama Integration:**
   - Detects local Ollama instance on `http://127.0.0.1:11434/api/tags`.
   - Enumerates available local models (e.g. `qwen2.5-coder`, `llama3`, `mistral`).
   - Direct on-device inference via local hardware acceleration (Metal Unified Memory on Apple Silicon, CUDA on Windows).
2. **Configurable Endpoint:**
   - Allows users to point Agentix to any custom local runtime (e.g., LM Studio on port 1234, vLLM on port 8000).
3. **Optional Cloud Fallback:**
   - User-supplied API keys for Google Gemini, OpenAI, or Anthropic Claude are stored encrypted in the OS keychain or user config and used only when explicitly requested.
