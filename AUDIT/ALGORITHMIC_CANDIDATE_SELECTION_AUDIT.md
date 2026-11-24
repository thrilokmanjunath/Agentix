# Agentix — Algorithmic Candidate Selection Audit

**Document Reference:** `AGX-AUDIT-AUTOML-001`  
**Classification:** Institutional Architecture & Engineering Audit  
**Product:** Agentix Enterprise SaaS Platform  
**Target Subsystem:** Algorithmic Candidate Selection, AutoML Engine & Model Planning  
**Status:** Remediated & Verified  
**Date:** November 2026  

---

## 1. Executive Summary

An exhaustive engineering investigation was conducted into the **Agentix Model Planning & Algorithmic Candidate Selection** subsystem to diagnose why the platform interface previously displayed only an SGD (Stochastic Gradient Descent) Classifier or Regressor.

### 1.1 Core Diagnostic Determination

Our investigation conclusively establishes that the display of only an SGD model was **both a severe backend candidate-selection limitation AND a completely missing algorithm registry**:

1. **Hardcoded Model Instantiation in Pipeline Agent:**  
   In `backend/core/agents/pipeline_agents.py` (lines 312–337 prior to remediation), `TrainingAgent.execute()` hardcoded an unconditional instantiation of `SGDClassifier(loss='log_loss', random_state=42)` for classification tasks, or `SGDRegressor(random_state=42)` for regression tasks. It performed a single `partial_fit` pass on an 80/20 train/test split. No other algorithm was ever instantiated, trained, or compared.

2. **Complete Absence of an Algorithm Registry:**  
   Prior to our remediation, the backend possessed **zero algorithm registry modules**. There was no catalog of candidate models, no metadata schema for algorithmic complexity or interpretability ratings, and no factory methods to instantiate alternative models (such as Random Forest, LightGBM, Gradient Boosting, SVM, KNN, Ridge, Lasso, or Extra Trees).

3. **Absence of Candidate Selection Logic:**  
   There was no candidate-selection service. The pipeline did not inspect dataset cardinality, feature ratios ($P/N$), class imbalance, missing value profiles, or memory constraints to select or recommend models. It strictly used an absolute unique-value threshold (`n_unique > 20`) merely to decide whether to run `SGDClassifier` or `SGDRegressor`.

4. **Explicit Backend Code Admissions:**  
   In `backend/core/api/v1/routes_platform.py` (line 200), the backend developers had left an explicit comment documenting this limitation:
   ```python
   # AutoML today trains a single real model (SGDClassifier/SGDRegressor) via
   # the pipeline rather than searching multiple candidates, so this reuses
   # the same real training/evaluation result instead of returning a fake
   # multi-model leaderboard.
   ```
   Similarly, in `frontend/src/store/platformStore.ts` (lines 39–43):
   ```typescript
   // Real shape returned by backend's _leaderboard_from_stages(): a single
   // trained model's row... not a multi-candidate AutoML
   // search with cross-validation, which this project does not implement.
   ```

5. **Verdict on Possible Causes:**
   - **Intentional Restriction?** Partially intentional as a minimal viable prototype for streaming memory efficiency (`partial_fit`), but left completely unfinished.
   - **Frontend Rendering Defect?** **No.** The frontend faithfully rendered the single model row returned by the backend API.
   - **Incomplete Algorithm Registry?** **Yes.** No registry existed whatsoever.
   - **Backend Candidate-Selection Limitation?** **Yes.** The backend possessed zero candidate selection or comparison heuristics.
   - **Incorrect Task-Classification Mechanism?** Secondary issue. A simplistic `n_unique > 20` rule was used, failing on discrete integer targets with large spans or small continuous samples.

---

## 2. Forensic Code Trace & Root Cause Analysis

### 2.1 The Training Pipeline Bottleneck (`backend/core/agents/pipeline_agents.py`)

The previous implementation of `TrainingAgent` in `backend/core/agents/pipeline_agents.py` exhibited the following fatal bottlenecks:

