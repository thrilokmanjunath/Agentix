# AGENTIX: LIVE DEMONSTRATION STRATEGY & EVALUATION CHECKLIST

**Academic Programme:** M.Sc. Data Science Continuous Internal Assessment (CIA)  
**Evaluator Target Marks:** 15 Marks (Demonstration)  
**Presenter:** Thrilok M (Register No. 2548430)  
**Primary Live Target:** `https://agentix-bay.vercel.app` (Cloud Production)  
**Fallback Live Target:** `http://localhost:3000` + `http://127.0.0.1:8000` (Local Workstation)  

---

## 1. Golden Path Demonstration Overview

The demonstration follows a strictly verified **8-Step Golden Path** that proves the complete end-to-end data intelligence lifecycle within **5 to 7 minutes**:

```
[ Step 1: Launch & Warm Alabaster ] ──> [ Step 2: Secure Institutional Login ]
                  │
                  ▼
[ Step 3: Chunked Data Ingestion ]   ──> [ Step 4: Live 9-Stage Pipeline ]
                  │
                  ▼
[ Step 5: Correlation EDA Analysis]  ──> [ Step 6: 32-Algorithm Model Leaderboard ]
                  │
                  ▼
[ Step 7: 3-Tier Explainable AI ]    ──> [ Step 8: Grounded Conversational AI ]
```

---

## 2. Step-by-Step Demonstration Sequence

| Step # | Action to Perform | UI Screen / Route | Expected System Output | Module Demonstrated | Proof / Technical Evidence | Failure Contingency |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Open application in browser | `/login` | High-polish Warm Alabaster interface; zero client-side exceptions; system health indicator green. | Next.js 15 App Shell | Verified in Playwright; zero console errors. | If internet is down, switch to `http://localhost:3000`. |
| **2** | Enter credentials & sign in | `/login` $\rightarrow$ `/dashboard` | `admin@agentix.com` / `admin123`. Redirects to `/dashboard`; renders "Enterprise Admin" badge. | Auth.js v5 + BFF Token Relay | NextAuth session cookie + FastAPI JWT token. | If slow, wait 3 seconds; token auto-provisions backend user. |
| **3** | Navigate to Data Dock & upload CSV | `/data-dock` | Drag & drop `examples/datasets/clinical_oncology_biomarkers.csv`. 2MB chunk progress bar advances to 100%. | `FormatDetector`, Chunked Upload | `/api/v1/dataset/upload/chunk` returns HTTP 200. | Use small test CSV (<10MB) for instantaneous chunking. |
| **4** | Observe real-time pipeline execution | `/data-dock` / `/dashboard` | 9 stages advance: `UploadAgent` (11%) $\rightarrow$ `Parser` $\rightarrow$ `Cleaning` $\rightarrow$ `Training` (66%) $\rightarrow$ `Complete` (100%). | `PipelineOrchestrator`, 9 Agents | `/api/v1/jobs/{id}` polls job status; real background worker. | If Render cold-start delays, show pre-completed job in History. |
| **5** | Inspect Exploratory Analysis & EDA | `/eda` | Full Pearson correlation matrix renders with color intensity; numerical distributions and skewness stats shown. | `EDAAgent` | Computed Pearson correlation matrix in JSON state. | Page loads from cached Parquet file immediately. |
| **6** | Inspect AutoML Model Leaderboard | `/model-studio` / `/algorithms` | 32 algorithms cataloged; benchmark leaderboard displays winning model (`HistGradientBoosting` or `LightGBM`) with Accuracy, F1, ROC-AUC. | `AlgorithmRegistry`, `AutoMLEngine` | Scikit-learn & LightGBM model fit on held-out split. | Show `AUDIT/ALGORITHM_BENCHMARK_REPORT.md` if offline. |
| **7** | View Explainable AI (XAI) Attributions | `/insights` | Feature attribution bars display primary drivers; click "Run AutoML & Extract Feature Attributions" if needed. | 3-Tier XAI Engine (SHAP / Surrogate) | Tree feature importances & surrogate decision tree. | Fallback Tier 3 automatically computes target correlation. |
| **8** | Query Grounded AI Assistant | `/agent-console` | Ask: *"What are the primary drivers of churn in this dataset?"* Response arrives with grounded statistics citing pipeline metrics. | `GuardrailEngine`, Local Ollama / Gemini | Prompt injected into `<dataset_context>`; zero hallucination. | If Ollama daemon is offline, platform honestly states model disconnected. |

---

## 3. Minimum Viable Demonstration Path (The 2-Minute Emergency Flow)

If time is constrained by evaluators to under 3 minutes:
1. **Show Login & Session (30s):** Log in as `admin@agentix.com`, open user profile menu showing active JWT session claims.
2. **Show Processed Pipeline in Dashboard (45s):** Open `/dashboard`, show active dataset `churn_30_production.csv` with 9 stages marked 100% completed.
3. **Show Model Leaderboard & XAI (45s):** Open `/model-studio` and `/insights`, showing the winning LightGBM classifier with 66.7% accuracy and feature attribution ranking.

---

## 4. STRICT CONTINGENCY: What NOT to Click or Promise

To protect the evaluation score, adhere strictly to these operational rules:

| Feature / UI Button | Current Technical Status | Reason to Avoid Live During Viva | Recommended Handling if Asked |
| :--- | :--- | :--- | :--- |
| **"Download PDF Report"** | **Partial** (`"pdf_available": false`) | Direct binary PDF compilation is not implemented; returns JSON summary. | *"Our ReportAgent compiles full structured JSON data for interactive web viewing; binary PDF compilation is scheduled for our next release."* |
| **"Dataset Version Rollback"** | **Not Implemented** (HTTP 501) | Delta Lake ACID snapshotting is in future roadmap. | *"Agentix maintains the latest transformed state; time-travel rollbacks are documented as future work."* |
| **Massive 500MB Upload on Free Tier** | **Hardware Constrained** | Render free tier has 512MB RAM ceiling; uploading >150MB live may trigger container OOM. | *"We benchmarked 500MB locally achieving 332 MB/s (documented in AUDIT/500MB_BENCHMARK_REPORT.md); our live cloud demo uses optimized 10MB–20MB datasets to respect free-tier memory ceilings."* |

---

## 5. Live Local Backup Execution Commands

If cloud connectivity or Render sleep latency interrupts the evaluation, execute this dual-terminal local backup in under 15 seconds:

```bash
# TERMINAL 1: Launch Local FastAPI Backend
cd backend
source .venv/bin/activate
PYTHONPATH=. python3 -m uvicorn core.main:app --host 127.0.0.1 --port 8000

# TERMINAL 2: Launch Local Next.js Frontend
cd frontend
npm run dev
# Browser opens at http://localhost:3000
```
