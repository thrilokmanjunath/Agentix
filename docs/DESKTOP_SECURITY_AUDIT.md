# Agentix Native Desktop — Threat-Model & Security Audit

**Audit Date:** 2026-11-25  
**Auditor Roles:** Application Security Engineer, Rust Security Engineer  
**Standard:** OWASP Desktop Application Security & Least Privilege Tauri Architecture

---

## 1. Threat Model & Scope

The Agentix native desktop application integrates a native Rust shell (Tauri v2) with an embedded Python FastAPI backend. The attack surface consists of:
1. **Loopback Network Interface (`127.0.0.1`)**: Local inter-process communication between WKWebView, Rust shell, and Python sidecar.
2. **Tauri IPC Bridge**: Native invocations crossing the JavaScript-to-Rust security boundary.
3. **Local Filesystem Persistence**: Storage of SQLite databases, uploaded datasets, and serialized ML models.
4. **Third-Party Inference Connections**: Direct connections to local Ollama (`11434`) and cloud LLM providers.

---

## 2. Security Controls & Threat Mitigations

### 2.1. Localhost API Exposure & Loopback Hardening
* **Threat:** Malicious local processes or malicious scripts running in the user's web browser scanning open localhost ports to access Agentix API endpoints.
* **Control Implemented:**
  - In `backend/desktop_entry.py`, Uvicorn binds **strictly to `127.0.0.1`**. Binding to `0.0.0.0` is strictly prohibited.
  - Ephemeral port negotiation prevents port predictability.
  - Strict CORS origin validation restricts requests to `tauri://localhost`, `http://tauri.localhost`, and `http://127.0.0.1`.

### 2.2. Session Token Barrier (`X-Agentix-Token`)
* **Threat:** Cross-Site Request Forgery (CSRF) or unauthorized local scripts sending unauthenticated HTTP requests to the sidecar.
* **Control Implemented:**
  - Upon startup, a cryptographically secure 48-character hexadecimal token is generated using `secrets.token_hex(24)` in Python or `rand::thread_rng` in Rust.
  - A FastAPI middleware inspects every non-public request (`/api/v1/*`). If the incoming `X-Agentix-Token` header does not match the active session token, the request is immediately terminated with **HTTP 403 Forbidden**.
  - Public paths are strictly whitelisted to non-sensitive liveness endpoints (`/health`, `/metrics`).
  - Tokens are stored solely in process memory and the webview's private `sessionStorage`, never written to shared disk logs or unencrypted preferences files.

### 2.3. Tauri IPC Surface & Capabilities Hardening
* **Threat:** Webview compromise leading to arbitrary native OS command execution or filesystem traversal.
* **Control Implemented:**
  - Tauri capabilities are configured under least-privilege principles (`desktop/src-tauri/capabilities/default.json`).
  - Only vetted native commands are exposed via `invoke_handler`:
    - `get_desktop_info`: Read-only port and token state.
    - `check_backend_health`: Read-only latency probe.
    - `open_data_folder`: Constrained exclusively to the Agentix application directory.
    - `trigger_shutdown`: Controlled termination.
  - Arbitrary shell execution and command injection through IPC are completely disabled.

### 2.4. Arbitrary File Access & Path Traversal Protections
* **Threat:** File upload endpoints being abused to overwrite system files or access arbitrary directories outside the application scope.
* **Control Implemented:**
  - Ingestion paths are strictly anchored to `data_dir / "data" / "temp"`.
  - Path resolution uses `Path.resolve()` and checks that target files reside strictly within the user's OS application data directory (`~/Library/Application Support/Agentix` or `%APPDATA%\Agentix`).
  - Directory traversal sequences (`../`, `..\`) are sanitized prior to file operations.

### 2.5. Sidecar Impersonation & Parent Supervision
* **Threat:** A rogue process pretending to be the Agentix sidecar, or an orphaned sidecar process persisting after the GUI has closed.
* **Control Implemented:**
  - The sidecar communicates its process ID (`PID`) and assigned port via an authenticated stdout handshake (`[AGENTIX_BACKEND_READY]`).
  - The Rust parent process maintains a direct supervisory handle on the child process.
  - Upon window close (`WindowEvent::CloseRequested`), the parent signals the sidecar's shutdown endpoint and issues SIGTERM on exit, guaranteeing zero orphaned processes.

---

## 3. Vulnerability Verification Summary

| Threat Category | Potential Impact | Severity | Status | Mitigation Applied |
| :--- | :--- | :---: | :---: | :--- |
| **Localhost API Exposure** | Unauthorized local access | High | **MITIGATED** | `127.0.0.1` binding + dynamic port allocation. |
| **Cross-Origin API Tampering** | Malicious web page accessing local API | High | **MITIGATED** | `X-Agentix-Token` 48-char mandatory header check. |
| **Orphaned Process Leakage** | Memory and CPU hogging after exit | Medium | **MITIGATED** | Async `server.should_exit = True` + SIGTERM cleanup. |
| **Sidecar Import Crash** | Denial of Service on startup | High | **MITIGATED** | Universal `Exception` catch in algorithm registry. |
| **Path Traversal on Datasets** | Arbitrary file write | High | **MITIGATED** | Strict path anchoring in OS App Support folder. |
| **Plaintext Credential Leakage** | API key compromise | High | **MITIGATED** | No secrets stored in plaintext config files. |
