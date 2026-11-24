# Agentix — Limitations & Architectural Boundaries

**Document Version: 2.4.0**  
**Classification: Transparent Technical Limitations Disclosure**

---

## 1. Architectural Boundaries

Every software system embodies deliberate engineering tradeoffs. The following limitations are documented to establish realistic operational expectations for Agentix:

### 1.1 Local Hardware & Memory Ceiling
- **Observation:** Agentix defaults to air-gapped local inference using Apple Silicon unified memory or Nvidia VRAM.
- **Limitation:** On machines with 16GB unified RAM, running `researcher-m4:latest` (or an 8B–14B parameter model) while concurrently processing a 500,000-row tabular dataset in memory can cause memory pressure.
- **Mitigation:** The `FeatureEngineeringAgent` caps one-hot encoding at 50 unique values (`MAX_ONEHOT_CARDINALITY = 50`), and `DynamicModelRouter` dispatches lightweight queries to smaller models (`qwen2.5:3b`).

### 1.2 Binary PDF Generation Status
- **Observation:** The `ReportAgent` aggregates analytical summaries, correlations, feature importances, and evaluation metrics into a clean structured JSON schema.
- **Limitation:** Direct server-side compilation of binary `.pdf` files is not yet implemented. The API payload explicitly sets `"pdf_available": false` and provides the full summary data for web-based reading.
- **Mitigation:** The frontend renders full interactive briefings, and browser print stylesheets allow printing directly to PDF.

### 1.3 In-Memory Security Sinks
- **Observation:** Layer 1 (`TenantTokenBucketLimiter`), Layer 4 (`ToolExecutionAudit`), and Layer 7 (`LLMCache`) operate using in-memory Python data structures.
- **Limitation:** When the backend process restarts or scales horizontally across multiple worker nodes, in-memory rate-limit buckets, tool execution logs, and cache entries are reinitialized.
- **Mitigation:** Stored in thread-safe locks for single-node air-gapped deployments; Redis integration planned for distributed cluster setups.

### 1.4 Tabular Dimension Caps
- **Observation:** Agentix uses scikit-learn's `SGDRegressor` and `SGDClassifier` for deterministic, rapid training.
- **Limitation:** While stochastic gradient descent scales well to millions of rows via `partial_fit`, extreme wide-column datasets (> 2,000 continuous features) without feature selection may degrade convergence speed.
- **Mitigation:** Data scientists can configure target features and drop uninformative columns prior to training.

### 1.5 Database Adapter Offline Behavior
- **Observation:** NextAuth v5 throws `CallbackRouteError` during local development if the `PrismaAdapter` attempts to connect to an offline PostgreSQL server.
- **Limitation:** In air-gapped local development environments without an active PostgreSQL instance on port 5432, database-backed sessions cannot be created.
- **Mitigation:** Agentix gates the database adapter with `USE_DATABASE_ADAPTER === "true"` and provides fallback credentials validation with signed JWT cookies.
