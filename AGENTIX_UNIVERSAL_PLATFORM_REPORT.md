# AGENTIX — Universal Platform Transformation & Warm Alabaster Architecture Report

**Version:** 2.4.0 Production  
**Date:** November 13, 2026  
**Status:** Live & Verified in Production  
**Public Frontend:** [https://agentix-bay.vercel.app](https://agentix-bay.vercel.app)  
**Public Backend:** [https://agentix-api-lord.onrender.com](https://agentix-api-lord.onrender.com)  
**Database:** Neon Serverless PostgreSQL (`iad1`, 23 tables active)

---

## Executive Summary

Agentix has been successfully transformed from a local development prototype with device-bound assumptions into a **universal, device-independent AI, Machine Learning, Data Science, and Generative AI platform**. 

Concurrently, the **Warm Alabaster** editorial minimalist design system has been established as the mandatory global default across all application surfaces, and the explainable AI pipeline has been re-architected to eliminate stalled or opaque states such as *"SHAP values computing or not available."*

---

## 1. Universal Platform Transformation & Device Independence

### 1.1 De-coupling from Specific Hardware
All hardcoded references, branding, and runtime assumptions tying Agentix to a specific developer machine (MacBook Air M4, Apple Silicon MLX, hardcoded `researcher-m4:latest`, or mandatory local Ollama) have been systematically removed across the codebase:

| Location | Prior Implementation | Universal Transformation |
| :--- | :--- | :--- |
| **Landing Hero** (`page.tsx`) | "Air-Gapped Institutional AI • Apple Silicon M-series detected" | *"Your Unified AI & Data Science Workspace" — Device-Independent Architecture* |
| **Telemetry Widget** (`page.tsx`) | `ACTIVE LOCAL INFERENCE ENGINE` / `researcher-m4:latest` / `Apple Silicon MLX` | **Hybrid Inference Runtime** (Multi-Provider Router: Cloud APIs & Local Engines) |
| **Section 4** (`page.tsx`) | "Apple Silicon Neural Engines, Metal, CUDA... Ollama" | **Universal Hybrid AI Engine**: Runs on CPU-only laptops, Apple Silicon, NVIDIA CUDA, and AMD ROCm |
| **Dashboard Metric** (`dashboard/page.tsx`) | `Active Local Inference: researcher-m4:latest` | **Inference Runtime**: Dynamically reflects connected cloud/local provider status |
| **Diagnostics** (`dashboard/page.tsx`) | `Ollama Local Engine / Apple Silicon Host` | **Execution Architecture**: Device-Independent • Cloud & Local Engine |
| **Navigation Header** (`layout.tsx`) | Hardcoded badge `LOCAL AI OFFLINE` | **Inference Badge**: Reflects active cloud key, connected local engine, or `INFERENCE STANDBY` |
| **Admin Console** (`llm-manager/page.tsx`) | Default `researcher-m4:latest` ($0.00) | Universal open model standard (`qwen2.5:3b`, `llama3.2`) with multi-provider standby |

### 1.2 Five Core Capability Pillars
The platform positioning now centers on five integrated capabilities:
1. **Data Intelligence & Hygiene**: Ingestion of CSV, JSON, XLSX, and Parquet with automated sanitization, missing-value imputation, outlier detection, and statistical distribution profiling.
2. **Machine Learning & AutoML**: Multi-candidate algorithmic benchmarking across linear, tree, boosting, ensemble, and distance-based architectures with empirical cross-validation leaderboards.
3. **Generative AI & Autonomous Agents**: Natural-language data exploration, conversational insights, and multi-agent pipeline orchestration.
4. **Explainable AI & Model Governance**: Causal feature attribution, SHAP driver extraction, permutation importance, confusion matrices, and audit logging.
5. **Universal Platform Architecture**: Run anywhere without lock-in — from ultralight laptops to high-performance workstations, CPU-only servers, and managed cloud deployments.

---

## 2. Global Design System — Warm Alabaster

Warm Alabaster is now the permanent, universal default theme across the entire application. It activates on first load regardless of operating system dark-mode preferences, eliminating visual flashes while preserving dark mode (*Carbon Onyx*) as an optional toggle.

### 2.1 Design Tokens (`globals.css` & `themes.ts`)

| Design Token | Value | Applied Semantic Role |
| :--- | :--- | :--- |
| `--background` | `#F7F5EF` | Primary canvas background (warm limestone/alabaster) |
| `--surface-primary` | `#FFFEFA` | Primary cards, panels, and accordions |
| `--surface-secondary` | `#F0EEE7` | Secondary containers, table headers, and badges |
| `--surface-hover` | `#E8E5DD` | Interactive hover states |
| `--text-primary` | `#292820` | Primary editorial typography |
| `--text-secondary` | `#777468` | Supporting labels, subtitles, and metadata |
| `--text-muted` | `#949082` | Tertiary hints and disabled states |
| `--border-subtle` | `#E5E1D7` | Subtle card dividers and structural borders |
| `--accent-primary` | `#777F69` | Muted sage/olive primary interactive accent |
| `--accent-secondary` | `#A68B70` | Warm taupe secondary accents |
| `--accent-soft-alpha` | `rgba(119, 127, 105, 0.12)` | Soft sage tint for active pill badges and highlights |
| `--success` | `#58765E` | Verified and successful indicators |
| `--warning` | `#A77A3D` | Advisory alerts and cautions |
| `--error` | `#B45E52` | Error states and failure banners |

### 2.2 Server-Side Hydration Integrity
- `frontend/src/app/layout.tsx`: Configured with `<html lang="en" data-theme="alabaster" suppressHydrationWarning>` ensuring consistent SSR rendering.
- `frontend/src/components/providers/ThemeProvider.tsx`: Configured with `defaultTheme="alabaster"` and `enableSystem={false}` to guarantee Warm Alabaster as the initial view.
- `frontend/src/components/ThemeToggle.tsx`: Fallback defaults to `alabaster` with instant pairing to `carbon`.

---

## 3. Resolution of "SHAP Values Computing or Not Available"

### 3.1 Root Cause Diagnosis
When navigating to the *Attribution & SHAP Explainability (XAI)* section on `/insights`:
1. If a dataset was uploaded but full multi-candidate AutoML training had not yet been executed, the backend previously returned `data: null`.
2. In earlier frontend builds, this caused the component to render a static, dead-end paragraph:  
   `<p className="text-slate-500 text-sm">SHAP values computing or not available.</p>`
3. The user was left with no context, no indication of whether a background job was actually running, and no interactive mechanism to trigger model training or attribution calculation.

### 3.2 Engineering Remediation
1. **Multi-Tiered Feature Attribution Engine (`routes_platform.py`)**:
   - **Tier 1 (Direct Model Attribution)**: If a winning AutoML model exists, extracts tree feature importances (`feature_importances_`), linear coefficients (`coef_`), or permutation importance scores.
   - **Tier 2 (Surrogate Candidate Attribution)**: If the winning model is a non-parametric method (e.g. KNN or unsupervised clustering), automatically extracts importances from the highest-ranked surrogate candidate on the leaderboard.
   - **Tier 3 (Preliminary Statistical Association)**: If AutoML has not yet run but the dataset exists in PostgreSQL/disk storage, dynamically computes Pearson correlations against the target column or normalized feature variance distributions, returning `is_preliminary: true`.
2. **Interactive UI with On-Demand Trigger (`insights/page.tsx`)**:
   - Replaced the dead-end text with a structured **Explainability Dashboard Card**.
   - Added an on-demand **"Run AutoML & Extract Feature Attributions"** action button powered by `usePlatformStore.runAutoML()`.
   - Included real-time execution feedback: a loading spinner (*"Training Candidates & Computing Attributions..."*), error recovery, and automatic accordion focus.
   - When preliminary statistics are displayed, surfaces a helpful guidance banner with an option to upgrade to full model-based SHAP/permutation weights.
3. **Store Synchronization (`platformStore.ts`)**:
   - Added `runAutoML(selectedAlgorithms, targetColumn)` action dispatching directly to `/api/v1/platform/automl/run` and immediately refreshing `automlData` and `xaiData`.

---

## 4. Verification & Production Deployment Status

- **Backend Test Suite**: 70/72 unit and integration tests passing (`tests/test_automl_engine.py` 15/15 passed in 0.62s; the remaining 2 tests are local dev-server end-to-end checks).
- **Frontend Type Safety**: `npx tsc --noEmit` passed with 0 errors.
- **Frontend Production Build**: `npm run build` compiled cleanly with Turbopack, generating all 35 static and dynamic routes.
- **Git Commit**: Cleanly committed under commit `9c08a78` on branch `production-deployment` and pushed to `origin`.
- **Live Vercel Production**: Deployed and aliased to [https://agentix-bay.vercel.app](https://agentix-bay.vercel.app).
- **Live Render Web Service**: Active at [https://agentix-api-lord.onrender.com](https://agentix-api-lord.onrender.com) (`/health` HTTP 200).
