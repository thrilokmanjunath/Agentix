# AGENTIX: WORKFLOW DIAGRAM PACK & NARRATION GUIDE

**Academic Programme:** M.Sc. Data Science  
**Institution:** Department of Computer Science, CHRIST (Deemed to be University)  
**Presenter:** Thrilok M (Register No. 2548430)  
**Deliverable:** Presentation-Quality Editable Mermaid Architecture & Execution Diagrams  

---

## 1. Diagram 1: High-Level System Block Diagram

This block diagram provides an executive overview of the decoupled architectural tiers in Agentix:

```mermaid
graph TB
    subgraph ClientTier["CLIENT & PRESENTATION TIER"]
        UI["Next.js 15 Web Application (Warm Alabaster / React 19)"]
        Zustand["Zustand Reactive Store (platformStore.ts)"]
        UI <--> Zustand
    end

    subgraph EdgeTier["EDGE & ROUTING TIER (Vercel)"]
        EdgeAuth["Auth.js v5 Middleware & Session Gating"]
        TokenRelay["BFF Token Relay (/api/auth/token)"]
        ProxyRewrites["API Rewrite Proxy (/api/v1/* -> Render)"]
        EdgeAuth --> TokenRelay
        TokenRelay --> ProxyRewrites
    end

    subgraph ServiceTier["COMPUTE & BACKEND TIER (FastAPI / Render)"]
        Security["ASGI SecurityMiddleware (Rate Limiter & Headers)"]
        FastAPI["FastAPI 0.115 Application Engine"]
        Orchestrator["PipelineOrchestrator (BackgroundTasks)"]
        Security --> FastAPI --> Orchestrator
    end

    subgraph AnalyticalTier["AUTONOMOUS ANALYTICAL & AI TIER"]
        Agents["9-Stage Multi-Agent Analytical Pipeline"]
        AutoML["AutoML Engine (32 Algorithmic Architectures)"]
        Guardrails["8-Layer AI Security & Guardrail Engine"]
        LocalInference["Hardware-Accelerated Local Inference (Ollama)"]
        Orchestrator --> Agents
        Agents --> AutoML
        FastAPI --> Guardrails --> LocalInference
    end

    subgraph DataTier["DUAL-ENGINE PERSISTENCE TIER"]
        Postgres[("Neon Serverless PostgreSQL (Production)")]
        SQLite[("SQLite Local Engine (agentix.db)")]
        ParquetLake[("Apache Parquet Columnar Lake (data/temp/)")]
        FastAPI <--> Postgres
        FastAPI <--> SQLite
        Agents <--> ParquetLake
    end

    ClientTier <--> EdgeTier
    EdgeTier <--> ServiceTier
```

---

## 2. Diagram 2: Detailed End-to-End Pipeline Execution Workflow

This sequence diagram depicts the exact chronological message flow from user upload through multi-agent processing, model fitting, and conversational querying:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Analyst
    participant Frontend as Next.js 15 Frontend
    participant TokenBridge as /api/auth/token (BFF)
    participant Backend as FastAPI Backend (Render)
    participant Pipeline as 9-Stage Pipeline Orchestrator
    participant ML as AutoML Engine (32 Algorithms)
    participant Database as PostgreSQL / Parquet Lake
    participant Ollama as Local Ollama LLM (researcher-m4)

    %% 1. Authentication
    Note over User,Backend: Phase 1: Authentication & Secure Token Minting
    User->>Frontend: Enter credentials (admin@agentix.com)
    Frontend->>Backend: POST /api/v1/auth/login (form-urlencoded)
    Backend-->>Frontend: HTTP 200 {access_token: "JWT_HMAC_SHA256"}
    Frontend->>Frontend: Seal token in HttpOnly Session Cookie

    %% 2. Data Upload
    Note over User,Database: Phase 2: Streaming Chunked Ingestion
    User->>Frontend: Upload dataset (e.g. churn.csv, 50MB)
    Frontend->>TokenBridge: GET /api/auth/token
    TokenBridge-->>Frontend: Return Bearer Token
    Frontend->>Backend: POST /api/v1/dataset/upload/init
    Backend-->>Frontend: HTTP 200 {upload_id: "uuid-v4"}
    loop Every 2MB Chunk
        Frontend->>Backend: POST /api/v1/dataset/upload/chunk (FormData)
        Backend-->>Frontend: HTTP 200 {status: "success"}
    end
    Frontend->>Backend: POST /api/v1/dataset/upload/complete (upload_id)
    Backend->>Database: Insert Dataset row (enforces owner_id FK)
    Backend->>Pipeline: Spawn BackgroundTasks (start_pipeline)
    Backend-->>Frontend: HTTP 200 {job_id: "uuid-v4", status: "queued"}

    %% 3. Autonomous Execution
    Note over Pipeline,ML: Phase 3: Autonomous Multi-Agent Processing
    Pipeline->>Pipeline: UploadAgent: Reassemble chunks & verify MD5
    Pipeline->>Database: ParserAgent: Sniff delimiter & write Parquet
    Pipeline->>Pipeline: ProfilingAgent: Extract schema, nulls, duplicates
    Pipeline->>Database: CleaningAgent: Apply median/mean/mode imputation
    Pipeline->>Pipeline: EDAAgent: Compute Pearson correlation matrix
    Pipeline->>ML: FeatureEngineeringAgent: One-hot/frequency encode features
    ML->>ML: CandidateSelector: Infer task & rank 32 algorithms
    ML->>ML: LeakFreePreprocessor: 80/20 train/test split
    ML->>ML: Train top candidates (LightGBM, Random Forest, Ridge)
    ML->>Pipeline: EvaluationAgent: Compute Accuracy, F1, ROC-AUC, R2
    Pipeline->>Database: ReportAgent: Persist metrics in PipelineStage

    %% 4. Grounded Chat
    Note over User,Ollama: Phase 4: Grounded Conversational Querying
    User->>Frontend: Ask: "What are the main drivers of churn?"
    Frontend->>Backend: POST /api/v1/platform/chat {query, dataset}
    Backend->>Backend: Layer 6: GuardrailEngine (Scan jailbreak & PII)
    Backend->>Backend: Layer 7: LLMCache (Check SHA-256 exact-match)
    Backend->>Database: Fetch verified metrics & SHAP weights
    Backend->>Ollama: Prompt with <dataset_context> + query
    Ollama-->>Backend: Grounded analytical response
    Backend-->>Frontend: Stream verified answer to Agent Console
    Frontend-->>User: Render formatted markdown & feature charts
