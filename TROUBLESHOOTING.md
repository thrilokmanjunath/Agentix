# Agentix Desktop — Troubleshooting & Diagnostics

This guide resolves common installation, runtime, and connectivity issues across macOS and Windows.

---

## 1. Port Conflicts & Dynamic Allocation

### Symptom
- Console error: `OSError: [Errno 48] Address already in use` or backend fails to bind.

### Cause & Resolution
- In desktop mode, `desktop_entry.py` defaults to finding an available dynamic port when `--port 0` is passed.
- If a fixed port (e.g. `8001` or `8000`) is specified and occupied by another process:
  - **Identify occupying process**:
    ```bash
    # macOS / Linux
    lsof -i :8001
    
    # Windows PowerShell
    Get-NetTCPConnection -LocalPort 8001
    ```
  - **Resolution**: Let Agentix assign a dynamic port via `--port 0`, or terminate the colliding process.

---

## 2. Unauthorized Client / 403 Forbidden Errors

### Symptom
- Frontend displays: `{"status":"error","detail":"Unauthorized local client: valid X-Agentix-Token header required."}`

### Cause & Resolution
- Agentix Native Desktop enforces per-session cryptographic authentication.
- Any request made from external browser tabs or without the desktop token will be rejected.
- **Resolution**: Ensure you are accessing the studio through the supervised native window or check **Settings** > **Desktop Ecosystem** to copy the active token for developer tools or external scripts.

---

## 3. Ollama Offline / Model Not Detected

### Symptom
- Settings panel displays `Ollama Daemon: Not Detected` or model dropdown is empty.

### Diagnostic Steps
1. Run the connector diagnostic suite:
   ```bash
   python connector/agentix_connector.py --diagnose
   ```
2. Verify that Ollama is listening locally:
   ```bash
   curl http://127.0.0.1:11434/api/tags
   ```
3. If Ollama is running on another machine or container, set the custom base URL in **Settings** > **AI Inference Engine**.

---

## 4. macOS Gatekeeper "Cannot check for malicious software"

### Resolution
- See [macOS Installation Guide](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/INSTALLATION_MACOS.md#3-apple-gatekeeper--notarization-handling):
  - Go to **System Settings** > **Privacy & Security** > Click **Open Anyway**.
  - Or run: `xattr -d com.apple.quarantine /Applications/Agentix.app`

---

## 5. Windows Defender SmartScreen "Windows protected your PC"

### Resolution
- Click **More info** on the blue SmartScreen dialog.
- Click **Run anyway**.
