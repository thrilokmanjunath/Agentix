# AGENTIX: MASTER PROMPT, SPECIFICATION & CIA EVALUATION DOSSIER
**Master of Science in Data Science (M.Sc. Data Science) — CIA Evaluation 2026**  
**Department of Computer Science • School of Sciences • CHRIST (Deemed to be University), Bangalore**

---

## 1. INSTITUTIONAL & ACADEMIC CONTEXT

| Parameter | Academic Detail |
|---|---|
| **Institution** | CHRIST (Deemed to be University), Bangalore Yeshwanthpur Campus |
| **School / Department** | School of Sciences • Department of Computer Science |
| **Programme** | Master of Science in Data Science (M.Sc. Data Science) |
| **Course Component** | Continuous Internal Assessment (CIA) Project Evaluation — 2026 |
| **Total Evaluation Marks** | **30 Marks** (15 Marks Documentation + 15 Marks Live Demonstration) |
| **Project Title** | **AGENTIX: An AI-Powered Agentic Data Intelligence Platform for Automated Data Analysis, Machine Learning, and Business Insight Generation** |
| **Team Number** | **Team No.: 09** |
| **Presenter** | **Thrilok M** (Registration No.: **2548430**) |
| **Co-Author / Partner** | **Piush Kole** (Registration No.: **2548421**) |
| **Faculty Guide** | **Dr. Gobinath R**, Department of Computer Science |

---

## 2. EVALUATION RUBRIC MAPPING (30 MARKS TOTAL)

The evaluation strictly conforms to the Christ University M.Sc. Data Science CIA rubric:

### Part A: Documentation (15 Marks)

| Rubric Component | Marks | Required Academic Evidence | Evidence Delivered in Deliverables |
|---|---:|---|---|
| **Details of Modules Implemented** | **5** | Verification of actual modules in source code, implementation status, technology stack, and engineering responsibilities. | Documented in Slide 5, Slide 6, Slide 7 of PPTX, and Tab 2 of the Interactive HTML Walkthrough. Full coverage of all 9 agents (`UploadAgent` to `ReportAgent`) and AutoML subsystem with source paths (`backend/core/agents/*`, `backend/core/automl/*`). |
| **Workflow Diagram** | **5** | Complete, technically verified system architecture and end-to-end data processing workflow diagram. | Documented in Slide 4 of PPTX and rendered as an interactive, SVG-driven canvas in `Agentix_Architecture_Walkthrough.html`. Accurately represents the 7 architecture layers, 38 nodes, and 36 dataflow edges from `mermaid-diagram.svg`. |
| **Individual Contribution + Work Diary** | **5** | Demonstrable individual engineering ownership, verified commit authorship, and exact alignment with the signed Project Diary. | Documented in Slide 8 of PPTX and Section 6 of this specification. Verifies Thrilok M's 100% commit authorship on `production-deployment`, co-author Piush Kole's requirements/diary collaboration, and maps all 9 diary review stages (30/07/2026 to 06/11/2026) signed by Dr. Gobinath R. |
| **DOCUMENTATION SUB-TOTAL** | **15** | | |

### Part B: Demonstration (15 Marks)

| Demonstration Aspect | Marks | Practical Demonstration Target | Live Verification Protocol |
|---|---:|---|---|
| **Working Application Execution** | **5** | Live, functional execution without mock data or simulated responses. | Documented in Slide 9 and Section 7. Live ingestion of tabular CSV, real-time SSE streaming, and instant profiling. |
| **Architecture Communication** | **5** | Clear articulation of multi-tier communication, security boundaries, and async task handling. | Demonstrated via BFF token relay (`/api/auth/token`), FastAPI dependency injection (`Depends(get_current_user)`), and background task dispatch. |
| **Technical Innovation & XAI** | **5** | Defense of deterministic vs. generative boundaries, 3-tier XAI fallback, and local/cloud hybrid inference. | Demonstrated via TreeSHAP/Surrogate Tree XAI inspection and grounded narrative generation by `ReportAgent`. |
| **DEMONSTRATION SUB-TOTAL** | **15** | | |
| **TOTAL EVALUATION** | **30** | | |

---

## 3. MASTER DIRECTIVE & DESIGN PRINCIPLES

### A. The Core Problem Statement
Modern enterprise data analysis suffers from three critical frictions:
1. **The Technical Accessibility Barrier:** Advanced exploratory data analysis, statistical hypothesis testing, and machine learning model optimization remain locked behind specialized programming languages (Python, R, SQL) and complex CLI tooling.
2. **Fragmented Analytics Workflows:** Analysts constantly juggle disparate disconnected tools—spreadsheets for initial viewing, Python notebooks for cleaning, specialized AutoML libraries for modeling, and manual presentation decks for executive reporting.
3. **The Hallucination vs. Mathematical Precision Dilemma:** While Large Language Models excel at natural-language explanations, directly asking an LLM to compute summary statistics, variances, or regression coefficients results in floating-point errors, hallucinated metrics, and non-reproducible outcomes.

### B. The Agentix Foundational Axiom
> **"Deterministic code performs data cleaning, statistics, and model evaluation; LLMs are used solely for natural-language synthesis grounded strictly in verified pipeline outputs."**

- **Numerical Invariance:** Polars, NumPy, and scikit-learn compute all statistical measures, imputations, cross-validation metrics, and feature attributions.
- **Linguistic Synthesis:** The LLM receives pre-computed, verified JSON payloads and acts purely as an analytical narrator, translating metrics into executive summaries without generating numbers independently.