```

---

## 3. Diagram 3: Compact Presentation-Ready Diagram

A streamlined, slide-optimized diagram emphasizing the linear transformation from Raw Data to Grounded Intelligence:

```mermaid
flowchart LR
    subgraph S1["1. INGESTION"]
        direction TB
        RawData["Raw Tabular Data\n(CSV, JSON, XLSX, Parquet)"]
        StreamUpload["2MB Chunk Streaming\n(Vercel 4.5MB Safe)"]
        RawData --> StreamUpload
    end

    subgraph S2["2. MULTI-AGENT PIPELINE"]
        direction TB
        P1["Parser & Parquet Lake"]
        P2["Statistical Profiling"]
        P3["Deterministic Imputation\n(Median / Mean / Mode)"]
        P4["Pearson Correlation EDA"]
        P1 --> P2 --> P3 --> P4
    end

    subgraph S3["3. AUTOML & XAI"]
        direction TB
        ML1["32-Algorithm Catalog"]
        ML2["Leak-Free 80/20 Fit\n(LightGBM, Random Forest)"]
        ML3["3-Tier XAI Attribution\n(SHAP / Surrogate Tree)"]
        ML1 --> ML2 --> ML3
    end

    subgraph S4["4. GROUNDED AI"]
        direction TB
        Guard["8-Layer Guardrails\n(PII & Jailbreak Scrub)"]
        Ollama["Hardware Local LLM\n(Zero Cloud Egress)"]
        UI["Warm Alabaster\nExecutive Console"]
        Guard --> Ollama --> UI
    end

    S1 ==> S2 ==> S3 ==> S4
```

---

## 4. 60–90 Second Diagram Narration Script

**Target Time:** 75 Seconds  
**Context:** When presenting Slide 4 or Slide 8 during the CIA Evaluation.

> *"Please direct your attention to the central architecture diagram. Agentix is organized into four clean stages that guarantee zero data egress and zero statistical hallucination.*
>
> *First, at **Ingestion**, when a user drops a dataset—whether CSV, JSON, or an Excel workbook—the client streams it in 2-megabyte chunks. This deliberately bypasses serverless payload boundaries and streams directly into our Apache Parquet columnar data lake.*
>
> *Second, our **9-Stage Multi-Agent Pipeline** takes over asynchronously. The ParserAgent sniffs the dialect; the ProfilingAgent identifies nulls and duplicates; and the CleaningAgent uses statistical skewness to dynamically apply median, mean, or mode imputation.*
>
> *Third, our **AutoML Engine** queries the 32-algorithm registry. CandidateSelector infers the task, prepares a strict leak-free 80/20 split, and benchmarks models like LightGBM and Random Forest. Our 3-tier XAI resolver then extracts true mathematical feature attributions.*
>
> *Finally, at the **Intelligence Layer**, user queries pass through Layer 6 security guardrails—which neutralize prompt injections and redact PII—before querying a local, hardware-accelerated Ollama model. Because the verified pipeline metrics are injected directly into the context, the model cannot hallucinate.*
>
> *In summary: from raw file to verified model and grounded explanation, the entire lifecycle is automated, auditable, and air-gapped."*
