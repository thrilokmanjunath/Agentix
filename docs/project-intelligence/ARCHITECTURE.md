# Agentix — Architecture Documentation

**Document Version: 2.4.0**  
**Classification: Evidence-Based Architectural Specification**

---

## 1. System Architecture Overview

Agentix utilizes a decoupled, high-performance architecture composed of a **Next.js 15 App Router Frontend**, a **FastAPI Asynchronous Backend Engine**, a **Columnar Parquet Storage Lake**, an **Enterprise 8-Layer AI Governance Enclave**, and an **Air-Gapped Local Inference Daemon**.

```mermaid
graph TD
    subgraph ClientLayer["Client & User Access Layer"]
        User["Institutional User / Analyst"]
        Browser["Modern Web Browser (Chrome, Safari, Firefox)"]
        User --> Browser
    end

    subgraph PresentationLayer["Presentation Layer (Next.js 15 App Router)"]
        WebPortal["Agentix Web Portal (Vercel / Local Node.js)"]
        AuthJS["NextAuth.js v5 (JWT Sessions & Google SSO)"]
        StateStore["Zustand State Store (Platform & AI State)"]
        UIPages["Modular Enterprise UI Pages (Teal Glass System)"]
        WebPortal --> AuthJS
        WebPortal --> StateStore
        WebPortal --> UIPages
    end

    subgraph SecurityIngress["Layer 1: Security & API Ingress"]
        CORSMW["CORS & Origin Validation Middleware"]
        TokenBucket["Tenant Token-Bucket Rate Limiter (1000 req/min)"]
        SecHeaders["Security Headers (CSP, HSTS, X-Frame-Options)"]
        CORSMW --> TokenBucket --> SecHeaders
    end

    subgraph BackendAPI["Backend Core Services (FastAPI ASGI)"]
        APIRouter["FastAPI 0.115 API Router (/api/v1)"]
        AuthService["Auth & RBAC Service (BCrypt + JWT + RFC 7662)"]
        DataService["DataService (Parquet Ingestion & State Hydration)"]
        Orchestrator["9-Stage Reversible Analytical Pipeline"]
        LLMService["LLM & Hardware Service (Ollama / Cloud Fallback)"]
        MCPRegistry["Governed Model Context Protocol Registry"]
        APIRouter --> AuthService
        APIRouter --> DataService
        APIRouter --> Orchestrator
        APIRouter --> LLMService
        APIRouter --> MCPRegistry
    end

    subgraph SecurityDefense["Enterprise 8-Layer AI Governance"]
        L1["L1: API Governance & Quotas"]
        L2["L2: Prompt Template Registry & Delimiter Isolation"]
        L3["L3: Tenant-Partitioned Vector RAG"]
        L4["L4: Governed MCP Tool Calling (Risk Tiers)"]
        L5["L5: Granular RBAC & Token Introspection"]
        L6["L6: Dual-Stage Guardrails (Jailbreak & PII Redaction)"]
        L7["L7: Exact-Match Cache & Complexity Router"]
        L8["L8: GenAI Observability & Faithfulness Evals"]
    end

    subgraph DataStorage["Persistence & Analytical Storage Layer"]
        Postgres["PostgreSQL / SQLite Database (Prisma & SQLAlchemy)"]
        ParquetLake["Parquet File Lake (/backend/data/temp/)"]
        VectorStore["In-Memory Partitioned Vector Store (128-dim cosine)"]
        InferenceCache["Thread-Safe Exact-Match Cache (SHA-256)"]
    end

    subgraph LocalInference["Local Hardware Inference Engine"]
        OllamaServer["Ollama Daemon (http://127.0.0.1:11434)"]
        M4Model["researcher-m4:latest (High-Reasoning Analytical)"]
        QwenModel["qwen2.5:3b (Fast Ingestion & Query Summaries)"]
        OllamaServer --> M4Model
        OllamaServer --> QwenModel
    end

    Browser -->|HTTPS / WSS| WebPortal
    WebPortal -->|REST / JSON-RPC| SecurityIngress
    SecurityIngress --> APIRouter
    BackendAPI <--> SecurityDefense
    DataService <--> ParquetLake
    AuthService <--> Postgres
    LLMService <--> InferenceCache
    LLMService <--> OllamaServer
    LLMService <--> VectorStore
```

---