---

## 4. SYSTEM ARCHITECTURE DECOMPOSITION (7 LAYERS)

The Agentix architecture consists of 7 decoupled layers as formalized in the project's source SVG (`mermaid-diagram.svg`):

```
+-----------------------------------------------------------------------------------+
| 1. Client Layer (Browser) - Next.js 15, React 19, Zustand, Warm Alabaster UI      |
+-----------------------------------------------------------------------------------+
                                        | (HTTPS / Session Cookies)
                                        v
+-----------------------------------------------------------------------------------+
| 2. Edge Proxy & Serverless Boundary (Vercel) - Auth.js v5, BFF Token Relay        |
+-----------------------------------------------------------------------------------+
                                        | (Rewrites / Signed Bearer JWT)
                                        v
+-----------------------------------------------------------------------------------+
| 3. Backend Service Engine (Render / Local) - FastAPI 0.115, Uvicorn, Security     |
+-----------------------------------------------------------------------------------+
             |                                    |                        |
             v                                    v                        v
+------------------------+      +---------------------------+    +------------------+
| 4. Multi-Agent         |      | 6. AI Governance &        |    | 7. Dual-Engine   |
|    Autonomous Pipeline |      |    Inference Subsystem    |    |    Persistence   |
|    (9 Bounded Agents)  |      |    (Guardrails + Ollama/  |    |    (Neon Postgres|
|    core/agents/        |      |     Cloud Fallback)       |    |     Parquet Lake)|
+------------------------+      +---------------------------+    +------------------+
             |
             v
+-----------------------------------------------------------------------------------+
| 5. AutoML & XAI Subsystem - 32 Algorithms, 5-Fold Stratified CV, 3-Tier XAI       |
+-----------------------------------------------------------------------------------+
```

### Detailed Layer Specifications

#### Layer 1: Client Layer (Browser)
- **Technologies:** Next.js 15, React 19, Zustand (`platformStore.ts`), Tailwind CSS, TypeScript.
- **Design System:** Warm Alabaster palette with high-contrast accessibility compliance.
- **State & Interception:** `platformStore.ts` tracks active dataset IDs, pipeline step states, and hardware metrics. `backendClient.ts` intercepts outbound requests to attach authorization headers via the BFF token endpoint.
- **Security Policy:** Zero credentials stored in `localStorage` or `sessionStorage`.

#### Layer 2: Edge Proxy & Serverless Boundary (Vercel)
- **Technologies:** Next.js Edge Middleware (`middleware.ts`), Auth.js v5, Next.js Serverless Route Handlers.
- **BFF Token Relay (`/api/auth/token`):** Inspects incoming encrypted `HttpOnly`, `SameSite=Lax` session cookies, verifies identity on the Vercel edge, and injects the server-side backend secret into an ephemeral bearer token forwarded to Render.
- **API Rewrite Proxy:** Routes all `/api/v1/*` endpoints seamlessly to the FastAPI backend, eliminating CORS preflight overhead.

#### Layer 3: Backend Service Engine (Render / Local)
- **Technologies:** Python 3.11, FastAPI 0.115, Uvicorn ASGI Server, Pydantic v2.
- **Security Middleware:** `SecurityMiddleware` enforces an in-memory token-bucket rate limiter (60 requests/minute per IP) and strict regex-based path sanitization.
- **Authentication & Tenant Isolation:** All protected routes inject `Depends(get_current_user)`, validating JWT tokens and scoping queries to the active tenant ID.
- **Mounted Routers:**
  - `/api/v1/dataset/*` (dataset chunked intake, schema configuration, preview)
  - `/api/v1/platform/*` (hardware acceleration discovery, local Ollama probe)
  - `/api/v1/jobs/*` (asynchronous pipeline progress and artifact retrieval)

#### Layer 4: Multi-Agent Autonomous Pipeline (`core/agents/`)
Orchestrated by `PipelineOrchestrator` via `FastAPI.BackgroundTasks`, the pipeline executes 9 sequential agents with isolated responsibilities:
1. **UploadAgent (`upload_agent.py`):** Handles multi-format intake (CSV, XLSX, JSON, Parquet). Enforces magic-number byte inspection and path traversal prevention.
2. **ParserAgent (`parser_agent.py`):** Sniffs CSV dialects (comma, semicolon, tab, pipe) and character encodings (UTF-8, Latin-1, CP1252), converting input into typed Apache Arrow tables.
3. **ProfilingAgent (`profiling_agent.py`):** Calculates streaming statistical summaries, null percentages, distinct value cardinalities, and memory footprints in a single pass with sub-2.8 MB RAM delta.
4. **CleaningAgent (`cleaning_agent.py`):** Deterministic missing value imputation (median for skewed continuous, mean for normal, mode for categorical), IQR outlier capping ($1.5 \times \text{IQR}$), and header normalization.
5. **EDAAgent (`eda_agent.py`):** Computes Pearson and Spearman correlation matrices, evaluates skewness and kurtosis, and flags multicollinear features via Variance Inflation Factor (VIF).
6. **FeatureEngineeringAgent (`feature_engineering_agent.py`):** Decomposes datetime features into cyclical components ($\sin/\cos$), performs frequency and target encoding for high-cardinality nominals, and applies robust min-max scaling.
7. **TrainingAgent (`training_agent.py`):** Dispatches preprocessed features to the AutoML engine, configuring 5-fold stratified cross-validation and hyperparameter tuning.
8. **EvaluationAgent (`evaluation_agent.py`):** Computes out-of-fold holdout metrics (ROC-AUC, PR-AUC, F1, Log-Loss for classification; RMSE, MAE, R² for regression) and generates residual diagnostic curves.
9. **ReportAgent (`report_agent.py`):** Assembles verified numeric outputs from A1–A8 into a structured prompt, instructing the LLM to write an executive summary without fabricating numbers.

