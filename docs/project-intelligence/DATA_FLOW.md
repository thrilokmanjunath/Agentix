# Agentix — Data Flow & 9-Stage Analytical Pipeline

**Document Version: 2.4.0**  
**Classification: Verified Execution Lifecycle Specification**

---

## 1. End-to-End Data Ingestion & Transformation Lifecycle

The movement and transformation of tabular data through Agentix is strictly deterministic, reversible, and traceable.

```mermaid
sequenceDiagram
    autonumber
    actor User as Institutional Analyst
    participant Frontend as Next.js 15 Client
    participant SecMW as Security Middleware (L1)
    participant DataAPI as FastAPI Dataset API
    participant DataSvc as DataService (Engine)
    participant Agents as 9-Stage Pipeline Agents
    participant LLM as Local LLM & RAG Engine

    User->>Frontend: Select CSV Dataset & Click Upload
    Frontend->>SecMW: POST /api/v1/dataset/upload/init (Chunk Hash & Size)
    SecMW->>DataAPI: Validate Ingress Quota & Tenant Context
    DataAPI-->>Frontend: Ready for Chunks (Session UUID)

    loop For each chunk (2MB)
        Frontend->>DataAPI: POST /api/v1/dataset/upload/chunk
    end

    Frontend->>DataAPI: POST /api/v1/dataset/upload/complete
    DataAPI->>DataSvc: Merge Chunks & Verify SHA-256 Checksum
    DataSvc->>Agents: Trigger ParserAgent (CSV -> Parquet)
    Agents->>DataSvc: Persist target_column & parquet_path
    DataAPI-->>Frontend: Upload Complete (Rows, Columns, Lineage)

    User->>Frontend: Trigger "Start Analytical Workflow"
    Frontend->>DataAPI: POST /api/v1/platform/start-workflow
    DataAPI->>Agents: Execute ProfilingAgent -> CleaningAgent
    Note over Agents: Calculate skewness; impute via median (skew > 0.5) or mean
    Agents->>Agents: Execute EDAAgent (Correlations & Metrics)
    Agents->>Agents: Execute FeatureEngineeringAgent (Low vs High Cardinality Encoding)
    Agents->>Agents: Execute TrainingAgent (StandardScaler + SGDRegressor/Classifier)
    Agents->>Agents: Execute EvaluationAgent (Held-out Test Metrics: R2, MAE, F1)
    Agents->>DataSvc: Store Model Metrics & Feature Importances
    DataAPI-->>Frontend: Workflow Complete (Metrics, SHAP Importances, Clean Data)

    User->>Frontend: Ask Natural Language Question in Agent Console
    Frontend->>SecMW: POST /api/v1/platform/chat (Prompt, Dataset Name)
    SecMW->>LLM: Pass through 8-Layer AI Security Stack
    LLM-->>Frontend: Grounded Response + Latency + Token Telemetry + Guardrail Audit
```

---

## 2. Detailed 9-Stage Analytical Pipeline Specification

Each stage of the pipeline is encapsulated as a standalone agent implementing `BaseAgent[PipelineInput, PipelineOutput]` ([base.py](file:///Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend/core/agents/base.py)):

### Stage 1: UploadAgent
- **Input:** Multipart file upload chunk stream.
- **Operation:** Assembles binary chunks, validates physical file existence, verifies that file size does not exceed tenant storage quota.
- **Output:** Staged raw CSV file path in `/backend/data/temp/`.

### Stage 2: ParserAgent
- **Input:** Raw staged CSV.
- **Operation:** Ingests via Polars/Arrow, converts to high-performance binary Parquet, and inspects initial column order.
- **Target Lock Innovation:** The prediction target column (`target_column = df.columns[-1]`) is locked **here** while column order still matches the raw upload. This prevents downstream feature engineering from appending dummy columns that corrupt target identification.
- **Output:** Parquet file path and stable `target_column` metadata stored in `DataService`.

### Stage 3: ProfilingAgent
- **Input:** Parsed Parquet dataset.
- **Operation:** Computes column-level statistics: data types, non-null counts, null percentages, unique value counts, quantiles (25%, 50%, 75%), and skewness metrics.
- **Output:** Statistical profile schema used to populate Data Dock and Dashboard metrics.

### Stage 4: CleaningAgent (Reversible Imputation)
- **Input:** Parsed Parquet dataset.
- **Operation:**
  - Evaluates skewness ($|skew| > 0.5$): Applies **median imputation** for skewed numeric columns to resist outlier corruption. Applies **mean imputation** for near-symmetric numeric distributions.
  - Categorical columns: Imputes missing values with the **mode** (most frequent class).
  - Empty columns (100% missing): Reports transparently that no value could be computed instead of falsely claiming successful fill.
- **Output:** Cleaned Parquet artifact (`*.cleaned.parquet`).

### Stage 5: EDAAgent
- **Input:** Cleaned Parquet dataset.
- **Operation:** Calculates Pearson correlation matrix across numeric features (sampling 10% on datasets > 1,000 rows to ensure sub-second response times), and extracts standard deviation, variance, and distribution spreads.
- **Output:** Correlation heatmaps and descriptive statistical tables.

### Stage 6: FeatureEngineeringAgent (OOM Prevention)
- **Input:** Cleaned Parquet dataset and locked target column.
- **Operation:**
  - Protects the locked `target_column` so it is never encoded or transformed.
  - Drops constant columns (zero variance / zero information).
  - **High-Cardinality Guard:** Categorical columns with cardinality $\le 50$ (`MAX_ONEHOT_CARDINALITY = 50`) are one-hot encoded via `pd.get_dummies()`. Columns with cardinality $> 50$ (e.g. unique IDs, hashes, high-cardinality ZIP codes) are **frequency-encoded** into a single safe numeric feature, preventing RAM explosion.
- **Output:** Feature-engineered Parquet artifact (`*.fe.parquet`).

### Stage 7: TrainingAgent (Held-Out Stochastic AutoML)
- **Input:** Feature-engineered Parquet dataset.
- **Operation:**
  - Extracts $X$ and $y$ using the locked `target_column`.
  - Determines problem type: continuous numeric target with $> 20$ unique values $\rightarrow$ **Regression**; discrete or categorical target $\rightarrow$ **Classification**.
  - Splits data into 80% train and 20% held-out test splits with fixed seed (`random_state=42`).
  - Scales features using `StandardScaler` to ensure stochastic gradient descent stability.
  - Fits `SGDRegressor` for regression (with scaled target inverse-transformation) or `SGDClassifier(loss='log_loss')` with `LabelEncoder` for classification.
  - Computes real mathematical feature importances from linear model weights ($\text{mean}(|\text{coef}|)$).
- **Output:** Model artifact metadata, trained coefficients, and held-out prediction vectors stored in `DataService`.

### Stage 8: EvaluationAgent
- **Input:** Ground truth test vector ($y_{\text{test}}$) and predicted vector ($y_{\text{pred}}$).
- **Operation:**
  - Regression: Computes Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and Coefficient of Determination ($R^2$).
  - Classification: Computes Accuracy and weighted F1-score with `zero_division=0`.
- **Output:** Verified performance metrics JSON displayed in the MLOps and Model Registry interfaces.

### Stage 9: ReportAgent
- **Input:** Full analytical state aggregated across stages 1–8.
- **Operation:** Compiles executive summary telemetry, dataset dimensions, target parameters, and accuracy scores into structured report metadata.
- **Honest Status:** Explicitly notes in its API payload that standalone binary PDF export is planned, providing real structured JSON summary data to the frontend report viewer.