## 2. Frontend Subsystem Architecture

The frontend is structured under Next.js 15's App Router paradigm:

- **Root Layout ([app/layout.tsx](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/frontend/src/app/layout.tsx)):** Provides top-level HTML tags, sets up font variables, binds `SessionProvider` for Auth.js, and injects global CSS variables for theme management.
- **Application Shell ([app/(app)/layout.tsx](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/frontend/src/app/(app)/layout.tsx)):** Enforces authentication gates, renders the collapsible left navigation sidebar, top navigation bar with active dataset pill, and real-time backend health monitor (`SystemHealth.tsx`).
- **Master Conversational AI Workspace ([app/(app)/agent-console/page.tsx](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/frontend/src/app/(app)/agent-console/page.tsx)):**
  - **Thread Navigation Sidebar:** Date-grouped session history (*Today*, *Yesterday*, *Previous 7 Days*), session search filter, `⌘N` new thread shortcut.
  - **Message Stream:** Distinct user/assistant styling, formatted markdown (`react-markdown`), responsive tables, syntax-highlighted code blocks with copy button, and per-message execution telemetry badges.
  - **Anchored Composer:** Floating, multi-line auto-resizing input (`Enter` to submit, `Shift+Enter` for newline), paperclip attachment modal, Deep Reasoning toggle pill, and local hardware model switcher.

---

## 3. Backend Subsystem Architecture

The backend application is encapsulated in `backend/core/`:

- **Application Ingress ([main.py](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend/core/main.py)):** Initializes FastAPI with metadata, mounts pure ASGI `SecurityMiddleware` and `ProfilingMiddleware`, registers routers, and initializes database tables.
- **API Router Layer ([api/v1/](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend/core/api/v1/)):**
  - `routes_system.py`: Liveness, readiness, and telemetry probes.
  - `routes_auth.py`: User registration, login, token refresh, and RFC 7662 introspection.
  - `routes_data.py`: Multi-chunk dataset upload and validation.
  - `routes_jobs.py`: Asynchronous job status tracking with IDOR protection.
  - `routes_platform.py`: Core analytical services (profile, clean, fe, eda, automl, xai, chat, mcp).

---

## 4. End-to-End Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as Analyst Browser
    participant Ingress as Security Middleware (L1)
    participant Auth as RBAC & Auth Guard (L5)
    participant Router as FastRouter / Platform API
    participant Cache as SHA-256 Exact Cache (L7)
    participant Guard as Guardrails & PII Sanitizer (L6)
    participant RAG as Vector Index & Prompt Enclave (L2 & L3)
    participant Model as Local LLM Inference (researcher-m4)
    participant Eval as Faithfulness Evaluator (L8)

    Client->>Ingress: POST /api/v1/platform/chat { query, dataset_name }
    Ingress->>Ingress: Check Rate Limiter (Token Bucket: 1000 req/min)
    Ingress->>Ingress: Validate Security Headers & Content-Type

    Ingress->>Auth: Verify JWT Bearer Token & Extract Permissions
    Auth->>Auth: Validate Role has DATASET_READ permission
    Auth->>Router: Forward Validated Request

    Router->>Guard: Scan Ingress Prompt for Adversarial Jailbreaks & PII
    Guard->>Guard: Replace PII with [REDACTED_TYPE], Neutralize Jailbreaks
    Guard-->>Router: Sanitized Prompt

    Router->>Cache: Query Exact-Match Cache (SHA-256 Key)
    alt Cache Hit (<5ms)
        Cache-->>Router: Return Cached Response (Zero Compute)
    else Cache Miss
        Router->>RAG: Retrieve Top-K Context Passages (Tenant-Partitioned)
        RAG->>RAG: Inject into Versioned Delimited Template (<dataset_context>)
        Router->>Model: Execute Streamed Local Inference (researcher-m4:latest)
        Model-->>Router: Raw Generated Analytical Response
        Router->>Guard: Scan Output for Accidental Prompt / Credential Leaks
        Router->>Eval: Evaluate Groundedness & Faithfulness Score
        Eval-->>Router: Faithfulness: 0.948, Relevancy: 0.920
        Router->>Cache: Store Response in Exact-Match Cache with TTL
    end

    Router-->>Client: Final Response + Telemetry (Model, Latency ms, Tokens, Faithfulness)
```