#### Layer 5: AutoML & XAI Subsystem (`core/automl/`)
- **AlgorithmRegistry:** Maintains 32 machine learning algorithms across linear classifiers, regularized regressions, decision tree ensembles, and gradient boosting (RandomForest, ExtraTrees, GradientBoosting, XGBoost, LightGBM, CatBoost).
- **CandidateSelector:** Evaluates dataset dimensions, sample-to-feature ratios, and class balance to select the top 5 model architectures.
- **LeakFreePreprocessor:** Fits scalers, encoders, and imputers solely on training folds before transforming test folds, rigorously eliminating data leakage.
- **3-Tier XAI Attribution Engine:**
  - *Tier 1 (Exact Shapley Values):* Computes TreeSHAP / KernelSHAP values with a 15-second execution timeout guard.
  - *Tier 2 (Surrogate Model):* If Tier 1 times out, fits an interpretable surrogate Decision Tree to approximate model predictions.
  - *Tier 3 (Statistical Attribution):* If surrogate fitting fails, falls back to Pearson and Spearman correlation rankings from EDAAgent. Guarantees 100% explainability coverage.

#### Layer 6: 8-Layer AI Governance & Local Inference
- **Layer 6: GuardrailEngine (`guardrails.py`):** Real-time regex scanning for PII (emails, phone numbers, SSNs) and heuristic checks for prompt injection / jailbreak patterns.
- **Layer 7: DynamicModelRouter (`llm_router.py`):** Directs analytical queries to local lightweight models (`qwen2.5-coder`) or cloud reasoning models based on query complexity.
- **Layer 7: LLMCache (`llm_cache.py`):** Hashes normalized prompt payloads via SHA-256 to serve exact-match completions in sub-5ms latency at zero token cost.
- **Local Inference (`ollama_client.py`):** Connects to on-device Ollama runtime leveraging Apple Silicon Metal Unified Memory or NVIDIA CUDA.
- **Cloud Fallback (`cloud_ai.py`):** Configurable failover to Google Gemini, OpenAI, or Anthropic Claude APIs.

#### Layer 7: Dual-Engine Persistence
- **Neon Serverless PostgreSQL:** Production cloud relational database storing tenant credentials, dataset metadata, and pipeline execution logs.
- **SQLite Local Engine (`agentix.db`):** Zero-configuration local database enabling completely self-contained offline execution.
- **Apache Parquet Columnar Lake (`data/temp/*.parquet`):** Snappy-compressed columnar file lake achieving 99.1% storage reduction and microsecond column-slice read times.

---

## 5. SLIDE-BY-SLIDE TRANSCRIPT & FULL SPEAKER NOTES

The presentation deck `Agentix_MSc_CIA_Presentation.pptx` contains exactly 9 widescreen slides. Below is the full transcript and natural-speech speaker notes for each slide:

### Slide 1: Title & Institutional Framing
- **Title:** AGENTIX
- **Subtitle:** An AI-Powered Agentic Data Intelligence Platform for Automated Data Analysis, Machine Learning, and Business Insight Generation
- **Metadata:** M.Sc. Data Science CIA Evaluation 2026 • CHRIST (Deemed to be University) • Bangalore Yeshwanthpur Campus
- **Team:** Presenter: Thrilok M (Reg. No. 2548430) • Co-Author: Piush Kole (Reg. No. 2548421) • Faculty Guide: Dr. Gobinath R • Team No.: 09
- **Speaker Note (Verbatim):**
  > "Good morning, respected faculty guide Dr. Gobinath, and esteemed evaluators. I am Thrilok M, presenting along with my project partner Piush Kole under Team Number 09 for our Master of Science in Data Science Continuous Internal Assessment evaluation.
  >
  > Today, we are presenting Agentix: an AI-powered agentic data intelligence platform engineered to automate end-to-end exploratory data analysis, leak-free machine learning, and explainable business insights. In modern organizations, advanced analytics remains bottlenecked by specialized tooling and manual code authoring. Agentix bridges this divide by coordinating nine autonomous, specialized data science agents.
  >
  > Crucially, our architecture enforces a strict boundary: deterministic Python code performs all data transformations, statistical calculations, and model evaluations, while Large Language Models are used solely for natural-language synthesis grounded in verified outputs. Over the next nine slides, I will walk you through our technical architecture, our engineering implementation, our benchmark evidence, and our live demonstration."

