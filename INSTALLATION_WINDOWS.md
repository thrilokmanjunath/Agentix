# Agentix Desktop — Windows Installation Guide

This guide provides instructions for installing and running **Agentix Native Desktop** on Microsoft Windows.

---

## 1. System Requirements

- **Operating System**: Windows 10 (Version 2004 or later) or Windows 11 (64-bit).
- **Architecture**: x86_64 (64-bit AMD/Intel processor).
- **Webview Engine**: Microsoft Edge WebView2 Runtime (pre-installed on Windows 11 and recent Windows 10 updates; downloaded automatically by the installer if missing).
- **RAM**: 8 GB minimum (16 GB recommended).
- **Storage**: ~600 MB free disk space.

---

## 2. Installation Options

### Option A: MSI Windows Installer (Recommended)
1. Download `Agentix_1.0.0_x64_en-US.msi` from [GitHub Releases](https://github.com/thrilokmanjunath/Agentix/releases).
2. Double-click the `.msi` file to launch the standard Windows Setup Wizard.
3. Follow the on-screen prompts to install Agentix. The installer automatically creates Start Menu shortcuts and registers file associations.

### Option B: NSIS Setup Executable
1. Download `Agentix_1.0.0_x64-setup.exe`.
2. Follow the standard installation wizard to choose an installation directory (defaults to `%LOCALAPPDATA%\Programs\Agentix`).

---

## 3. Windows Defender SmartScreen Handling

For new releases before broad public download reputation is accumulated:
1. Windows Defender SmartScreen may display a blue dialog: *"Windows protected your PC: Microsoft Defender SmartScreen prevented an unrecognized app from starting."*
2. Click **More info**.
3. Click the **Run anyway** button.

---

## 4. Local AI Inference Link (Ollama on Windows)

To use Agentix with 100% offline local inference:
1. Download and install Ollama for Windows from [ollama.com/download/windows](https://ollama.com/download/windows).
2. Open PowerShell or Command Prompt and download a lightweight model:
   ```powershell
   ollama pull qwen2.5:3b
   ```
3. Start Agentix. The application detects the Ollama service on `http://127.0.0.1:11434` automatically.

---

## 5. Storage Directory

All local data is stored in your isolated user roaming application directory:
```
%APPDATA%\Agentix\
├── agentix.db       # Local SQLite relational store
├── data\temp\       # Cached Parquet datasets
├── models\          # Serialized scikit-learn models
└── logs\            # Diagnostic logs
```
To access this directory: Press `Win + R`, type `%APPDATA%\Agentix`, and hit Enter, or use the **Open Data Folder** button inside the Agentix Settings view.
