# Agentix System Architecture & Trust Boundary Review

**Document Status:** Complete & Audited  
**Audit Date:** November 2026  
**Auditor:** Principal Application Security Engineer & DevSecOps Lead  
**Scope:** Agentix Repository Baseline (`agentix-recovery-backup-2026`)

---

## 1. Executive Architecture Overview

Agentix is designed as an autonomous, multi-tenant AI-powered Operating System for Data Science and Machine Learning. The application provides an end-to-end analytical pipeline: data ingestion (CSV, JSON, XLSX), automated exploratory data analysis (EDA), automated data cleaning and imputation, feature engineering, AutoML model training (linear SGD classifiers/regressors), explainable AI (XAI) feature importance extraction, automated analytical report generation, and an interactive LLM-powered data analyst chat assistant.

The platform employs a decoupled, polyglot microservice/monorepo architecture consisting of:
1. **Frontend Presentation & Collaboration Layer:** Next.js 15.5.19 (React 19, TypeScript), Prisma 6.2 ORM, NextAuth.js v5 beta, Zustand state management, and Tailwind CSS.
2. **Backend Brain & Cognitive API Gateway:** FastAPI 0.162.0 (Python 3.12/3.15), SQLAlchemy 2.1 ORM, Pydantic v2 data schemas, Scikit-learn, Pandas, DuckDB, Polars, and OpenTelemetry instrumentation.
3. **Execution Engine & Cognitive Orchestrator:** An in-process 9-stage asynchronous pipeline orchestrator (`UploadAgent`, `ParserAgent`, `ProfilingAgent`, `CleaningAgent`, `EDAAgent`, `FeatureEngineeringAgent`, `TrainingAgent`, `EvaluationAgent`, `ReportAgent`).
4. **AI/ML Inference Architecture:** Hybrid deterministic execution combined with local Ollama inference (`http://localhost:11434`) and cloud Google Gemini API fallback.
5. **Data Persistence Tier:** Dual-database topology:
   - Frontend Prisma schema backed by PostgreSQL (in production) or local SQLite (`dev.db`).
   - Backend SQLAlchemy schema backed by PostgreSQL 15 (in containerized deployments) or local SQLite (`agentix.db`).
   - Ephemeral file storage in `data/temp` for chunked dataset uploads and Parquet conversions.

---

## 2. Component Architecture Breakdown

### 2.1 Frontend Architecture (Next.js 15 App Router)
- **Framework:** Next.js 15.5.19 running React 19.1.0 in SSR and Client-Component mode.
- **Routing Structure:**
  - `src/app/(app)/`: Authenticated tenant application views (Dashboard, Agent Console, Data Dock, History, Insights, Intelligence Reports, Knowledge Graph, Profile, Settings).
  - `src/app/admin/`: Administrative control panels (Brain Console, Database Manager, LLM Manager, Memory Inspector, Model Manager, Monitoring, Workflow Manager).
  - `src/app/api/`: Next.js Route Handlers handling internal operations and proxying:
    - `/api/auth/[...nextauth]`: NextAuth authentication endpoints.
    - `/api/admin`: Administrative role update and user deletion endpoints.
    - `/api/datasets`: Dataset metadata registry.
    - `/api/workspaces`: Multi-tenant organization and workspace member management.
    - `/api/dashboard`: Aggregated dashboard metrics proxying backend.
    - `/api/sessions`: Active user session management.
    - `/api/benchmark-stats`: Benchmark aggregation.
    - `/api/users/profile` & `/api/users/settings`: User preference endpoints.
    - `/api/notifications` & `/api/activity-logs`: Activity auditing and notifications.
- **Client State & API Client:**
  - Zustand (`platformStore.ts`, `useStore.ts`) manages active dataset selections, workflow polling, and chat state.
  - Axios client makes direct requests to backend API (`NEXT_PUBLIC_API_URL`) or proxies via Next.js rewrites (`/api/v1/:path*` -> `${BACKEND_URL}/api/v1/:path*`).

