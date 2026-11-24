# Agentix — DevOps & Deployment Architecture

**Document Version: 2.4.0**  
**Classification: Verified Operational Runbook**

---

## 1. Deployment Topology

Agentix supports two distinct operational environments:

1. **Air-Gapped Local / Bare-Metal Deployment:**  
   The entire stack (Next.js frontend, FastAPI backend, SQLite/PostgreSQL, local Parquet lake, and Ollama inference daemon) runs entirely on a single workstation or private on-premise institutional server with zero external internet access required.
2. **Hybrid Cloud Deployment (Vercel & Microservice Backend):**  
   The Next.js 15 frontend is deployed serverless on **Vercel's Edge Network** backed by a **Neon Serverless PostgreSQL** database for enterprise SaaS authentication, while backend data processing and model execution remain hosted on secure institutional infrastructure.

```mermaid
graph TD
    subgraph LocalDevelopment["Local Air-Gapped Workstation (Apple Silicon / Linux / Windows)"]
        LocalHost["Developer Machine (macOS Sonoma / Linux)"]
        LocalNext["Next.js 15 Frontend (http://localhost:3000)"]
        LocalFastAPI["FastAPI Backend (http://127.0.0.1:8000)"]
        LocalOllama["Ollama Local AI Daemon (http://127.0.0.1:11434)"]
        LocalData["Local File Lake (/backend/data/temp/*.parquet)"]
        LocalDB["SQLite / Local PostgreSQL Database"]

        LocalHost --> LocalNext
        LocalHost --> LocalFastAPI
        LocalHost --> LocalOllama
        LocalFastAPI --> LocalData
        LocalFastAPI --> LocalDB
        LocalFastAPI --> LocalOllama
        LocalNext --> LocalFastAPI
    end

    subgraph GitHubRepo["Source Control (GitHub)"]
        GHMain["github.com/thrilokmanjunath/Agentix (Branch: main)"]
        GHProdBranch["Branch: product-transformation"]
        GHSecBranch["Branch: security-audit-remediation"]
        GHMain --- GHProdBranch
        GHMain --- GHSecBranch
    end

    subgraph ProductionCloud["Production Edge Cloud (Vercel Platform)"]
        VercelCDN["Vercel Global Edge Network (Anycast CDN)"]
        VercelFrontend["Next.js Serverless SSR & Static Assets"]
        VercelEdge["Edge Middleware & Route Handlers"]
        ProdPostgres["Neon Managed PostgreSQL (Postgres Connection Pooling)"]
        ProdAPI["Containerized FastAPI Microservice / VM Cluster"]

        VercelCDN --> VercelFrontend
        VercelFrontend --> VercelEdge
        VercelFrontend --> ProdPostgres
        VercelFrontend --> ProdAPI
    end

    LocalHost -.->|Git Push (Manual Review Only)| GHMain
    GHMain -.->|Automated Deploy Trigger| VercelFrontend
```

---

## 2. Local Air-Gapped Startup Procedures

All startup orchestration is codified in [scripts/dev.sh](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/scripts/dev.sh):

```bash
# 1. Ensure Python Virtual Environment & Dependencies
cd backend
source .venv/bin/activate
pip install -r requirements.txt

# 2. Ensure Node.js Frontend Dependencies
cd ../frontend
npm install

# 3. Launch the Unified Development Environment
cd ..
./scripts/dev.sh
```

### What `scripts/dev.sh` Executes Internally:
1. Verifies that port `8000` (FastAPI) and port `3000` (Next.js) are available.
2. Checks connectivity to the local Ollama daemon on port `11434` (falls back gracefully to synthetic testing mode if Ollama is offline).
3. Spawns Uvicorn daemon running `backend/core/main.py:app` with `--host 127.0.0.1 --port 8000`.
4. Spawns Next.js development server with `npm run dev` on port `3000`.
5. Writes runtime PIDs to `.agentix.pid` for clean teardown via `./scripts/stop.sh`.

---

## 3. Environment Variables Specification

### Frontend Environment (`frontend/.env.local` / `frontend/.env`)
```bash
# Public API URL pointing to the FastAPI backend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Auth.js / NextAuth v5 Secret (Required for JWT signature encryption)
AUTH_SECRET=agentix-institutional-development-secret-2026

# Trust Local Host header for development redirects
AUTH_TRUST_HOST=true

# Allow pre-configured demo credentials without database lookup
ENABLE_DEMO_LOGIN=true

# Gated Prisma Adapter (Set to true only when PostgreSQL is running)
USE_DATABASE_ADAPTER=false

# PostgreSQL Database Connection String (Neon Postgres in production)
DATABASE_URL=postgresql://user:password@ep-host.neon.tech/agentix?sslmode=require
```

### Backend Environment (`backend/.env`)
```bash
# Operational Environment: "development" | "staging" | "production"
# (Fails-closed in staging/production if JWT_SECRET_KEY is absent)
ENVIRONMENT=development

# JWT Secret Key for HMAC SHA-256 tokens (Minimum 32 bytes in production)
JWT_SECRET_KEY=super-secret-agentix-key-2026-production-salt-entropy

# Local Ollama AI Daemon Base URL
OLLAMA_BASE_URL=http://127.0.0.1:11434

# Primary High-Reasoning Analytical Model
DEFAULT_LLM_MODEL=researcher-m4:latest

# Secondary Fast Summary Model
FALLBACK_LLM_MODEL=qwen2.5:3b

# Local Tabular Storage Path
TEMP_STORAGE_DIR=/backend/data/temp
```

---

## 4. Health Probes & Monitoring

The backend exposes native Kubernetes liveness and readiness probes:

- **Liveness Probe:** `http://127.0.0.1:8000/api/v1/system/liveness`  
  *Expectation:* HTTP 200 within 500ms.
- **Readiness Probe:** `http://127.0.0.1:8000/api/v1/system/readiness`  
  *Expectation:* HTTP 200 confirming disk read/write capability.
- **System Telemetry:** `http://127.0.0.1:8000/api/v1/system/system`  
  *Output:* CPU utilization %, memory consumption %, active thread count, and uptime.