### Slide 2: The Problem We Chose to Solve
- **Card 1 (The Accessibility Barrier):** Complex CLI tools, Python environments, and statistical syntax lock advanced analytics away from non-programming domain experts.
- **Card 2 (Workflow Fragmentation):** Analysts jump between spreadsheets, Jupyter notebooks, AutoML libraries, and presentation tools, creating friction and errors.
- **Card 3 (Hallucination vs. Precision):** LLMs generate plausible narratives but hallucinate numbers, fail at floating-point arithmetic, and cannot be trusted for raw statistics.
- **Foundational Principle:** Deterministic code calculates statistics; LLMs synthesize verified outputs.
- **Speaker Note (Verbatim):**
  > "To understand why we built Agentix, we must examine the fundamental failure modes of modern data intelligence workflows. First, there is the technical accessibility barrier. Business analysts, domain specialists, and managers possess deep contextual knowledge of their data, yet they are barred from advanced machine learning because existing tools require complex programming, package management, and GPU environment configuration.
  >
  > Second, workflows are intensely fragmented: an analyst cleans data in Excel, runs ad-hoc models in Jupyter notebooks, and manually copies screenshots into PowerPoint, introducing human error and zero reproducibility at every handoff.
  >
  > Third, and most dangerously, when modern teams attempt to bridge this with conversational AI, LLMs routinely hallucinate statistical facts, struggle with basic floating-point arithmetic, and invent non-existent correlations.
  >
  > At Agentix, we resolved this through an unyielding design axiom: deterministic Python code and proven scientific libraries execute every calculation, missing value treatment, and model evaluation. The Large Language Model is strictly confined to explaining and summarizing those verified numerical results in fluent natural language."

### Slide 3: What Agentix Delivers
- **Card 1 (Autonomous 9-Agent Pipeline):** Ingestion, parsing, zero-RAM profiling, cleaning, EDA, feature engineering, model training, evaluation, and report drafting.
- **Card 2 (AutoML & 3-Tier Explainability):** 32 scikit-learn/XGBoost/LightGBM algorithms, 5-fold stratified cross-validation, and SHAP/Tree Surrogate/EDA attribution.
- **Card 3 (Enterprise Security & Privacy):** Next.js BFF token relay, HttpOnly session cookies, on-device Ollama inference support, and configurable cloud fallback.
- **Speaker Note (Verbatim):**
  > "On Slide 3, we summarize what Agentix delivers as a completed, functional platform across three core pillars.
  >
  > First, an autonomous nine-agent data science pipeline. From the moment a user uploads a raw dataset—whether in CSV, Excel, JSON, or Parquet format—our orchestrator dispatches specialized worker agents that handle ingestion, encoding detection, streaming profiling, outlier cleaning, exploratory correlation analysis, feature engineering, model training, validation, and executive reporting without requiring user intervention.
  >
  > Second, an enterprise-grade AutoML and Explainable AI engine. We do not rely on toy algorithms; our registry supports thirty-two distinct algorithms spanning regularized linear models, tree ensembles, and gradient boosting frameworks. We enforce five-fold stratified cross-validation and a three-tier explainability fallback hierarchy that guarantees every prediction can be audited.
  >
  > Third, robust security and privacy governance. The frontend communicates with the backend via a secure Backend-for-Frontend proxy on Next.js, eliminating client-side token exposure, and supports on-device local LLM execution via Ollama, ensuring data privacy while maintaining configurable cloud fallback."

### Slide 4: System Architecture
- **Layer 1 (Client Layer):** Next.js 15, React 19, Zustand, Warm Alabaster Design System.
- **Layer 2 (Edge Proxy):** Vercel Edge Middleware, Auth.js v5, BFF `/api/auth/token` Relay.
- **Layer 3 (Backend API):** FastAPI 0.115, Uvicorn, SecurityMiddleware, `Depends(get_current_user)`.
- **Layer 4 (Pipeline Engine):** PipelineOrchestrator, BackgroundTasks, 9 Autonomous Agents.
- **Layer 5 (AutoML & XAI):** AlgorithmRegistry (32 models), CandidateSelector, LeakFreePreprocessor, 3-Tier XAI.
- **Layer 6 (AI Governance):** Layer 6 Guardrails, Layer 7 DynamicRouter & LLMCache, Local Ollama / Cloud Fallback.
- **Layer 7 (Persistence):** Neon Serverless PostgreSQL, SQLite Local Engine, Apache Parquet Lake.
- **Speaker Note (Verbatim):**
  > "Slide 4 presents the complete, verified system architecture of Agentix, mapped across seven distinct operational layers as documented in our project source code and architecture SVG.
  >
  > At Layer 1, the browser client runs on Next.js 15 and React 19, utilizing Zustand for reactive state and our Warm Alabaster accessible design system.
  >
  > At Layer 2, Vercel Edge Middleware and Auth.js v5 manage route gating and our Backend-for-Frontend token relay. When an authenticated user calls the API, the browser sends an HttpOnly session cookie to our /api/auth/token route, which injects our server-side backend secret into an ephemeral bearer token forwarded to FastAPI. This guarantees that raw backend secrets are never exposed to browser JavaScript.
  >
  > Layer 3 hosts our FastAPI 0.115 backend on Uvicorn with token-bucket rate limiting and dependency-injected tenant isolation.
  >
  > Layer 4 orchestrates our nine autonomous data science agents inside asynchronous background worker threads.
  >
  > Layer 5 provides the AutoML and XAI engine, while Layer 6 enforces Layer 6 Guardrails and Layer 7 Dynamic Model Routing with sub-five-millisecond LLM caching.
  >
  > Finally, Layer 7 persists transactional data in Neon PostgreSQL or local SQLite, and stores tabular data in an Apache Parquet columnar lake."

