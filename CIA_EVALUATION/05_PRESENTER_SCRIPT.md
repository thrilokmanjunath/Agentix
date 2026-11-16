# AGENTIX: COMPLETE CONTINUOUS PRESENTER SCRIPT

**Academic Programme:** M.Sc. Data Science Continuous Internal Assessment (CIA)  
**Presenter:** Thrilok M (Register No. 2548430)  
**Estimated Presentation Duration:** 12 to 14 Minutes  
**Presentation Narrative Arc:**  
`WHY WE STARTED` $\rightarrow$ `WHAT WE BUILT` $\rightarrow$ `HOW IT WORKS` $\rightarrow$ `WHY IT MATTERS` $\rightarrow$ `WHAT WE CONTRIBUTED` $\rightarrow$ `WHAT WE DEMONSTRATED`  

---

## 1. Opening & Project Title [00:00 – 01:00]

*"Respected guide Dr. Gobinath, department faculty members, and evaluators—good morning.*

*My name is Thrilok M, Register Number 2548430, representing our M.Sc. Data Science project alongside my colleague Piush Kole. Today, I am proud to present **Agentix: An AI-Powered Agentic Data Intelligence Platform for Automated Data Analysis, Machine Learning, and Business Insight Generation**.*

*Before we look at the software, I want to clarify what Agentix is and what it is not. Agentix is not a generic ChatGPT wrapper. It is not an ephemeral Jupyter notebook, nor is it a mocked demonstration website. Agentix is an enterprise-grade, air-gapped, autonomous data science platform designed for institutions that handle confidential, mission-critical tabular datasets. It is currently deployed live on the public internet, backed by an autonomous 9-stage multi-agent pipeline, an 8-layer AI security architecture, and a 32-algorithm machine learning engine.*

*Let us begin with the problem that inspired this work."*

---

## 2. Chapter 1: The Problem That Inspired Agentix [01:00 – 02:45]

*"In modern data science, organizations are generating massive volumes of structured tabular data—hospital clinical patient cohorts, university student retention metrics, banking ledgers, and supply chain logistics. However, turning that raw data into verified insights remains bottlenecked by three fundamental roadblocks.*

*The first is **Tooling Fragmentation**. An analyst must inspect files in Excel, write cleaning scripts in Python, train models in Jupyter, build charts in Tableau, and write reports in Word. There is no unified workflow continuity. If data changes, the entire pipeline must be manually re-run.*

*The second roadblock is **The Compliance and Privacy Wall**. Under regulations like HIPAA in healthcare, FERPA in education, and GDPR in enterprise SaaS, organizations are legally prohibited from uploading unredacted confidential records to commercial cloud AI APIs like OpenAI or Anthropic. Sending patient records to a public cloud API is an unacceptable breach hazard.*

*The third roadblock is **The Black-Box Hallucination Dilemma**. When analysts attempt to feed tables directly into conversational chatbots, catastrophic errors happen. Language models approximate multi-digit arithmetic, hallucinate non-existent rows, and fabricate correlations. Conversely, traditional high-performance machine learning models—like gradient boosted trees—behave as black boxes that cannot communicate their decision logic to executive leadership.*

*This created our project's core research question: Can an entire analytical workflow—from a raw tabular file to a verified model, an explainable attribution profile, and a grounded conversational assistant—be made accessible through a single, secure, air-gapped platform?"*

---

## 3. Chapter 2: The Agentix Solution Architecture [02:45 – 04:30]

*"To solve this, we engineered Agentix on three foundational pillars: **Zero Data Egress**, **Zero Statistical Fabrication**, and **Turnkey Usability**.*

*Please direct your attention to our system architecture diagram.*

*Agentix is structured on a decoupled full-stack architecture. On the left is our Edge Presentation Layer, built with Next.js 15 and React 19, operating our Warm Alabaster executive design system. It handles user interactions, client-side data validation, and edge middleware route gating.*

