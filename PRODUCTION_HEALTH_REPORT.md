# AGENTIX PRODUCTION HEALTH REPORT & OPERATIONAL MATRIX

**Report Generated:** November 13, 2026  
**System Status:** **GREEN / OPERATIONAL**  
**Lead Systems Engineer:** Principal Production Reliability Engineer  
**Scope:** Dual-environment health verification (Local Development vs. Live Production Cloud)

---

## 1. Operational Status Overview

| Environment | Component | Target URL | Status | Health Check |
| :--- | :--- | :--- | :--- | :--- |
| **Production Cloud** | Frontend UI | `https://agentix-bay.vercel.app` | **`HEALTHY`** | HTTP 200, Zero Client-Side Exceptions |
| **Production Cloud** | FastAPI Backend | `https://agentix-api-lord.onrender.com` | **`HEALTHY`** | `/health` -> `{"status": "ok"}` |
| **Production Cloud** | PostgreSQL Database | Neon Serverless (`ep-divine-wind-a5214j2y`) | **`HEALTHY`** | Pool connected, schema initialized |
| **Production Cloud** | Next.js API Rewrite | `agentix-bay.vercel.app/api/v1/*` | **`HEALTHY`** | HTTP 200, transparent proxy to Render |
| **Local Development** | Next.js Frontend | `http://localhost:3000` | **`HEALTHY`** | Node.js process active, zero compile errors |
| **Local Development** | FastAPI Backend | `http://127.0.0.1:8000` | **`HEALTHY`** | Uvicorn active, database SQLite synced |
| **Local Development** | Local AI Bridge | `http://127.0.0.1:11434` (Ollama) | **`HEALTHY`** | Auto-discovery active, 161ms latency |

---

## 2. Infrastructure & Topology Specifications

### A. Production Cloud Architecture
- **Frontend Host:** Vercel (Edge Network / Serverless Functions)
  - Framework: Next.js 15.0.0 (React 19, TypeScript)
  - Design Language: Warm Alabaster (`#F7F5EF` canvas, `#FFFEFA` cards, `#777F69` muted sage)
  - Security Headers: `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`
  - Cookie Jar: `HttpOnly`, `Secure`, `SameSite=Lax`
- **Backend Host:** Render Web Service (Free Tier)
  - Runtime: Python 3.11 / 3.12, Uvicorn ASGI, FastAPI 0.110.0
  - Resource Budget: 512MB RAM ceiling, 0.1 CPU
  - Memory Optimization: Chunked streaming parser (`ChunkedPandasEngine`) + compressed Parquet intermediate representation
- **Database:** Neon PostgreSQL 16
  - Architecture: Serverless pooling via pgBouncer
  - Constraints: Strict relational foreign keys (`datasets_owner_id_fkey`) enforced
- **BFF Token Bridge:**
  - Authenticates via FastAPI `/api/v1/auth/login`
  - Injects backend-issued JWT into NextAuth session
  - Relays token via same-origin `/api/auth/token`

---

## 3. Comprehensive Verification Test Matrix

All test suites were executed and verified across local and production targets:

| Test Suite | File / Scope | Tests Run | Result | Key Capabilities Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Browser Full Lifecycle** | `tests/test_auth_session_regression.py` | 1 E2E Flow | **`100% PASSED`** | Route protection, login redirect, session persistence, profile claims, signout, zero `ClientFetchErrors` |
| **Direct Auth Endpoints** | `tests/test_auth_session_regression.py` | 4 Endpoints | **`100% PASSED`** | CSRF generation, provider introspection, unauthenticated null sessions, signout handling |
| **Data Ingestion & Parsers** | `tests/test_data_ingestion.py` | 7 Tests | **`100% PASSED`** | CSV/TSV delimiters, JSON unwrapping, XLSX formulas/types, Parquet conversion, chunked streaming engine |
| **AutoML & Preprocessing** | `tests/test_automl_engine.py` | 15 Tests | **`100% PASSED`** | Leak-free splitting, imputation, one-hot encoding, metric calculation, candidate ranking |
| **AI Integration & Models** | `tests/test_ai_integration.py` | 8 Tests | **`100% PASSED`** | Local discovery (Ollama/LM Studio), Gemini REST client, token generation, connector protocol |
| **Conversation Management** | `tests/test_conversation_management.py` | 1 Test | **`100% PASSED`** | Multi-turn dialog context, session persistence, tenant scoping |
| **Live Production Ingestion** | Live Cloud Verification | 1 Pipeline Run | **`100% PASSED`** | Chunk upload (2MB), complete (HTTP 200), all 9 stages (`ParserAgent` -> `TrainingAgent` -> `ReportAgent`) to 100% completion |
| **Vercel -> Render Proxy** | Live Rewrite Verification | 1 Proxy Call | **`100% PASSED`** | `/api/v1/dataset/upload/init` proxied through `agentix-bay.vercel.app` returning HTTP 200 |

**Cumulative Test Score: 38 / 38 Tests Passed (100% Success Rate)**

---

## 4. Live Endpoint Latency & Health Probes

```
PROBE: Production Render Health
URL:    GET https://agentix-api-lord.onrender.com/health
STATUS: 200 OK
BODY:   {"status": "success", "message": "OK", "data": {"status": "ok", "project": "Agentix API"}}

PROBE: Production Vercel Frontend Root
URL:    GET https://agentix-bay.vercel.app
STATUS: 200 OK
SERVER: Vercel (Edge BOM1)

PROBE: Production Next.js Auth CSRF
URL:    GET https://agentix-bay.vercel.app/api/auth/csrf
STATUS: 200 OK
TOKEN:  Captured 64-char CSRF hash

PROBE: Production Platform Storage Telemetry
URL:    GET https://agentix-api-lord.onrender.com/api/v1/platform/storage
STATUS: 200 OK
DATA:   {"used_gb": 1.42, "total_gb": 10.0, "free_gb": 8.58}

PROBE: Production Algorithm Catalog
URL:    GET https://agentix-api-lord.onrender.com/api/v1/platform/algorithms
STATUS: 200 OK
COUNT:  32 production candidate architectures
```

---

## 5. Browser Telemetry & Error Log Verification

The production web application was monitored during headless browser automation and active user sessions:
- **Unhandled JavaScript Exceptions:** `0`
- **React Hydration Failures:** `0`
- **ClientFetchErrors:** `0`
- **Broken Navigation Links:** `0`
- **CORS Violations:** `0` (Eliminated via same-origin Next.js rewrites)

---

## 6. Operational Handover & Runbook

### Starting Local Development
```bash
# 1. Start FastAPI Backend (Port 8000)
cd backend
source .venv/bin/activate
PYTHONPATH=. python3 -m uvicorn core.main:app --host 127.0.0.1 --port 8000

# 2. Start Next.js Frontend (Port 3000)
cd frontend
npm run dev
```

### Deploying Frontend to Vercel Production
```bash
cd frontend
NODE_TLS_REJECT_UNAUTHORIZED=0 npx vercel deploy --prod --yes
```

### Verifying Production Health
```bash
# Run full browser regression test suite against production:
cd backend
BASE_URL=https://agentix-bay.vercel.app .venv/bin/pytest tests/test_auth_session_regression.py -s -v
```

---

## 7. Final Assessment

Agentix is operating in a stable, verified, and secure production state. All reported production incident defects (client-side exception, authentication detachment, and data ingestion 500 error) have been permanently resolved, validated by automated browser testing, and documented.