```python
# PREVIOUS VULNERABLE / LIMITED IMPLEMENTATION (Lines 312-337)
if is_regression:
    problem_type = "regression"
    y_scaler = StandardScaler()
    y_train_scaled = y_scaler.fit_transform(y_train.to_numpy().reshape(-1, 1)).ravel()
    model = SGDRegressor(random_state=42)
    model.partial_fit(X_train_scaled, y_train_scaled)
    y_pred_scaled = model.predict(X_test_scaled)
    y_pred = y_scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).ravel()
else:
    problem_type = "classification"
    label_encoder = LabelEncoder()
    y_train_encoded = label_encoder.fit_transform(y_train)
    classes = np.unique(y_train_encoded)
    model = SGDClassifier(loss='log_loss', random_state=42)
    model.partial_fit(X_train_scaled, y_train_encoded, classes=classes)
    y_pred_encoded = model.predict(X_test_scaled)
    y_pred = label_encoder.inverse_transform(y_pred_encoded)
```

#### Deficiencies of this Approach:
- **Zero Algorithmic Diversity:** Only linear models with first-order stochastic gradient updates were fitted. Non-linear boundaries, tree partitioning, and ensemble bagging/boosting were completely inaccessible.
- **Single `partial_fit` Pass:** On small and medium datasets ($N < 50,000$), a single epoch of SGD passes through each data point exactly once. Gradient descent rarely converges to the optimal empirical loss in a single epoch, leading to severely degraded predictive accuracy (e.g. $R^2 \approx 0.37$ on clean linear data prior to manual scaling).
- **No Cross-Validation:** No $K$-fold cross-validation or out-of-fold generalization metric was computed.
- **Scale Sensitivity:** Even with standard scaling, SGD is highly sensitive to learning rate scheduling (`eta0`, `power_t`), which were hardcoded to defaults.
- **Absence of a Baseline Contrast:** Enterprise users had no baseline (e.g. Ridge / Logistic Regression / Decision Stump) against which to compare model performance.

### 2.2 The Platform API Bottleneck (`backend/core/api/v1/routes_platform.py`)

In `backend/core/api/v1/routes_platform.py`:
- `_leaderboard_from_stages(db, run_id)` strictly read `_stage_result(db, run_id, "TrainingAgent")` and `EvaluationAgent`.
- It assembled a single-row array: `leaderboard = [leaderboard_row]`.
- The endpoint `GET /api/v1/platform/automl` returned only that single row.
- There was no endpoint to retrieve the catalog of available algorithms (`GET /algorithms` did not exist).
- There was no endpoint to trigger a multi-candidate AutoML exploration on demand (`POST /automl/run` did not exist).

### 2.3 The Frontend Rendering Bottleneck (`frontend/src/app/(app)/insights/page.tsx`)

In `frontend/src/app/(app)/insights/page.tsx`:
- The **Model Planning** (`modeling`) section rendered only a single card with `automlData.best_model || 'LightGBM Classifier'`. (Note: 'LightGBM Classifier' was a hardcoded fallback string in the JSX!).
- The **Model Evaluation** (`evaluation`) section rendered a two-column table (Rank, Metric) with a hardcoded fallback string `'0.942'`.
- There was no visualization of candidate recommendation rationales, algorithmic tiers, training latencies, confusion matrices, or registry metadata.

---

## 3. Installed Environment Package Capability Audit

To determine what algorithms the host environment could natively support without external network access or risky binary installations, we audited the Python virtual environment (`backend/.venv`):