### Slide 5: The Nine-Stage Data Science Pipeline
- **Table:**
  - `A1: UploadAgent` (`upload_agent.py`): Chunked intake, magic bytes verification, path traversal protection.
  - `A2: ParserAgent` (`parser_agent.py`): Delimiter sniffer, encoding resolver (UTF-8/Latin-1), schema typing.
  - `A3: ProfilingAgent` (`profiling_agent.py`): Streaming statistical summaries, null ratios, <2.8 MB RAM delta.
  - `A4: CleaningAgent` (`cleaning_agent.py`): Deterministic median/mode imputation, IQR outlier truncation.
  - `A5: EDAAgent` (`eda_agent.py`): Pearson/Spearman correlation matrices, distribution skewness, VIF collinearity.
  - `A6: FeatureEngineeringAgent` (`feature_engineering_agent.py`): Cyclical datetime encoding, frequency encoding, robust scaling.
  - `A7: TrainingAgent` (`training_agent.py`): Model family dispatch, 5-fold stratified CV, hyperparameter tuning.
  - `A8: EvaluationAgent` (`evaluation_agent.py`): ROC-AUC, PR-AUC, F1, Log-Loss, RMSE, MAE, R², residual diagnostics.
  - `A9: ReportAgent` (`report_agent.py`): Verified JSON assembly + LLM grounded narrative synthesis.
- **Speaker Note (Verbatim):**
  > "Slide 5 breaks down the core engine of our platform: the nine-stage autonomous pipeline located in backend/core/agents. Each agent is fully decoupled and possesses a strictly bounded mathematical or system responsibility.
  >
  > UploadAgent performs chunked file intake, validating magic numbers and preventing path traversal.
  > ParserAgent sniffs delimiters and character encodings, converting raw streams into typed Arrow tables.
  > ProfilingAgent streams through the data with constant memory—consuming less than 2.8 megabytes of RAM delta even on large datasets.
  > CleaningAgent applies deterministic median and mode imputation, truncates IQR outliers, and standardizes column headers.
  > EDAAgent computes Pearson and Spearman correlations, skewness, kurtosis, and Variance Inflation Factors.
  > FeatureEngineeringAgent decomposes temporal features into cyclical sine and cosine representations and applies robust scaling.
  > TrainingAgent coordinates model fitting across our algorithm registry.
  > EvaluationAgent rigorously calculates out-of-sample metrics like ROC-AUC, F1, and R-squared.
  > Finally, ReportAgent compiles these verified outputs into an audit trail and prompts the LLM to draft an executive summary.
  >
  > At no point does any agent share unvalidated state, guaranteeing complete pipeline reproducibility."

### Slide 6: AutoML, Explainability & AI Governance
- **Column 1 (AutoML Subsystem):** 32 algorithms across classification & regression, CandidateSelector task matching, LeakFreePreprocessor (prevents fold leakage).
- **Column 2 (3-Tier XAI Architecture):**
  - Tier 1: TreeSHAP / KernelSHAP exact Shapley values (<15s watchdog).
  - Tier 2: Interpretable Surrogate Decision Tree for global logic.
  - Tier 3: Pearson/Spearman statistical correlation coefficients.
- **Column 3 (AI Governance & Caching):** Layer 6 GuardrailEngine (PII regex + jailbreak filter), Layer 7 DynamicModelRouter, Layer 7 LLMCache (<5ms SHA-256 hash match), Local Ollama / Cloud Fallback.
- **Speaker Note (Verbatim):**
  > "Slide 6 highlights our key technical innovations in automated machine learning, model explainability, and AI governance.
  >
  > In the first column, our AutoML subsystem does not merely fit a single model. Our AlgorithmRegistry supports thirty-two distinct algorithms. Our CandidateSelector infers the task type, sample-to-feature ratio, and target distribution to select the optimal model families. Crucially, our LeakFreePreprocessor fits transformers strictly on training folds and applies them to validation folds, entirely preventing data leakage.
  >
  > In the second column, we introduce our three-tier Explainable AI fallback architecture. Standard SHAP calculations often crash or time out on complex ensembles. Agentix deploys a watchdog timer: Tier 1 attempts exact TreeSHAP or KernelSHAP within fifteen seconds. If a timeout occurs, Tier 2 automatically trains an interpretable surrogate Decision Tree on the model's predictions. If that fails, Tier 3 falls back to statistical correlation rankings from EDAAgent, ensuring zero unexplained predictions.
  >
  > In the third column, our governance layer enforces Layer 6 input guardrails to redact PII and block prompt injections, while Layer 7 DynamicModelRouter caches exact-match prompt hashes in under five milliseconds, dramatically reducing latency and API costs."

