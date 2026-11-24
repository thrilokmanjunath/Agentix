# Agentix — Product Overview & Institutional Intelligence

**Document Version: 2.4.0**  
**Product Name: Agentix**  
**Classification: Evidence-Based Architectural & Functional Blueprint**

---

## 1. What is Agentix?

**Agentix** is an enterprise-grade, air-gapped, autonomous Data Science and AI Intelligence platform designed for institutions that handle confidential, mission-critical datasets. It merges automated machine learning (AutoML), explainable AI (SHAP), structured tabular profiling, and governed local generative conversational agents into a unified, privacy-first SaaS platform.

Unlike generic consumer chatbots or public cloud AI tools that transmit proprietary records over the internet, Agentix operates on a **Zero-Data-Egress principle**. High-volume datasets—such as hospital patient cohorts, banking transactions, higher education student retention metrics, or internal corporate telemetry—are ingested, cleaned, engineered, modeled, and queried entirely on institutional infrastructure.

---

## 2. The Core Problem Agentix Solves

Institutions face three fundamental roadblocks when attempting to operationalize modern AI and data science:

1. **The Compliance and Privacy Wall:**  
   Regulated industries (HIPAA in healthcare, GDPR/SOC2 in enterprise SaaS, FERPA in education, SEC/FINRA in finance) strictly prohibit uploading unredacted sensitive datasets to commercial cloud LLMs (OpenAI, Anthropic, Google Cloud).
2. **The Data Science Bottleneck:**  
   Manual data wrangling—handling missing values, calculating skewness, encoding high-cardinality categorical features, balancing classes, cross-validating models, and extracting causal drivers—consumes 80% of data science team cycles.
3. **The Black-Box Hallucination Dilemma:**  
   Standard conversational LLMs hallucinate statistics, guess values when data is absent, and lack grounding in deterministic mathematical models. Furthermore, traditional ML models (random forests, neural nets) fail to communicate their causal decision logic to non-technical executive stakeholders.

**How Agentix Solves This:**  
Agentix bridges the gap by running an autonomous **9-Stage Analytical Pipeline** backed by scikit-learn, Polars, and Parquet that performs deterministic statistical imputation, held-out model training, and SHAP explainability. It then couples this pipeline with an **8-Layer AI Security Stack** and local hardware inference (Ollama running on Apple Silicon / CUDA), providing human-in-the-loop conversational querying where every analytical answer is factually grounded in verifiable pipeline outputs.

---

## 3. Who Are the Intended Users?

Agentix is engineered with a role-based operational matrix ([rbac.py](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend/core/auth/rbac.py)):

| Role | Target Persona | Primary Workflow | Key Value Realized |
| :--- | :--- | :--- | :--- |
| **Admin** | Chief Information Security Officer (CISO), IT Director | Governs tenant quotas, prompt templates, tool sandboxing, audit trails, and user permissions. | 100% data sovereignty, Zero-trust multi-tenancy, complete auditability. |
| **Data Scientist** | Senior ML Engineers, Quantitative Analysts | Inspects feature engineering, adjusts target variables, trains models, evaluates test metrics (R², RMSE, F1), reviews SHAP plots. | Automates boilerplate ETL and baseline model discovery in seconds. |
| **Analyst** | Business Intelligence Analysts, Financial Officers | Queries datasets using natural language in the Agent Console, views EDA distributions, exports reports. | Eliminates reliance on complex SQL queries; gets grounded statistical answers instantly. |
| **Viewer** | Institutional Executives, Department Heads | Accesses read-only dashboard KPIs, visualizes macro health metrics, downloads executive briefings. | Instant visibility into organizational KPIs without risking data corruption. |

---

## 4. Key Differentiators: Agentix vs Generic AI Chatbots

| Evaluation Vector | Generic AI Chatbot (e.g. ChatGPT, Claude.ai) | Agentix Enterprise Platform |
| :--- | :--- | :--- |
| **Data Privacy & Ingress** | Transmits raw queries and documents to public multi-tenant cloud APIs. | **Air-gapped local inference**; zero egress beyond institutional boundaries. |
| **Tabular Data Processing** | Treats CSVs as raw text tokens; struggles with high-dimensional data; hallucinated counts. | Ingests into **columnar Parquet** files; processes via high-performance vectorized engines. |
| **Statistical Rigor** | Approximates arithmetic; cannot cross-validate or fit actual ML regressors. | Fits actual scikit-learn models (`SGDRegressor`, `SGDClassifier`) on held-out splits. |
| **Explainable AI (XAI)** | Generates plausible-sounding but unverifiable narratives. | Computes authentic mathematical feature weights and SHAP attribution values. |
| **Tool Governance** | Generic unvalidated function calls. | **MCP JSON-RPC 2.0 Governance** with strict risk tiers (`READ_ONLY`, `MUTATING`, `DESTRUCTIVE`). |
| **Inference Cost & Latency** | Charges per-token API fees; variable cloud latency (1–5 seconds). | **Free local execution**; thread-safe SHA-256 exact cache returns in **< 5 ms**. |
| **Guardrails & PII** | Basic cloud moderation filters. | **Dual-stage regex & base64 jailbreak neutralization** + bidirectional PII redaction. |