*In the middle is our Service Tier, powered by a high-performance Python FastAPI ASGI server running on Render and local workstations. Between these two tiers, we engineered a Backend-for-Frontend (BFF) Token Relay bridge. When an institutional user authenticates, Next.js validates the credentials, requests an authentic HMAC-SHA256 JWT from FastAPI, and seals it in an encrypted session cookie. The browser never touches backend secret keys, eliminating credential leakage.*

*On the right is our Dual-Engine Persistence Tier. In local offline development environments, Agentix operates on SQLite. In production, it connects seamlessly to Neon Serverless PostgreSQL with pgBouncer connection pooling, storing tabular data directly in an optimized Apache Parquet columnar lake."*

---

## 4. Chapter 3: The 9-Stage Multi-Agent Analytical Pipeline [04:30 – 06:45]

*"At the core of Agentix is our autonomous **9-Stage Multi-Agent Pipeline**, executed through an asynchronous worker bus.*

*Let us walk through the exact chronological journey of a dataset:*

*First, the **UploadAgent** reassembles incoming 2MB chunks and verifies file integrity using MD5 checksums. Our chunked streaming protocol was specifically engineered to bypass serverless payload boundaries, such as Vercel's strict 4.5MB limit.*

*Second, the **ParserAgent** inspects the raw file. It uses our FormatDetector to sniff delimiters—whether commas, tabs, semicolons, or pipes—and immediately serializes the records into compressed Apache Parquet format in `data/temp/`.*

*Third, the **ProfilingAgent** computes column data types, missing value percentages, duplicate counts, and memory footprints.*

*Fourth, the **CleaningAgent** applies our deterministic imputation strategy. It evaluates the statistical skewness of each numeric column: if the absolute skewness exceeds 0.5, it applies median imputation to guard against outlier distortion; if skewness is within normal bounds, it applies mean imputation; and for categorical columns, it applies mode imputation.*

*Fifth, the **EDAAgent** computes full Pearson correlation matrices and quantile distributions.*

*Sixth, the **FeatureEngineeringAgent** locks the target variable. It inspects categorical cardinality: categories with 50 or fewer unique values are one-hot encoded, while high-cardinality categories are frequency-encoded.*

*Seventh, the **TrainingAgent** evaluates our 32-algorithm machine learning catalog. It infer the task type, splits the data strictly into an 80% train and 20% test partition, and fits candidate models.*

*Eighth, the **EvaluationAgent** computes empirical metrics—Accuracy, Precision, Recall, F1, and ROC-AUC for classification; R², MAE, and RMSE for regression.*

*Finally, the **ReportAgent** consolidates these verified outputs into our relational database, making them immediately queryable."*

---

## 5. Chapter 4: The 32-Algorithm Catalog & Machine Learning Rigor [06:45 – 08:30]

*"For our M.Sc. Data Science evaluation, algorithmic rigor is paramount. Agentix does not rely on a single model. Our `AlgorithmRegistry` implements 32 verified algorithms across five distinct disciplines:*
- *11 Classification models: from regularized Logistic Regression and Decision Trees to Random Forest, Extra Trees, and LightGBM.*
- *10 Regression models: including Ridge L2, Lasso L1, ElasticNet, and Histogram Gradient Boosting.*
- *5 Clustering models: K-Means, MiniBatch K-Means, DBSCAN, Agglomerative, and Gaussian Mixture Models.*
- *3 Dimensionality Reduction techniques: PCA, Truncated SVD, and t-SNE.*
- *And 3 Time-Series Autoregressive models.*

*Our CandidateSelector applies intelligent heuristics based on sample size $N$ and feature count $P$. For large datasets over 10,000 rows, it prioritizes histogram-binned gradient boosting, which reduces training complexity from $O(N \cdot P \log N)$ to $O(N \cdot P)$. For high-dimensional sparse data, it prioritizes regularized linear models. And crucially, it always fits an interpretable linear baseline to ensure complex non-linear models actually justify their inclusion.*

