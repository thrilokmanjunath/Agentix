# Agentix — Technical Glossary

**Document Version: 2.4.0**  
**Classification: Standardized Terminology Index**

---

### Air-Gapped Operation
An operational model where computing devices and software systems operate without network connections to the public internet or external cloud services, guaranteeing that proprietary institutional data never leaves private perimeter boundaries.

### AutoML (Automated Machine Learning)
Automated algorithms that identify problem types (classification vs regression), handle preprocessing, train candidate baseline models, evaluate performance, and select champion configurations without requiring manual code authoring.

### CUID (Collision-Resistant Unique Identifier)
A URL-friendly, cryptographically robust unique string identifier used in Prisma models to prevent database primary-key enumeration attacks.

### Delimiter Enclave
A prompt engineering security design pattern where untrusted user input is enclosed in custom structural XML/HTML tags (e.g. `<untrusted_user_query>`) with strict escaping, preventing the LLM from confusing user input with system-level behavioral instructions.

### Deterministic Embedding
A token-hashing projection technique that converts text tokens into fixed-length dense vectors (e.g. 128 dimensions) using consistent cryptographic hashes without requiring gigabytes of neural weights or external embedding API endpoints.

### EDA (Exploratory Data Analysis)
The statistical profiling of tabular data distributions, null counts, skewness, standard deviations, and pairwise feature correlations prior to machine learning modeling.

### Exact-Match Cache
A thread-safe cache that hashes composite keys (`SHA-256(tenant:model:template:prompt)`) to return previously computed analytical responses in < 5ms without invoking CPU or GPU neural inference.

### Factual Faithfulness Score
An evaluation metric (ranging from 0.0 to 1.0) that measures whether claims made by an AI model in its response are mathematically and factually supported by reference dataset context, flagging ungrounded hallucinations.

### Feature Attribution (SHAP)
Shapley Additive exPlanations; a game-theoretic approach to explain individual predictions by computing the exact positive or negative contribution of each feature to the model's output.

### MCP (Model Context Protocol)
An open standard developed by Anthropic allowing AI models to safely discover and invoke structured tools via formal JSON-RPC schemas with granular risk tiering and RBAC authorization.

### One-Hot Encoding vs. Frequency Encoding
- **One-Hot Encoding:** Expands a categorical column into binary 0/1 indicator columns for each unique value.
- **Frequency Encoding:** Replaces each categorical value with its proportional frequency in the dataset, compressing high-cardinality features into a single safe numeric feature without memory explosion.

### Parquet
An open-source, columnar storage file format optimized for high-throughput analytical queries, columnar slicing, and efficient binary compression.

### RFC 7662 Token Introspection
An IETF standard defining a REST API endpoint where microservices and API gateways can present an OAuth 2.0 access token to determine its active status, client ID, tenant boundary, and assigned permissions.

### SGD (Stochastic Gradient Descent)
An iterative optimization algorithm that updates model coefficients incrementally (`partial_fit`), allowing models to train on massive datasets without loading the entire matrix into RAM.

### Zero Data Egress
A strict architectural invariant ensuring that no raw customer data, prompts, or model outputs are transmitted outside the tenant's designated physical or virtual infrastructure.