### 2.2 Backend Architecture (FastAPI Cognitive Core)
- **Framework:** FastAPI with Uvicorn ASGI server.
- **Entry Points:** `core/main.py` (re-export for Uvicorn) and `core/api/main.py` (FastAPI app definition).
- **Middleware Pipeline:**
  1. `EnterpriseProfilerMiddleware`: Measures execution time per request (threshold: 500ms).
  2. `GZipMiddleware`: Compresses responses above 1000 bytes.
  3. `SecurityMiddleware`: Pure ASGI middleware enforcing a 100MB payload limit and HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Strict-Transport-Security`, `Content-Security-Policy: default-src 'self'`).
  4. `CORSMiddleware`: Restricts origins based on `ALLOWED_ORIGINS` environment variable.
- **API Routing Structure (`/api/v1`):**
  - `/dataset` (`routes_data.py`): Chunked file upload initialization, chunk upload, assembly, and pipeline dispatch.
  - `/platform` (`routes_platform.py`): Analytical endpoints (`/profile`, `/eda`, `/automl`, `/predict`, `/xai`, `/insights`, `/recommendations`, `/reports`, `/chat`, `/workflow-status`, `/dashboard-metrics`, `/benchmark-stats`, `/recent-activity`, `/experiment-runs`, `/storage`).
  - `/jobs` (`routes_jobs.py`): Job progress polling and completed artifact inspection (`/jobs/{job_id}`).
  - `/auth` (`routes_auth.py`): JWT user registration (`/register`), login (`/login`), profile (`/me`), and OAuth stubs.
  - `/admin/system` (`routes_system.py`): System telemetry (`/system`), K8s health checks (`/health`, `/liveness`, `/readiness`).

### 2.3 Cognitive Pipeline & Agent Execution
- **Pipeline Stages:**
  1. `UploadAgent`: Validates file presence on disk.
  2. `ParserAgent`: Converts raw tabular files (CSV, XLSX, JSON) into Parquet format via Pandas/PyArrow and identifies candidate target columns.
  3. `ProfilingAgent`: Extracts row counts, column counts, null counts, duplicate counts, and data types.
  4. `CleaningAgent`: Analyzes column skewness; applies median imputation for skewed numerical data, mean for normal distributions, and mode for categorical columns.
  5. `EDAAgent`: Generates correlation matrices, histograms, boxplots, and statistical moments.
  6. `FeatureEngineeringAgent`: Performs one-hot encoding on categorical variables and standard scaling on numerical features.
  7. `TrainingAgent`: Instantiates Scikit-learn incremental estimators (`SGDClassifier` for classification, `SGDRegressor` for regression), executes train/test split (80/20), trains models, and extracts feature weights.
  8. `EvaluationAgent`: Computes held-out accuracy and F1-score (classification) or MAE, RMSE, and R² (regression).
  9. `ReportAgent`: Synthesizes pipeline findings into structured metadata.
- **Orchestrator (`core/orchestrator.py`):**
  - Manages `WorkflowRun` and `PipelineStage` state in the database.
  - Dynamically routes between standard in-memory engines (`Pandas`) and chunked/disk-backed engines (`DuckDB`, `Polars`, `Dask`) based on dataset size detected by `HardwareDetector`.
  - Dispatches background pipeline execution via FastAPI `BackgroundTasks`.

---

## 3. Data Storage & Entity Schemas

### 3.1 Backend Relational Schema (SQLAlchemy)
- **`users`:** `id` (UUID), `email` (unique index), `hashed_password`, `role` (admin/user/guest), `is_active`, `created_at`.
- **`user_settings`:** `id`, `user_id` (FK `users.id`), `llm_provider`, `openai_api_key`, `theme`.
- **`datasets`:** `id`, `name`, `owner_id` (FK `users.id`), `filepath`, `parquet_path`, `rows`, `columns`, `size_bytes`, `target_column`, `problem_type`, `y_test_json`, `y_pred_json`, `created_at`.
- **`workflow_runs`:** `id`, `owner_id` (FK `users.id`), `dataset_id` (FK `datasets.id`), `status` (started/running/completed/failed), `execution_time`, `logs`, `created_at`.
- **`pipeline_stages`:** `id`, `run_id` (FK `workflow_runs.id`), `agent_name`, `step_order`, `status` (pending/running/completed/failed), `execution_time`, `memory_usage_mb`, `output_data` (JSON), `errors`, `warnings`, `recommendations`, `created_at`, `updated_at`.

### 3.2 Frontend Relational Schema (Prisma)
- NextAuth models: `User`, `Account`, `Session`, `VerificationToken`.
- Multi-tenancy & Workspace models: `Workspace`, `WorkspaceMember` (`ADMIN`, `EDITOR`, `VIEWER`).
- Dataset & Experiment tracking: `Dataset`, `DatasetVersion`, `SavedModel`, `ModelVersion`, `ExperimentRun`, `WorkflowHistory`, `Report`, `ChatHistory`, `ActivityLog`, `Notification`.

---

## 4. Multi-Tenant Boundaries & Institutional Isolation

The repository is intended to support multiple institutions, enterprise research teams, and external users. Tenant isolation must be strictly maintained across:
1. **Logical Data Boundaries:** Queries for datasets, runs, pipeline metrics, and reports must be strictly scoped to the requesting tenant's identity (`owner_id` / `workspace_id`).
2. **Physical Storage Boundaries:** Uploaded files, chunk fragments, and parquet artifacts stored in `data/temp` must be partitioned by tenant UUIDs (via `TenantManager.setup_tenant_workspace`).
3. **In-Memory Cache Boundaries:** The backend `DataService` in-memory state dictionary must never key datasets by raw filename alone. It must be scoped by tenant ID (`f"{user_id}:{dataset_name}"`).
4. **Model & Inference Boundaries:** Trained SGD model artifacts, evaluation parameters, and feature importance matrices must be isolated per tenant.
5. **Organizational Collaboration Boundaries:** Workspace members must have strictly verified role-based access control (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`) prior to modifying memberships or viewing institutional assets.

