# Security Policy & Desktop Ecosystem Architecture

## Supported Versions

| Version | Supported | Security Maintenance Status |
|---|---|---|
| `1.2.x` (Native Desktop) | :white_check_mark: | Active Core Support |
| `1.0.x` (Web Platform) | :white_check_mark: | Active Core Support |
| `< 1.0` | :x: | End of Life |

---

## 1. Reporting a Vulnerability

Security is a top priority for Agentix, given that it handles enterprise data science workflows, local LLM inference, and potential sensitive tabular datasets.

If you discover a security vulnerability within Agentix, please do NOT submit a public issue on GitHub. Instead, please report it via private disclosure:

1. **Email**: security@agentix.ai (or open a confidential security advisory on GitHub).
2. **Responsible Disclosure Timeline**:
   - We will acknowledge receipt of your vulnerability report within 24 hours.
   - We aim to triage and patch critical vulnerabilities within 5 business days.
   - Please allow us the time to patch the issue before publicly disclosing it.

---

## 2. Desktop Ecosystem Security Model

Agentix Native Desktop is engineered with defense-in-depth principles across the host operating system, process supervision, inter-process communication, and local network boundaries.

### 2.1 Loopback-Only Network Binding
The Python FastAPI sidecar and Local AI Connector bind strictly to the IPv4 loopback interface (`127.0.0.1`).
- Binding to `0.0.0.0` or external interfaces is programmatically blocked.
- Remote hosts on the local network (LAN) or public internet cannot access the local sidecar.

### 2.2 Per-Session Cryptographic Token Barrier
Every time Agentix Desktop launches:
1. The Tauri Rust supervisor generates a 48-character high-entropy cryptographic token (`rand::Rng`).
2. The token is passed to the sidecar process via private CLI flag `--token <token>`.
3. All non-public HTTP endpoints (`/api/v1/*`) mandate the `X-Agentix-Token` header.
4. Any unauthorized browser tab or malicious local process attempting to send requests without this token receives HTTP `403 Forbidden`.

### 2.3 Private Network Access (PNA) Compliance
The Local AI Connector complies with W3C Private Network Access specifications:
- Returns `Access-Control-Allow-Private-Network: true` on preflight OPTIONS requests.
- Strictly validates Origin headers against authorized domains (`https://agentix-bay.vercel.app`, `http://localhost:3000`, `tauri://localhost`).

### 2.4 User Data Directory Isolation
Local datasets, DuckDB/Polars cache, and SQLite databases are stored inside the platform-standard user directory:
- **macOS**: `~/Library/Application Support/Agentix`
- **Windows**: `%APPDATA%\Agentix`
- **Linux**: `~/.local/share/Agentix`

Permissions are restricted to the local user account (`0700` / `rw-------`), preventing cross-user data leakage on shared systems.

### 2.5 Process Supervision & Zombie Elimination
- Tauri supervises the sidecar lifecycle as a direct parent process.
- Upon window close or application exit, the supervisor dispatches an authenticated HTTP POST to `/api/v1/system/shutdown` and monitors process exit.
- Signal handlers (`SIGTERM`, `SIGINT`) flush database transactions and release socket ports cleanly.
