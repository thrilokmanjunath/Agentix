# Agentix Signature — Local Deployment & Production Startup Report

**Audit Identifier:** `AUDIT-DEPLOYMENT-LOCAL-2026-V1`  
**Execution Environment:** macOS Darwin (arm64, Apple Silicon) &bull; 16 GB Unified Memory  
**Target Runtimes:** Python 3.12 (backend/.venv) &bull; Node.js v26.0.0 / npm 11.12.1  
**Date:** November 2026  
**Status:** Verified Operational & Reproducible  

---

## 1. Executive Overview

Stage 4 of the Product Transformation established an autonomous, one-command local deployment system that bridges the hardened FastAPI backend, the Next.js 15 enterprise frontend, and local air-gapped LLM inference engines (Ollama / LM Studio).

The operational infrastructure is encapsulated in two production-grade scripts:
1. `scripts/dev.sh`: Performs environment detection, venv activation, dependency verification, database initialization, local LLM socket probes, port conflict clearing, background service orchestration, health check polling, and outputs an executive dashboard console.
2. `scripts/stop.sh`: Safely terminates backend and frontend processes, clears PID runtime locks, and releases network ports.

---

## 2. Infrastructure Architecture & Service Topology

```
                                 [ Host Machine ]
                     (macOS Darwin arm64 / 16 GB Unified Memory)
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
      [ scripts/dev.sh Orchestrator ]                [ scripts/stop.sh ]
                 │                                             │
      ┌──────────┼─────────────────────────┐                   │
      ▼          ▼                         ▼                   ▼
┌──────────┐ ┌──────────────────────┐ ┌──────────────┐   [ Graceful Shutdown ]
│ Frontend │ │   FastAPI Backend    │ │ Local Ollama │   - SIGTERM (kill -15)
│ Next.js  │ │   Uvicorn (Core)     │ │ HTTP Socket  │   - SIGKILL fallback
│ Port 3000│ │   Port 8000          │ │ Port 11434   │   - PID file cleanup
└─────┬────┘ └──────────┬───────────┘ └──────┬───────┘   - Port 8000/3000 free
      │                 │                    │
      │ REST API        │ In-Memory/SQLite   │ HTTP REST
      │ /api/v1/*       │ dev.db             │ /api/chat, /api/tags
      ▼                 ▼                    ▼
[ Luxury UI ]    [ Data Pipeline & ]   [ Air-Gapped Models ]
[ Console   ]    [ ML AutoML Engine]   [ Qwen2.5-3B, Researcher-M4 ]
```

---

## 3. Automated Pre-Flight Checks & Environment Discovery

Every invocation of `./scripts/dev.sh` executes the following pre-flight sequence before launching services:

1. **Host Hardware & OS Detection:**
   - Detects kernel and architecture via `uname -s` and `uname -m`.
   - Computes total RAM dynamically (`sysctl -n hw.memsize` on Darwin or `/proc/meminfo` on Linux).
2. **Runtime Verification:**
   - Confirms `python3 >= 3.10` and `node >= 18`.
3. **Environment Isolation:**
   - Detects `backend/.venv`; activates virtual environment or provisions clean venv from `requirements.txt`.
   - Verifies `backend/.env` and `frontend/.env.local` existence; auto-generates secure development defaults if missing.
4. **Dependency Integrity:**
   - Ensures `frontend/node_modules` exists; triggers automated `npm install --legacy-peer-deps` if absent.
5. **Database Schema Migrations:**
   - Invokes `core.repositories.database.init_db()` to ensure all SQLAlchemy tables (`users`, `datasets`, `models`, `runs`, `activity_logs`) are initialized.
6. **Local LLM Inference Discovery:**
   - Issues a low-latency socket probe to `http://127.0.0.1:11434/api/tags` (Ollama) and `http://127.0.0.1:1234/v1/models` (LM Studio).
   - Dynamically parses installed model weights and reports active model tags (`qwen2.5:3b`, `researcher-m4:latest`).