*To prevent the infamous 'black box' problem, we engineered a **3-Tier Explainable AI (XAI) Attribution Resolver**. If tree models win, it computes game-theoretic SHAP attributions. If an opaque model like an SVM wins, it fits a transparent surrogate decision tree on the predictions. If AutoML has not yet run, it surfaces normalized statistical variance drivers. The user is never left with an opaque stalled state."*

---

## 6. Chapter 5: 8-Layer AI Governance & Empirical Benchmarks [08:30 – 10:15]

*"How do we ensure security and scalability? Through our **8-Layer AI Security Architecture**.*

*When an analyst queries the platform using natural language in the Agent Console, Layer 6's GuardrailEngine scans the input: it decodes base64 and leetspeak to neutralize prompt injection attacks, and redacts social security numbers, credit cards, and institutional emails before the prompt ever reaches an inference engine.*

*Layer 7 checks our SHA-256 exact-match cache: duplicate analytical queries return in under 5 milliseconds with zero compute invocation. If a cache miss occurs, the DynamicModelRouter routes the query to local hardware inference running on an Ollama daemon on Apple Silicon or CUDA. Because the verified metrics from our 9-stage pipeline are injected directly into `<dataset_context>` delimiters, the local model provides deep analytical answers without hallucinating statistics, and without a single byte of organizational data leaving the local network.*

*To validate scalability, we executed empirical benchmarks up to 500 megabytes using `scripts/benchmark_500mb_ingestion.py`. On a 500MB CSV dataset containing 7.95 million rows, Agentix completed ingestion in **1.503 seconds**—a sustained throughput of **332.68 MB/s**. Because of our chunked streaming parser, our process memory amplified by only **2.8 megabytes** during the entire run, compressing the raw file into a 99.1% smaller Parquet store.*

*In our machine learning benchmarks, LightGBM achieved an ROC-AUC of 0.826 on enterprise churn data in 0.78 seconds. And on high-dimensional clinical oncology biomarkers, regularized Logistic Regression achieved an outstanding 98.25% F1-score in just 0.002 seconds."*

---

## 7. Chapter 6: Individual Ownership & Forensic Remediation [10:15 – 12:00]

*"As lead architect and full-stack software engineer on this project, I took end-to-end technical ownership of the codebase. A forensic inspection of our active Git repository confirms that I am the sole registered author across 100% of commits.*

*Beyond the initial build, I want to highlight my work in **Forensic Code Remediation and Production Reliability Engineering**.*

*Earlier in our project cycle, an audit revealed that several API routes were returning simulated demonstration mocks. I systematically refactored those routes to return honest, real database data, replacing fake mocks with truthful empty states.*

*More recently, during our production cloud deployment to Vercel and Render, we encountered a critical P1 production incident. In FastAPI synchronous route handlers, Python ContextVars do not cross threadpool boundaries, causing the user ID in `upload_complete` to default to `'guest_user'`. On SQLite, this passed silently; but on Neon PostgreSQL, the strict foreign key constraint `datasets_owner_id_fkey` triggered an unhandled HTTP 500 error.*

*I isolated the root cause, refactored the endpoint to inject `current_user: User = Depends(get_current_user)` as a direct FastAPI dependency, synchronized our JWT secret keys via our BFF Token Relay, and redeployed. Today, our automated test suite stands at **73 passing tests**, with zero client-side exceptions and zero unhandled page crashes on our production URL."*

---

## 8. Closing & Live Demonstration Handover [12:00 – End]

*"In conclusion, Agentix demonstrates that institutions do not have to compromise between modern artificial intelligence and complete data sovereignty.*

*By uniting a deterministic 9-stage multi-agent pipeline, a 32-algorithm AutoML catalog, and local hardware-accelerated LLMs within a zero-data-egress architecture, Agentix turns raw tabular data into verified, explainable decision intelligence.*

*I will now transition to the live demonstration, where we will log into our production deployment at `agentix-bay.vercel.app`, upload an institutional dataset, watch the 9-stage pipeline execute in real time, inspect our model leaderboard, and query our grounded assistant.*

*Thank you, and I welcome your questions."*
