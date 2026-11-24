# FEATURE COMPATIBILITY MATRIX: WEB VS. NATIVE DESKTOP
**Platform:** Agentix Universal AI & Data Science Platform  
**Target Matrix:** Deployed Cloud Web, macOS Native Desktop, Windows Native Desktop, and Offline (Air-Gapped)

---

## 1. Feature Parity & Environment Support Matrix

| Category | Capability / Feature | Web App (Cloud Deployed) | Native Desktop (macOS) | Native Desktop (Windows) | Fully Offline / Air-Gapped | Notes & Implementation Details |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Ingestion** | Multi-Format Upload (.csv, .xlsx, .json, .parquet) | **Supported** | **Supported** | **Supported** | **Supported** | Ingestion handled via `FormatDetector` and `ChunkedPandasEngine`. |
| **Ingestion** | Native OS Drag-and-Drop | Supported (HTML5) | **Native OS** | **Native OS** | **Supported** | Native OS file drop directly into Tauri webview. |
| **Ingestion** | High-Volume Streaming (500MB+ Ingestion) | Supported (HTTP/2) | **Accelerated** | **Accelerated** | **Supported** | Zero network egress on desktop; direct streaming from local SSD. |
| **Preprocessing** | Streaming Statistical Profiling (<2.8MB RAM) | **Supported** | **Supported** | **Supported** | **Supported** | `ProfilingAgent` single-pass chunked iterator. |
| **Preprocessing** | Deterministic Imputation & Outlier Truncation | **Supported** | **Supported** | **Supported** | **Supported** | `CleaningAgent` IQR outlier capping ($1.5 \times \text{IQR}$). |
| **Analysis** | Pearson & Spearman Correlation Matrices | **Supported** | **Supported** | **Supported** | **Supported** | `EDAAgent` with VIF collinearity calculation. |
| **AutoML** | 32 Algorithm Model Registry | **Supported** | **Supported** | **Supported** | **Supported** | Full scikit-learn, XGBoost, LightGBM, CatBoost algorithms. |
| **AutoML** | 5-Fold Stratified Cross-Validation | **Supported** | **Supported** | **Supported** | **Supported** | Multi-threaded CPU execution via Joblib. |
| **AutoML** | Leak-Free Preprocessing | **Supported** | **Supported** | **Supported** | **Supported** | Transformers fit exclusively on training folds. |
| **Explainability** | 3-Tier XAI Fallback (TreeSHAP -> Surrogate -> Corr)| **Supported** | **Supported** | **Supported** | **Supported** | 15s watchdog timer prevents SHAP deadlocks. |
| **AI Inference** | Local On-Device Ollama Inference | Via Connector | **Native Local** | **Native Local** | **Supported** | Direct connection to `http://127.0.0.1:11434` without cloud hop. |
| **AI Inference** | Hardware Acceleration (Metal / CUDA / CPU) | Cloud CPU | **Apple Metal** | **NVIDIA CUDA** | **Supported** | Native hardware execution via Ollama runtime. |
| **AI Inference** | Cloud LLM Fallback (Gemini, OpenAI, Claude) | **Supported** | Optional | Optional | *Disabled* | User can configure API keys in Settings. |
| **Governance** | Layer 6 GuardrailEngine (PII & Injection Scan) | **Supported** | **Supported** | **Supported** | **Supported** | Executed in-process prior to prompt dispatch. |
| **Performance** | Layer 7 LLMCache (Sub-5ms SHA-256 Exact-Match) | **Supported** | **Supported** | **Supported** | **Supported** | Embedded local KV cache. |
| **System** | Native OS System Tray & Menus | *N/A* | **Supported** | **Supported** | **Supported** | Powered by Tauri v2 native system APIs. |
| **System** | Background Child Process Management | *N/A* | **Supported** | **Supported** | **Supported** | Rust supervisor monitors and cleans up Python sidecar. |
| **Security** | Ephemeral Port & Session Token Binding | *N/A* | **Enforced** | **Enforced** | **Enforced** | Sidecar binds to `127.0.0.1` with `X-Agentix-Token` check. |
| **Security** | Zero Cloud Data Leaks (Air-Gapped Mode) | Cloud Hosted | **Guaranteed** | **Guaranteed** | **Guaranteed** | In offline mode, no data ever leaves the local machine. |
| **Updates** | Automatic Application Updates | Instant (Web) | **Ed25519 Signed** | **Ed25519 Signed** | *Manual* | Tauri v2 updater framework with cryptographic signatures. |

---

## 2. Platform Nuances & Compatibility Highlights

### macOS Desktop (ARM64 & x64)
- **Engine:** WebKit native webview via Apple WebKit framework.
- **Hardware Acceleration:** Native Apple Silicon Metal Unified Memory acceleration for local LLMs via Ollama.
- **Packaging:** Signed and notarizable `.dmg` containing `Agentix.app`.
- **System Requirements:** macOS 12.0 (Monterey) or later; Apple Silicon (M1/M2/M3/M4) or Intel Core i5/i7/i9.

### Windows Desktop (x64)
- **Engine:** Microsoft Edge WebView2 (Evergreen runtime, pre-installed on Windows 10/11).
- **Hardware Acceleration:** Direct NVIDIA CUDA acceleration via Ollama runtime.
- **Packaging:** NSIS Installer executable (`Agentix-Windows-x64-Setup.exe`).
- **System Requirements:** Windows 10 (Build 19041+) or Windows 11 64-bit; 8 GB RAM (16 GB recommended for local LLM inference).