7. **Port Conflict Resolution:**
   - Scans ports `8000` and `3000` for stale or orphaned listeners, terminating them cleanly before binding new sockets.

---

## 4. Live Health Check Verification Evidence

### 4.1 Backend Core Health (`GET /health`)
```bash
curl -s http://127.0.0.1:8000/health
```
```json
{
  "status": "success",
  "message": "OK",
  "data": {
    "status": "ok",
    "project": "Agentix API"
  },
  "errors": null
}
```

### 4.2 Multi-Provider AI Telemetry (`GET /api/v1/platform/ai/status`)
```bash
curl -s http://127.0.0.1:8000/api/v1/platform/ai/status
```
```json
{
  "status": "success",
  "message": "OK",
  "data": {
    "active_provider": "ollama",
    "inference_mode": "local",
    "allow_cloud_fallback": false,
    "has_local_llm": true,
    "local_models": [
      {
        "name": "researcher-m4:latest",
        "id": "95f1e87beb82",
        "size": "1.8 GB",
        "parameter_size": "3.1B",
        "quantization": "Q4_K_M",
        "family": "qwen2",
        "provider": "ollama",
        "is_local": true
      },
      {
        "name": "qwen2.5:3b",
        "id": "357c53fb659c",
        "size": "1.8 GB",
        "parameter_size": "3.1B",
        "quantization": "Q4_K_M",
        "family": "qwen2",
        "provider": "ollama",
        "is_local": true
      }
    ],
    "memory_guidance": {
      "total_ram_gb": 16.0,
      "available_ram_gb": 5.25,
      "recommended_parameters": "<= 3B parameters (e.g. Qwen2.5-3B, Phi-3 Mini)",
      "advisory": "Memory is constrained. Run quantized 3B models to avoid swapping."
    },
    "ollama_connection": {
      "status": "connected",
      "latency_ms": 5,
      "models": ["researcher-m4:latest", "qwen2.5:3b"],
      "provider": "ollama"
    }
  },
  "errors": null
}
```

### 4.3 Frontend Enterprise Portal (`GET /login`)
```bash
curl -s -I http://127.0.0.1:3000/login
```
```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Set-Cookie: authjs.csrf-token=...; Path=/; HttpOnly; SameSite=Lax
Set-Cookie: authjs.callback-url=...; Path=/; HttpOnly; SameSite=Lax
```

---

## 5. Console Dashboard Summary Output

Upon successful initialization, `./scripts/dev.sh` outputs the unified operational console:

```
========================================================================
               AGENTIX SIGNATURE • OPERATIONAL CONSOLE
========================================================================
 Executive Dashboard:     http://localhost:3000/dashboard
 Autonomous Agent Console:http://localhost:3000/agent-console
 Data Dock (Ingestion):   http://localhost:3000/data-dock
 XAI & Neural Diagnostics:http://localhost:3000/insights
 Executive Reports:       http://localhost:3000/intelligence-reports
 Institutional Settings:  http://localhost:3000/settings
 ----------------------------------------------------------------------
 FastAPI Backend Docs:    http://127.0.0.1:8000/docs
 Backend Health API:      http://127.0.0.1:8000/health
 AI Inference Provider:   Ollama (Online (http://127.0.0.1:11434))
 ----------------------------------------------------------------------
 Backend Logs:  tail -f logs/backend.log
 Frontend Logs: tail -f logs/frontend.log
 Shutdown:      ./scripts/stop.sh
========================================================================
```

---

## 6. Shutdown Verification (`scripts/stop.sh`)

Executing `./scripts/stop.sh` cleanly terminates all running services and releases sockets:
```
Shutting down Agentix Signature services...
[AGENTIX] Stopping Backend Core (PID: 67434)...
[SUCCESS] Backend Core stopped.
[AGENTIX] Cleared orphaned listeners on port 3000.
[SUCCESS] All Agentix services have been cleanly terminated.
```
Verified via `lsof -i :8000` and `lsof -i :3000` returning null (no listening sockets).