---

## 5. Architectural Distinctions: SaaS, Multi-Tenancy, Fine-Tuning & RAG

To avoid common industry misconceptions, Agentix maintains precise technical boundaries between its architectural concepts:

```
+----------------------------------------------------------------------------------------------------+
|                                    AGENTIX SYSTEM CLASSIFICATION                                   |
+------------------------------------+---------------------------------------------------------------+
| ARCHITECTURAL CONCEPT              | ACTUAL AGENTIX IMPLEMENTATION                                 |
+------------------------------------+---------------------------------------------------------------+
| Shared SaaS Infrastructure         | Single deployed Next.js frontend & FastAPI backend serving     |
|                                    | multiple organizations with shared compute resources.          |
+------------------------------------+---------------------------------------------------------------+
| Multi-Tenant Architecture          | Strict logical isolation: all database rows, vector indexes,   |
|                                    | rate-limit buckets, and cache keys are segregated by tenant_id.|
+------------------------------------+---------------------------------------------------------------+
| Institution-Specific Configuration | Per-tenant customizable system prompt policies, rate quotas,   |
|                                    | and domain terminology enclaves injected at runtime.          |
+------------------------------------+---------------------------------------------------------------+
| Custom Model Training              | Scikit-learn tabular ML algorithms (SGD, Linear, Forest)       |
|                                    | trained specifically on the institution's uploaded CSV data.   |
+------------------------------------+---------------------------------------------------------------+
| LLM Fine-Tuning                    | NOT performed automatically upon document upload. LLM weights |
|                                    | remain static (e.g. researcher-m4, qwen2.5) to avoid catastrophic|
|                                    | forgetting and cross-tenant data memorization.                 |
+------------------------------------+---------------------------------------------------------------+
| Retrieval-Augmented Gen (RAG)      | Semantic retrieval of relevant tabular schema, EDA, and stats  |
|                                    | injected into delimited prompt blocks (<dataset_context>).     |
+------------------------------------+---------------------------------------------------------------+
| Model Inference                    | Execution of local GGUF/Ollama model weights on institutional  |
|                                    | hardware (Apple Silicon unified RAM / Nvidia VRAM).           |
+------------------------------------+---------------------------------------------------------------+
```

---

## 6. Illustrative Institutional Case Study: University Retention & Financial Aid

*Note: The following scenario illustrates how an institution utilizes Agentix's implemented capabilities on realistic organizational data.*

### Context:
A large state university with 35,000 enrolled students aims to identify early-warning indicators of student attrition before the end of the academic year, while complying with federal student privacy regulations (FERPA).

### Institutional Workflow in Agentix:
1. **Data Ingestion ([routes_data.py](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend/core/api/v1/routes_data.py)):**  
   The university registrar uploads `student_cohort_2025.csv` (42,000 rows, 28 attributes: GPA, credit completion ratio, financial aid status, distance from campus, first-generation flag, student ID, SSN, and retention status).
2. **Ingress PII Redaction ([engine.py](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend/core/guardrails/engine.py)):**  
   Agentix's Layer 6 guardrail scans the tabular stream, immediately identifying and redacting Student SSNs (`[REDACTED_SSN]`) and institutional email addresses before persisting the raw data to disk.
3. **Automated Cleaning & Skew Handling ([pipeline_agents.py](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend/core/agents/pipeline_agents.py)):**  
   - The `CleaningAgent` analyzes the distribution of `family_income` (skewness = 2.14, exceeding the 0.5 threshold) and imputes missing values using the median ($48,200) rather than the mean to prevent outlier distortion.
   - Categorical missing values in `residence_type` are imputed using the mode (`"On-Campus"`).
4. **Feature Engineering & Target Lock:**  
   - `ParserAgent` stably locks `retained_next_term` as the ground-truth prediction target.
   - `FeatureEngineeringAgent` detects `high_school_district` has 142 unique categories (> 50 cap) and frequency-encodes it into a single normalized numeric column, while `financial_aid_tier` (3 categories) is one-hot encoded.
5. **AutoML Training & Evaluation:**  
   - `TrainingAgent` detects `retained_next_term` is binary (0 or 1), fits an `SGDClassifier(loss='log_loss')` on scaled features (`StandardScaler`), and evaluates on an 80/20 held-out split.
   - `EvaluationAgent` yields 88.4% Accuracy and a 0.862 weighted F1-score.
6. **Explainability & Institutional Querying ([agent-console](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/frontend/src/app/(app)/agent-console/page.tsx)):**  
   The Dean of Academic Affairs opens the Agent Console and asks:  
   *"What are the primary drivers of student attrition for first-generation students, and how does financial aid mitigate this?"*  
   - Agentix's `DynamicModelRouter` classifies this as `REASONING` and selects `researcher-m4:latest`.
   - The query hits the `PromptRegistry`, retrieving verified pipeline feature coefficients (identifying `credit_completion_ratio` at weight 0.42 and `unmet_financial_need` at weight -0.38 as top drivers).
   - The response is generated locally in 1.4 seconds with a **0.952 Faithfulness Score** verified by `AIEvaluator`.
