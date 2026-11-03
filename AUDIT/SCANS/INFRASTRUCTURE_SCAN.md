# Infrastructure & Container Security Assessment

**Scan Date:** November 2026  
**Auditor:** DevSecOps Team  
**Scope:** Container manifests (`Dockerfile`, `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `nginx.conf`, `start.sh`)

---

## 1. Container Configuration Analysis

### 1.1 `backend/Dockerfile`
- **Base Image:** `python:3.11-slim` (Adequate minimal base).
- **Execution User:** **Root (Missing `USER` instruction)** (Severity: **Medium** / CWE-250).
  - *Risk:* If command execution or arbitrary file write is achieved within the Python container, the attacker immediately executes as root on the container filesystem.
- **Port Binding:** Uses dynamic `${PORT:-8000}` with `CMD uvicorn core.api.main:app --host 0.0.0.0 --port ${PORT:-8000}`.
- **Package Management:** `RUN pip install --no-cache-dir -r requirements.txt`. (Safe).

### 1.2 `frontend/Dockerfile`
- **Base Image:** `node:18-alpine` (Multi-stage build).
- **Bug Identified:** Line 16: `COPY --from=builder /app/next.config.js ./`
  - *Risk:* Build failure because the project uses `next.config.ts`, not `next.config.js`.
- **Execution User:** Root in runner stage.
- **Node Environment:** `ENV NODE_ENV production`.

### 1.3 Root Space `Dockerfile` (Hugging Face Multi-Runtime Container)
- **Base Image:** Multi-stage `node:20-slim`.
- **User Privilege:** Properly creates unprivileged user `appuser` (UID 1000):
  ```dockerfile
  RUN useradd -m -u 1000 appuser \
      && mkdir -p /app/backend/data/temp \
      && chown -R appuser:appuser /app
  USER appuser
  ```
- **Virtual Environment:** Installs backend into an isolated venv (`/opt/venv`).

---

## 2. Docker Compose Analysis (`docker-compose.yml`)

### 2.1 Network Port Exposures
- `db` service maps `"5432:5432"` directly to host interfaces.
  - *Risk:* In shared or cloud VM environments, PostgreSQL is directly exposed to external port scans.
- `redis` service maps `"6379:6379"` directly to host interfaces.
  - *Risk:* Redis with no password authentication is exposed to unauthenticated commands from external networks.
- **Remediation:** Bind ports to `127.0.0.1` (`"127.0.0.1:5432:5432"`, `"127.0.0.1:6379:6379"`) or keep databases on the internal Docker network only.

### 2.2 Environment & Secrets Handling
- `DATABASE_URL=postgresql://agentix:agentixpass@db:5432/agentix` contains default credentials in compose file.
- `ENVIRONMENT=production` is set in the backend service, but `JWT_SECRET_KEY` is not provided, triggering a fatal startup crash when `ENVIRONMENT!=development`.

---

## 3. Reverse Proxy & Routing Inspection (`nginx.conf` & `next.config.ts`)

- `next.config.ts` defines rewrites for `/api/v1/:path*` to `${BACKEND_URL}/api/v1/:path*`.
- `nginx.conf` sets appropriate client max body size (`100M`) and proxy buffering.
- Missing Security Headers in `nginx.conf` and `next.config.ts` (e.g. `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`). These are partially present in backend ASGI middleware, but should be unified across the frontend edge.