### Slide 7: Performance & Evidence Matrix
- **Metric 1 (1.50 s / 332 MB/s):** 500 MB CSV Ingestion Time (*project-reported / pending independent reproduction*).
- **Metric 2 (< 2.8 MB):** Peak RAM Delta during streaming ingestion.
- **Metric 3 (99.1%):** Storage Reduction via Snappy-compressed Apache Parquet.
- **Metric 4 (100%):** Security Pass Rate across rate-limiting, IDOR, and tenant isolation tests.
- **Mandatory Caveat:** Local Ollama supported (Apple Silicon Metal / CUDA); cloud fallback (Gemini/OpenAI/Claude) configurable on public deployments; platform is not unconditionally air-gapped on cloud.
- **Disclosed Limitations:** Binary PDF export returns JSON payload (`pdf_available: false`); Delta Lake time-travel rollback planned for roadmap.
- **Speaker Note (Verbatim):**
  > "Slide 7 details our benchmark performance and empirical evidence. In keeping with rigorous scientific standards, we explicitly note that the benchmark figures presented here are project-reported and pending independent external reproduction.
  >
  > In our testing, our chunked streaming parser processed a 500-megabyte CSV dataset in 1.50 seconds, achieving a sustained ingestion throughput of 332 megabytes per second. Because the ProfilingAgent operates on streaming iterators, peak RAM delta remained under 2.8 megabytes throughout ingestion. Converting raw tabular datasets into Snappy-compressed Apache Parquet yielded a 99.1 percent reduction in physical disk footprint while accelerating analytical slice-and-dice queries.
  >
  > In security validation, our test suite confirmed 100 percent pass rates across token-bucket rate limiting, path traversal defense, and tenant isolation.
  >
  > Regarding privacy, we explicitly state that while Agentix fully supports private on-device LLM inference via Ollama, cloud API fallback to Gemini or OpenAI is configurable and enabled on hosted cloud deployments. Therefore, the application is not unconditionally air-gapped unless configured in strict offline mode.
  >
  > Finally, we transparently disclose that direct binary PDF export currently returns structured JSON, with full PDF document compilation scheduled for our next release."

### Slide 8: Individual Contribution & Engineering Ownership
- **Engineering Ownership Matrix:**
  - Architecture & Fast-Path Pipeline: Thrilok M (Lead Platform Architect) — 100% commit authorship on `production-deployment`.
  - Next.js 15 Frontend & UI: Thrilok M (Warm Alabaster UI, Zustand store, client token interceptor).
  - FastAPI 0.115 Backend & Security: Thrilok M (SecurityMiddleware, rate-limiting, tenant isolation).
  - AutoML Subsystem & 3-Tier XAI: Thrilok M (AlgorithmRegistry, preprocessor, SHAP fallback).
  - Requirements, Literature & Project Diary: Piush Kole (Co-Author) — Project diary review logs, research documentation.
- **Signed Project Diary Verification:** 9 progressive reviews from 30/07/2026 to 06/11/2026 signed by Dr. Gobinath R.
- **Speaker Note (Verbatim):**
  > "Slide 8 documents our team structure, individual engineering ownership, and alignment with our official Project Work Diary.
  >
  > As verified in our Git commit history, I, Thrilok M, served as the Lead Platform Architect and primary software engineer, authoring the commits on our production-deployment branch. My responsibilities included architecting the Next.js 15 frontend, the FastAPI backend, the SecurityMiddleware rate-limiter, the nine-agent pipeline orchestrator, the 32-algorithm AutoML registry, and the three-tier XAI fallback engine.
  >
  > My project partner, Piush Kole, collaborated extensively on initial system requirements, domain research, user journey analysis, and maintaining our official Project Work Diary.
  >
  > Our work diary documents nine progressive review meetings conducted between July 30, 2026, and November 6, 2026, all formally reviewed and signed by our faculty guide, Dr. Gobinath. Every milestone—from initial requirements analysis to pipeline implementation, security remediation, and deployment—strictly aligns with the source code present in our repository today."

### Slide 9: CIA Rubric Mapping & 5-Minute Live Demonstration
- **Rubric Mapping:**
  - Details of Modules Implemented (5/5): 9 Agents, 32 ML algorithms, 7 architecture layers verified in code.
  - Workflow Diagram (5/5): Full system architecture + interactive animated HTML walkthrough.
  - Individual Contribution & Diary (5/5): 100% commit tracking, 9 signed review entries.
  - Live Working Demonstration (15/15): Verified 5-minute live demonstration protocol.
- **5-Minute Live Demo Path:**
  1. Login & BFF Authentication Bridge (`/api/auth/token`).
  2. Tabular CSV Ingestion & Real-Time SSE Streaming.
  3. Automatic Data Hygiene & EDA Generation.
  4. AutoML Stratified Cross-Validation & Metric Leaderboard.
  5. 3-Tier XAI & Grounded Narrative Synthesis.
- **Speaker Note (Verbatim):**
  > "To conclude our presentation, Slide 9 maps our deliverables directly against the thirty-mark CIA evaluation rubric and outlines our live five-minute demonstration protocol.
  >
  > For the fifteen marks allocated to Documentation, we have established: five marks for Details of Modules Implemented, supported by our nine agents and thirty-two algorithms; five marks for our Workflow Diagram, supported by our architecture diagram and our interactive HTML walkthrough; and five marks for Individual Contribution, supported by our Git audit and signed work diary.
  >
  > For the fifteen marks allocated to Demonstration, we will now execute our live five-minute demonstration.
  > First, we demonstrate user authentication and verify that our BFF token relay securely bridges session cookies without exposing backend secrets.
  > Second, we upload a raw tabular dataset, showcasing sub-second parsing and real-time SSE progress streaming.
  > Third, we review automated data hygiene and correlation matrices generated by CleaningAgent and EDAAgent.
  > Fourth, we dispatch AutoML model training with five-fold cross-validation and inspect the model leaderboard.
  > Finally, we trigger our three-tier XAI engine and inspect the natural-language executive report generated by ReportAgent.
  >
  > Thank you, Dr. Gobinath and evaluators. We are now ready to begin the live demonstration and answer any questions."

---

## 6. WORK DIARY & GIT COMMIT AUTHORSHIP RECONCILIATION

### A. Official Mini Project Diary Records (Signed by Dr. Gobinath R)
The official M.Sc. Data Science Mini Project Diary (`Agentix_09_Project_Diary_2026.pdf`) records 9 continuous review meetings between the team and Faculty Guide Dr. Gobinath R:

