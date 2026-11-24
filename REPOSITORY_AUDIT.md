# REPOSITORY AUDIT: AGENTIX PLATFORM TO NATIVE DESKTOP ECOSYSTEM
**Date:** November 2026  
**Document Version:** 1.0.0  
**Target Environment:** macOS (ARM64, x64) & Windows (x64) Native Desktop

---

## 1. Executive Summary & Inventory

Agentix is an AI-powered agentic data intelligence platform featuring an asynchronous multi-agent Python backend (FastAPI 0.115), a high-performance analytics layer (Polars, Apache Arrow, scikit-learn, XGBoost, LightGBM, SHAP), and an enterprise React 19 / Next.js 15 presentation layer styled with the Warm Alabaster accessible design system.

The purpose of this audit is to systematically evaluate the repository before engineering the **Tauri v2 native desktop application** and packaging the **Python backend as an autonomous sidecar binary**.

### Repository Top-Level Structure

```
agentix/
├── backend/                  # FastAPI 0.115 ASGI backend, ML engines, multi-agent pipeline
│   ├── core/                 # Core domain logic, agents, AutoML, security, database
│   │   ├── agents/           # 9 specialized pipeline agents (A1: Upload -> A9: Report)
│   │   ├── api/              # FastAPI routers, v1 endpoints, OpenAPI definitions
│   │   ├── auth/             # Password hashing (bcrypt), JWT creation & verification
│   │   ├── automl/           # 32 ML algorithms, LeakFreePreprocessor, 3-Tier XAI
│   │   ├── engines/          # ChunkedPandasEngine, FormatDetector, Polars acceleration
│   │   ├── guardrails/       # Layer 6 GuardrailEngine (PII scrubbing, prompt injection)
│   │   ├── hardware/         # Apple Silicon Metal, NVIDIA CUDA, CPU discovery
│   │   ├── middleware/       # Token bucket rate-limiter, profiling, security headers
│   │   ├── models/           # SQLAlchemy database models (User, Dataset, WorkflowRun)
│   │   ├── repositories/     # SQLite / PostgreSQL database connection & lifecycle
│   │   ├── routes_*.py       # Dataset, Jobs, Platform, Auth, System routes
│   │   └── telemetry.py      # OpenTelemetry & Prometheus instrumentation
│   ├── requirements.txt      # Python dependencies
│   └── tests/                # Comprehensive pytest suite
├── frontend/                 # Next.js 15.5.19 / React 19 single-page enterprise webapp
│   ├── src/
│   │   ├── app/              # App router (Landing, Dashboard, Data Dock, Insights, Admin)
│   │   ├── components/       # UI components, data tables, Plotly/Recharts visualizations
│   │   ├── lib/              # Client token interceptors, backend client, Prisma client
│   │   ├── store/            # Zustand reactive state store (platformStore.ts)
│   │   ├── auth.ts           # Auth.js v5 credentials provider & session handler
│   │   ├── auth.config.ts    # Authentication callbacks & backend token bridge
│   │   └── middleware.ts     # Edge/Node.js route protection middleware
│   ├── prisma/schema.prisma  # PostgreSQL Prisma schema (for cloud session persistence)
│   └── package.json          # Node.js dependencies
├── connector/                # Standalone companion script
│   └── agentix_connector.py  # Local loopback (11435) & outbound WebSocket bridge to cloud
├── scripts/                  # Development & benchmark orchestration scripts
│   ├── dev.sh                # Local startup runner (backend + frontend)
│   ├── stop.sh               # Local shutdown script
│   └── generate_*.py         # Showcase & benchmark dataset generators
├── test_data/                # Multi-format benchmark datasets (CSV, XLSX, JSON, Parquet)
├── examples/                 # Mirrored datasets and documentation examples
└── docs/                     # Architecture, API specifications, and project dossiers
```

---

## 2. Component-by-Component Technical Audit

### A. Backend Architecture (`backend/`)
1. **Framework & Runtime:** Python 3.11/3.12/3.13 on FastAPI 0.115 running atop Uvicorn ASGI.
2. **Database & Persistence:**
   - **Local Runtime:** Default fallback to `sqlite:///./agentix.db` with WAL mode enabled (`PRAGMA journal_mode=WAL`), queue pool sizing adjusted for concurrency, and auto-migration of missing columns (`_migrate_add_missing_columns()`).
   - **Cloud Runtime:** PostgreSQL connection via `postgresql+psycopg2://` (Neon serverless PostgreSQL in production).
   - **Analytics Columnar Lake:** Ingested datasets are saved into `data/temp/*.parquet` with Snappy compression, yielding microsecond scans and 99.1% storage reduction.
3. **Multi-Agent Pipeline (`backend/core/agents/`):**
   - 9 sequentially dispatched agents running inside `FastAPI.BackgroundTasks`:
     - `A1: UploadAgent`: MIME magic detection, chunked intake, anti-path traversal.
     - `A2: ParserAgent`: Character encoding detection (UTF-8, Latin-1, CP1252), dialect resolution.
     - `A3: ProfilingAgent`: Zero-RAM streaming statistical summaries (<2.8 MB delta).
     - `A4: CleaningAgent`: Deterministic median/mode imputation, IQR outlier capping.
     - `A5: EDAAgent`: Pearson & Spearman correlations, skewness/kurtosis, VIF collinearity.
     - `A6: FeatureEngineeringAgent`: Cyclical datetime features, frequency/target encoding.
     - `A7: TrainingAgent`: AutoML dispatch, 5-fold cross-validation.
     - `A8: EvaluationAgent`: Holdout metric calculations (ROC-AUC, F1, RMSE, R²).
     - `A9: ReportAgent`: Grounded narrative generation strictly from verified pipeline JSON.
