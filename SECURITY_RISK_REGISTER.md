# SECURITY RISK REGISTER & THREAT MODEL: AGENTIX DESKTOP
**Security Classification:** Confidential / Production  
**Target Architecture:** Tauri v2 Native Host + Python FastAPI Loopback Sidecar

---

## 1. Threat Modeling Overview

Transitioning a web application into a local native desktop ecosystem fundamentally shifts the trust boundary. While the web application relies on TLS, HTTP-only cookies, and server-side authorization gates, a local desktop application exposes network listeners on `127.0.0.1` and executes child processes on the user's host operating system.

### Identified Threat Vectors

```
[Threat Vector 1: Malicious Browser Tab]
  (External website attempts fetch('http://127.0.0.1:<port>/api/v1/...') to hijack local ML engine)
                           |
                           v  BLOCKED BY: Per-session X-Agentix-Token & Origin Restriction
+-----------------------------------------------------------------------------------------+
|                  NATIVE PYTHON FASTAPI SIDECAR (127.0.0.1:<port>)                       |
+-----------------------------------------------------------------------------------------+
                           ^  BLOCKED BY: MIME magic bytes check & Path sanitization
                           |
[Threat Vector 2: Malicious Dataset Upload]
  (Attacker crafts CSV/XLSX with path traversal or macro payload: ../../../etc/passwd)
```

---

## 2. Risk Register & Concrete Engineering Mitigations

| Risk ID | Threat Scenario | Severity | Impact | Architectural Mitigation Implemented |
| :---: | :--- | :---: | :---: | :--- |
| **SEC-01** | **Unauthorized Localhost API Access**<br>A malicious website open in the user's browser attempts to query `127.0.0.1` to access local datasets or trigger model runs. | **CRITICAL** | Data exfiltration, unauthorized compute usage | **1. Ephemeral Port:** Sidecar binds to dynamic port unknown to external scripts.<br>**2. Per-Session Token:** Sidecar requires `X-Agentix-Token: <random_256bit_hex>` header on all requests.<br>**3. CORS Strictness:** Sidecar only accepts `Origin: tauri://localhost` or `http://localhost:<frontend_port>`. |
| **SEC-02** | **Remote Code Execution via Sidecar**<br>Malicious instructions passed from web content or UI to trigger arbitrary OS shell commands via desktop shell. | **CRITICAL** | Full host system compromise | **1. Tauri Least Privilege:** `capabilities/default.json` explicitly prohibits arbitrary shell execution.<br>**2. Fixed Process Command:** Sidecar binary path is hardcoded in Rust and launched with strict parameter arrays, never shell strings (`sh -c`). |
| **SEC-03** | **Directory Traversal in File Uploads**<br>Crafted dataset filename containing `../` overwrites system files or reads sensitive directories. | **HIGH** | Arbitrary file overwrite / read | **1. Magic Number Validation:** `UploadAgent` and `FormatDetector` inspect binary headers, not file extensions.<br>**2. Filename Sanitization:** `Path(filename).name` normalization strips all directory traversal sequences.<br>**3. Sandboxed Storage:** Data files restricted to `AppData/Agentix/data/`. |
| **SEC-04** | **Insecure Plaintext Storage of Secrets**<br>User's cloud API keys (Gemini, OpenAI) stored unencrypted in local config files. | **HIGH** | Credential theft | **1. OS Keychain Integration:** Cloud credentials leverage native macOS Keychain / Windows Credential Vault where supported.<br>**2. Strict File Permissions:** Fallback config files created with `0600` (read/write by owner only). |
| **SEC-05** | **Prompt Injection & Jailbreak Attacks**<br>Adversarial dataset columns or user prompts designed to bypass LLM safety controls. | **MEDIUM** | Inappropriate outputs, system prompt leakage | **1. Layer 6 GuardrailEngine:** In-process regex scanning for jailbreak patterns prior to LLM dispatch.<br>**2. Grounded Synthesis Only:** `ReportAgent` restricts LLM to summarizing pre-computed numeric JSON structures. |
| **SEC-06** | **Installer & Update Tampering**<br>Man-in-the-middle attacker replaces desktop update payload with trojaned binary. | **CRITICAL** | Distribution of malicious software | **1. Ed25519 Cryptographic Signatures:** Tauri v2 updater enforces Ed25519 digital signature verification before applying updates.<br>**2. HTTPS Egress Only:** All release assets fetched from official GitHub Releases over TLS. |
| **SEC-07** | **Orphaned Zombie Processes**<br>FastAPI sidecar continues running in background consuming CPU/ports after desktop UI closes. | **MEDIUM** | Resource starvation, port conflicts | **1. Rust Process Monitor:** Tauri supervisor hooks into window close and application exit events.<br>**2. Graceful Shutdown & Force Kill:** Rust sends SIGTERM, waits 3 seconds, then issues SIGKILL if process persists. |
| **SEC-08** | **Sensitive Data in Application Logs**<br>PII (emails, passwords, financial records) written to plaintext log files on disk. | **MEDIUM** | Compliance violation, privacy leak | **1. PII Redaction Filter:** Structured logging engine scrubs email addresses, SSNs, and authorization tokens before writing to disk. |