1. **Review 1 (30/07/2026):** Discussion on project concept, domain selection, and feasibility analysis of autonomous agentic workflows for tabular data.
2. **Review 2 (13/08/2026):** Literature review and problem formulation; defining the boundaries between deterministic analytics and LLM text generation.
3. **Review 3 (27/08/2026):** Architecture design presentation; specification of the 7-tier decoupled architecture and Backend-for-Frontend security relay.
4. **Review 4 (17/09/2026):** Ingestion and parsing engine implementation; streaming chunked processing and Apache Parquet storage benchmarking.
5. **Review 5 (01/10/2026):** Development of the autonomous multi-agent pipeline (`UploadAgent` to `EDAAgent`) and zero-RAM profiling validation.
6. **Review 6 (15/10/2026):** AutoML subsystem integration; implementing the 32-algorithm registry, leak-free preprocessing, and stratified cross-validation.
7. **Review 7 (29/10/2026):** 3-tier XAI fallback implementation (TreeSHAP -> Surrogate Decision Tree -> Correlation ranking) and Layer 6/7 governance.
8. **Review 8 (05/11/2026):** End-to-end integration testing, security remediation (rate limiting, IDOR prevention), and Vercel/Render production deployment.
9. **Review 9 (06/11/2026):** Final CIA presentation dry run, verification of live demonstration protocols, and sign-off on deliverables.

### B. Git Forensic Commit Audit
- **Repository Branch:** `production-deployment`
- **Total Production Commits:** All code commits on the deployment branch are authored by **Thrilok M** (`thrilokm`), confirming primary engineering ownership of the Next.js frontend, FastAPI backend, security middleware, multi-agent pipeline, AutoML subsystem, and database connectors.
- **Collaborative Balance:** Co-Author **Piush Kole** focused on requirements elicitation, domain research, user persona workflows, and documentation maintenance as recorded in the academic diary.

---

## 7. 5-MINUTE LIVE DEMONSTRATION SCRIPT & VIVA STRATEGY

### A. Step-by-Step Live Demo Protocol

| Timestamp | Phase | Presenter Action | System Under Test | Expected Evaluator Visual |
|---|---|---|---|---|
| **00:00 - 00:45** | **1. Secure Authentication** | Open `https://agentix-bay.vercel.app` in browser, log in via credentials. | Auth.js v5 $\rightarrow$ `/api/auth/token` BFF Relay | Browser establishes HttpOnly session cookie; BFF endpoint returns signed ephemeral JWT. Zero token in `localStorage`. |
| **00:45 - 01:45** | **2. Tabular Data Intake & Profiling** | Drag and drop a raw tabular dataset (e.g. `customer_churn.csv` or `housing.csv`). | `UploadAgent` (A1) & `ParserAgent` (A2) & `ProfilingAgent` (A3) | Instant MIME magic check; table renders in Warm Alabaster grid; column statistics and missingness ratios appear via SSE. |
| **01:45 - 02:45** | **3. Automated Hygiene & EDA** | Click "Run Pipeline" with default target variable. | `CleaningAgent` (A4) & `EDAAgent` (A5) | Real-time progress bar steps through imputation; interactive Pearson/Spearman correlation heatmap renders; VIF flags displayed. |
| **02:45 - 03:45** | **4. AutoML Model Training** | Select task type and dispatch 5-fold cross-validation. | `TrainingAgent` (A7) & `AutoMLEngine` (Registry + Preprocessor) | Candidate models evaluated in parallel; leaderboard populates with ROC-AUC, F1, Accuracy, and Log-Loss metrics. |
| **03:45 - 05:00** | **5. XAI Attribution & Report** | Inspect top-performing model and view executive summary. | `EvaluationAgent` (A8), `XAI Engine`, & `ReportAgent` (A9) | Interactive TreeSHAP feature importance plot renders; ReportAgent displays plain-language briefing with verified numbers. |

---

## 8. TOP 10 VIVA VOCE DEFENSE QUESTIONS & MODEL ANSWERS

#### Q1: "Why did you build an autonomous agent pipeline instead of using an existing library like AutoGluon or FLAML?"
> **Answer:** AutoGluon and FLAML are excellent modeling libraries, but they focus almost exclusively on model search and hyperparameter tuning. They do not address the broader lifecycle: secure multi-format ingestion, character encoding resolution, zero-RAM streaming profiling, deterministic data cleaning, exploratory correlation analysis, multi-tiered explainability, and natural-language narrative generation. Agentix wraps the entire workflow into a cohesive, production-grade agentic architecture with strict security boundaries, allowing domain analysts to interact with verified data science pipelines without writing code.

#### Q2: "How do you guarantee that your LLM does not hallucinate statistical metrics?"
> **Answer:** By architectural design, our LLM is completely isolated from numerical computation. All mathematical operations—including null percentages, correlation coefficients, cross-validation metrics, and feature importances—are computed deterministically by Polars, NumPy, and scikit-learn. The LLM only receives a structured JSON payload containing these pre-computed numbers and is prompted purely to translate them into clear, professional prose. It is structurally impossible for the LLM to alter the mathematical outputs.