4. **AutoML & XAI Engine (`backend/core/automl/`):**
   - 32 algorithms registered across classification and regression (scikit-learn, XGBoost, LightGBM, CatBoost).
   - `LeakFreePreprocessor`: Fits transformers strictly on training folds before transforming validation folds.
   - 3-Tier Explainability: Tier 1 TreeSHAP/KernelSHAP (<15s watchdog) $\rightarrow$ Tier 2 Surrogate Decision Tree $\rightarrow$ Tier 3 Statistical Correlation Ranking.
5. **Security & Governance:**
   - Token-bucket rate limiter (`SecurityMiddleware`).
   - Layer 6 `GuardrailEngine`: Prompt injection regex & PII redactor.
   - Layer 7 `DynamicModelRouter` & `LLMCache`: Sub-5ms exact-match SHA-256 prompt hash caching.
   - Tenant isolation enforced on all endpoints via `Depends(get_current_user)`.

### B. Frontend Architecture (`frontend/`)
1. **Framework & Build:** Next.js 15.5.19, React 19.1.0, Tailwind CSS v4, TypeScript 5.
2. **State & Client Communication:**
   - Zustand store (`platformStore.ts`): Tracks hardware capabilities, dataset metadata, active workflow state.
   - `backendClient.ts`: Intercepts client-side requests, fetches ephemeral JWT tokens from `/api/auth/token`, and attaches `Authorization: Bearer <token>`.
3. **Next.js Dynamic Features & Static Export Infeasibility:**
   - **Route Handlers (`route.ts`):** 13 dynamic server-side API endpoints (`/api/auth/*`, `/api/datasets`, `/api/workspaces`, `/api/dashboard`, `/api/admin`, etc.).
   - **Edge/Node Middleware (`middleware.ts`):** Dynamic session gating and redirect logic using Auth.js.
   - **Auth.js v5:** Uses server-side cookie decryption and credentials validation.
   - **API Rewrites:** Transparent proxying of `/api/v1/*` to the FastAPI backend origin.
   - **Verdict on `output: 'export'`:** **Static HTML export is technically infeasible without completely rewriting and gutting the authentication, security bridge, and API proxying architecture.** The desktop application must either supervise a local Next.js standalone server process or package the application UI with native desktop routing, keeping the existing server architecture intact.

### C. Local AI Connector (`connector/`)
- `agentix_connector.py` is a clean, single-file Python script with zero external dependencies.
- Features local loopback HTTP server (`127.0.0.1:11435`) with Private Network Access (PNA) headers and an outbound WebSocket client to Agentix Cloud.
- Needs enhancements: structured health endpoints, token authentication, explicit operation whitelisting, and automated installer packaging.

---

## 3. Cloud Dependencies vs. Local Capabilities

| Feature / Subsystem | Cloud Dependency (Production Web) | Native Desktop Capability | Implementation Strategy |
|---|---|---|---|
| **Relational Database** | Neon PostgreSQL Serverless | SQLite embedded (`agentix.db`) | Automatically use SQLite in desktop mode; store in OS application data directory (`~/Library/Application Support/Agentix` on macOS, `%APPDATA%\Agentix` on Windows). |
| **Authentication** | Auth.js + Next.js session cookies | Local single-tenant / desktop session | Local mode provides immediate auto-authenticated guest/admin session or local credentials stored in SQLite. |
| **API Secret Management** | Serverless BFF token relay (`/api/auth/token`) | Ephemeral session token (`X-Agentix-Token`) | Generated by the desktop shell at startup; verified by FastAPI middleware for all requests. |
| **Data Storage (Parquet Lake)**| Render persistent disk / temp | Local filesystem (`AppData/Agentix/data`) | Full local read/write capabilities without cloud egress or storage quotas. |
| **LLM Inference** | Cloud Fallback (Gemini, OpenAI, Claude) | Local Ollama (`http://127.0.0.1:11434`) | Auto-probe local Ollama and LM Studio; fallback to cloud APIs only when configured by the user. |
| **Model Training & Cross-Val**| In-process BackgroundTasks on Render | Local CPU / Apple Silicon Metal / CUDA | Native execution using local CPU cores and hardware accelerators. |
| **Executive Reports** | Web JSON preview | Local HTML / JSON export | Output stored directly in user's chosen local export directory. |

---

## 4. Key Architectural Recommendations for Native Desktop

1. **Desktop Shell:** Tauri v2 with Rust backend. Native OS webviews (WebKit on macOS, WebView2 on Windows) provide near-instant startup, tiny binary footprint (<15 MB shell), and fine-grained capability isolation.
2. **Backend Sidecar:** PyInstaller one-dir or one-file executable packaging FastAPI, Uvicorn, and scikit-learn. The Tauri app starts the backend as an OS child process, reads its dynamically chosen loopback port, and verifies the `/health` endpoint before revealing the main UI.
3. **Security Boundary:** The local backend must bind **strictly to `127.0.0.1`** on an ephemeral port. Every request must present a per-session authorization token generated by Tauri and passed via command-line argument/environment variable to the sidecar.
4. **Data Isolation:** User datasets, models, and SQLite database files must reside in the standard OS application data directories:
   - macOS: `~/Library/Application Support/Agentix/`
   - Windows: `%APPDATA%\Agentix\`
   - Linux: `~/.local/share/Agentix/`