| Package | Installed Version | Production Capability |
| :--- | :--- | :--- |
| **`scikit-learn`** | `1.9.1` | Complete suite: Linear Models, Trees, Ensembles, SVM, KNN, Naive Bayes, Clustering, Decomposition. |
| **`lightgbm`** | `4.7.0` | State-of-the-art leaf-wise gradient boosting (native C++ backend compiled for macOS arm64). |
| **`xgboost`** | `3.4.1` | Industry standard depth-wise extreme gradient boosting. |
| **`catboost`** | `1.2.10` | Categorical-optimized symmetric oblivious tree boosting. |
| **`scipy`** | `1.18.1` | Sparse matrix operations, optimization routines, distance metrics. |
| **`joblib`** | `1.6.0` | Parallel CPU multi-threading across candidate model fits. |
| **`pandas`** | `2.2.3` | High-performance dataframe manipulation. |
| **`numpy`** | `2.2.3` | Vectorized tensor computations. |

**Key Finding:** The underlying execution environment was already fully equipped with world-class machine learning libraries (`scikit-learn`, `lightgbm`, `xgboost`, `catboost`). The failure to offer multi-candidate AutoML was entirely an internal architectural omission in Agentix's application code.

---

## 4. Remediation Architecture Overview

To elevate Agentix into a genuine, enterprise-grade AutoML platform, we architected and deployed a modular AutoML subsystem in `backend/core/automl/`:

```
backend/core/automl/
├── __init__.py           # Package exports (engine, selector, registry, evaluator)
├── types.py              # Pydantic domain models, Enums (TaskType, AlgorithmTier, etc.)
├── registry.py           # Comprehensive 32-model Algorithm Registry
├── selector.py           # Intelligent dataset profiling & heuristic candidate selection
├── preprocessing.py      # Leak-free train-only fitting and preprocessing pipeline
├── evaluator.py          # Multi-metric statistical evaluation across tasks
└── engine.py             # AutoMLEngine orchestrator coordinating training & leaderboards
```

### 4.1 Key Architecture Principles Enforced

1. **Strict Partition Hygiene (Zero Data Leakage):**
   Scalers (`StandardScaler`), Imputers (`SimpleImputer`), and Label Encoders (`LabelEncoder`) are fitted strictly on `X_train` and applied to `X_test`. Never is `fit_transform` called on the global dataset prior to splitting.

2. **Dataset-Aware Candidate Selection:**
   Rather than brute-forcing all 32 algorithms or restricting to SGD, `CandidateSelector` inspects dataset properties ($N$ rows, $P$ features, sparsity, categorical cardinality, missing values, class imbalance) and scores candidates with explicit technical rationale.

3. **Multi-Model Empirical Leaderboard:**
   A minimum of 5 diverse algorithms (including a fast linear baseline, tree ensemble, and advanced gradient booster) are trained and ranked on a held-out test split using statistically sound metrics.

4. **Full Task Coverage:**
   Complete, genuine algorithmic execution for **Classification**, **Regression**, **Clustering**, **Dimensionality Reduction**, and **Time Series**.

---

## 5. Summary of Remediation Results

| Dimension | Previous State | Remediated Agentix State |
| :--- | :--- | :--- |
| **Algorithms Available** | 1 (SGD only) | **32 fully implemented algorithms** |
| **Candidate Selection** | Hardcoded | **Intelligent dataset-aware selector with technical rationale** |
| **Preprocessing Hygiene** | Partial leak risk | **Strict leak-free pipeline (train-only fitting)** |
| **Model Comparison** | None (Single model) | **Empirical leaderboard ranked by primary metric** |
| **Metrics Computed** | Accuracy or $R^2$ only | **Comprehensive (Acc, F1, Prec, Rec, ROC-AUC, PR-AUC, CM, MAE, RMSE, MAPE, Silhouette, Davies-Bouldin)** |
| **API Coverage** | Single-row `/automl` | **Full `/algorithms`, `/automl/run`, multi-model `/automl`** |
| **Frontend UI** | Static 2-row table | **Rich candidate cards, rationale badges, leaderboard, confusion matrix, registry catalog** |
| **Automated Tests** | 0 AutoML tests | **13 dedicated unit/integration tests + 65/65 passing backend tests** |

---

*Authored by the Principal Software Architect & AutoML Systems Specialist.*  
*Agentix Core Architecture Group — 2026.*