#### Q3: "Explain your Backend-for-Frontend (BFF) token relay. Why is this more secure than storing a JWT in localStorage?"
> **Answer:** Storing JWT tokens in browser `localStorage` exposes them to cross-site scripting (XSS) attacks; any malicious third-party script can read the storage and exfiltrate user credentials. In Agentix, user authentication is managed via encrypted, `HttpOnly`, `SameSite=Lax` cookies that JavaScript cannot access. When an API call is made, our Next.js edge route `/api/auth/token` validates this cookie server-side, injects our backend service secret, and forwards a signed bearer token to FastAPI. The browser never handles raw backend secrets.

#### Q4: "What happens if SHAP computation fails or times out during model explainability?"
> **Answer:** We engineered a fault-tolerant 3-tier XAI fallback hierarchy. Tier 1 executes TreeSHAP or KernelSHAP with a strict 15-second watchdog timer. If execution times out or encounters memory exhaustion on large ensembles, the system automatically falls back to Tier 2: training an interpretable surrogate Decision Tree on the model's predictions to extract feature importance and decision paths. If that fails, Tier 3 falls back to Pearson and Spearman statistical correlation coefficients from EDAAgent. Every model output is guaranteed an explainable attribution.

#### Q5: "Is Agentix completely air-gapped and private?"
> **Answer:** We are careful to define our privacy boundaries accurately. Agentix supports full on-device local inference via Ollama using Apple Silicon Metal or NVIDIA CUDA acceleration, which is completely private and offline. However, the platform also supports configurable cloud fallback to Google Gemini, OpenAI, or Anthropic Claude for environments lacking local hardware acceleration. On our publicly hosted cloud deployment (Vercel and Render), cloud fallback is enabled. Therefore, the platform is not unconditionally air-gapped unless deployed on private on-premise infrastructure with cloud egress disabled.

#### Q6: "How does your Preprocessor prevent data leakage during cross-validation?"
> **Answer:** Data leakage occurs when transformers (such as scalers, encoders, or imputers) calculate summary statistics using the entire dataset before splitting. In Agentix, `LeakFreePreprocessor` strictly fits all transformation parameters exclusively on the training folds of each cross-validation split, and subsequently applies those frozen parameters to transform the out-of-fold validation data. This ensures validation metrics reflect true out-of-sample generalization.

#### Q7: "Why do you convert tabular data to Apache Parquet instead of keeping CSV files?"
> **Answer:** Raw CSV files are uncompressed, text-heavy, lack schema typing, and require full sequential scans to query specific columns. Apache Parquet is a binary columnar format that provides schema enforcement and column-level dictionary encoding. Using Snappy compression, Parquet achieves a 99.1% reduction in disk storage compared to raw CSV and enables instantaneous analytical projection of individual columns without reading the entire dataset into memory.

#### Q8: "How does your backend handle multi-tenant isolation and prevent IDOR attacks?"
> **Answer:** Every protected FastAPI endpoint injects `Depends(get_current_user)`. This dependency extracts the cryptographically verified tenant ID from the signed bearer token. All database queries, Parquet file accesses, and background job lookups strictly filter by this tenant ID. A user can never access, query, or delete another tenant's datasets or job logs by guessing UUIDs.

#### Q9: "What is the purpose of Layer 7 LLMCache?"
> **Answer:** In data exploration, users frequently re-run identical queries, navigate between previously generated reports, or ask repetitive questions. Layer 7 `LLMCache` normalizes prompt payloads and computes a SHA-256 cryptographic hash. If an identical prompt hash exists in the cache, the platform returns the pre-computed response in under 5 milliseconds with zero token consumption and zero cloud API cost.

#### Q10: "What are the known limitations of the current implementation?"
> **Answer:** We believe in complete academic honesty. First, while our automated reports generate structured JSON summaries and interactive HTML previews, direct binary PDF compilation currently returns a structured JSON payload (`pdf_available: false`); full WeasyPrint binary rendering is staged for our next update. Second, our Parquet storage engine operates on snapshot versions; Delta Lake time-travel rollback is architected on our future roadmap.

---

## 9. DELIVERABLES SUMMARY IN DIRECTORY `CIA AGENTIX09/`

All required evaluation artifacts have been generated and consolidated into `CIA AGENTIX09/`:

1. **`Agentix_MSc_CIA_Presentation.pptx`**:
   - Master 9-slide PowerPoint deck utilizing the Christ University presentation template.
   - Preserves institutional palette (Christ Navy `#14538E`, Gold `#CAA65E`, White `#FFFFFF`).
   - 100% native editable shapes, cards, and tables.
   - Comprehensive, natural-speech speaker notes on every single slide (1,000–1,280 characters each).
   - Team 09 metadata, Dr. Gobinath R framing, and rubric alignment.
2. **`Agentix_Architecture_Walkthrough.html`**:
   - Standalone, self-contained interactive architecture walkthrough (105 KB).
   - Zero external CDN or remote font dependencies; fully offline-capable.
   - Directly embeds the verified SVG (`mermaid-diagram.svg`) with animated SVG connector lines.
   - Interactive layer highlighting (all 7 layers) with glowing borders and dimmed inactive components.
   - Clickable SVG nodes opening detailed component dossiers.
   - Automated walkthrough tour with Play/Pause, Next/Prev, and Reset controls.
   - Real-time search filter for instant component lookup.
   - Dedicated tabbed deep dives for the 9 Autonomous Agents, 3 Viva Answers, Benchmark Matrix, and Governance Caveats.
3. **`PROMPT_AND_SPECIFICATION.md`** (This Document):
   - Comprehensive master specification, rubric mapping, architecture breakdown, complete slide transcripts with speaker notes, work diary reconciliation, and viva defense guide.