---

## 5. Critical Trust Boundaries

```
[ External User / Attacker ]
            │
            ▼ (HTTP / TLS Boundary)
┌────────────────────────────────────────────────────────┐
│               Next.js Edge / Server                    │
│  - Middleware Authentication Guard (`src/middleware.ts`)│
│  - Session Validation (`auth.ts` / NextAuth)           │
│  - Internal Route Handlers (`src/app/api/*`)          │
└───────────┬────────────────────────────────┬───────────┘
            │ Next.js Rewrites / Axios       │ Prisma ORM
            ▼                                ▼
┌──────────────────────────────┐ ┌──────────────────────┐
│       FastAPI Gateway        │ │  Frontend PostgreSQL │
│  - CORS / Security Headers   │ │  (Workspaces, Users, │
│  - JWT Bearer Authentication │ │   Sessions, Datasets)│
│  - Rate Limiting Middleware  │ └──────────────────────┘
└───────────┬──────────────────┘
            │
    ┌───────┴────────────────────────┐
    ▼                                ▼
┌──────────────────────────────┐ ┌──────────────────────┐
│      Cognitive Services      │ │   Backend Database   │
│  - Pipeline Orchestrator     │ │   (Users, Runs,      │
│  - Data Cleaning & Impute    │ │    Stages, Datasets) │
│  - Scikit-learn AutoML       │ └──────────────────────┘
│  - Local Ollama / Gemini LLM │
└───────────┬──────────────────┘
            ▼
┌──────────────────────────────┐
│    Local Physical Storage    │
│  - `data/temp/{tenant_id}/*` │
│  - `.parquet` Artifacts      │
└──────────────────────────────┘
```

### Identified Trust Boundaries:
1. **TB-1: Client-to-Backend Direct Interface:** Web clients communicate with both the Next.js API layer and FastAPI backend directly. Authentication tokens must be validated with high cryptographic integrity on both sides.
2. **TB-2: Next.js API Routes to Database:** Next.js server routes interact with the frontend database using Prisma. All queries must enforce session verification and tenant workspace ownership.
3. **TB-3: Multi-Tenant Data Isolation Boundary:** In-flight memory (`DataService`), database queries (`_latest_dataset_and_run`), and disk files (`data/temp`) represent high-risk tenant crossover points.
4. **TB-4: LLM Prompt & Inference Boundary:** User-supplied queries and uploaded tabular cell values enter prompt templates executed by Ollama or Gemini. Untrusted data must not override system directives.
5. **TB-5: File Ingestion & File System Boundary:** File uploads must be checked for directory traversal, executable magic bytes, payload inflation, and malformed CSV syntax before reaching data engines.
