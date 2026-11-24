# Agentix — Engineering Roadmap

**Document Version: 2.4.0**  
**Classification: Prioritized Technical Strategy**

---

## Priority Classification Framework

- **P0 — Critical:** Security vulnerabilities, authentication stability, data isolation, and deployment blockers.
- **P1 — Important:** Core workflow completion, persistent storage sinks, and integration tests.
- **P2 — Improvements:** Performance optimization, semantic caching, and UI polish.
- **P3 — Future Enhancements:** Multi-modal inputs, cross-encoder evaluations, and federated model fine-tuning.

---

## 1. P0 — Critical Priorities

### P0.1: Persistent Database Sinks for Layer 1 & Layer 4
- **Description:** Currently, `TenantTokenBucketLimiter` rate-limit counters and `ToolExecutionAudit` records reside in server memory. On multi-worker or container restarts, limits and audit logs are reset.
- **Business Impact:** Ensures continuous regulatory auditability and prevents distributed rate limit bypasses.
- **Technical Impact:** Back the in-memory buckets with Redis or PostgreSQL table writes.
- **Dependencies:** PostgreSQL / Redis connection pool.
- **Acceptance Criteria:** Rate limit counters and MCP audit logs persist across backend process restarts.

### P0.2: Legacy Test Harness Archival & Refactoring
- **Description:** 17 legacy test files in `backend/tests/` import outdated pre-V2 modules, preventing a clean `pytest backend/tests/` run without specific file path filtering.
- **Business Impact:** Streamlines CI/CD pipelines and eliminates false negative build alarms.
- **Technical Impact:** Migrate legacy test assertions to the 9-stage pipeline and archive deprecated files to `archive/legacy_tests/`.
- **Dependencies:** None.
- **Acceptance Criteria:** `pytest backend/tests/` executes with 100% test collection success.

---

## 2. P1 — Important Priorities

### P1.1: Native Server-Side PDF Report Generation
- **Description:** `ReportAgent` currently generates structured analytical JSON, transparently declaring `pdf_available: false`.
- **Business Impact:** Institutional executives require downloadable, branded PDF dossiers for committee briefings.
- **Technical Impact:** Integrate `WeasyPrint` or a headless Chromium PDF generation worker.
- **Dependencies:** Cairo / Pango or headless Chrome CLI in production container.
- **Acceptance Criteria:** Clicking "Download PDF Dossier" in `/intelligence-reports` downloads a rendered multi-page executive PDF report.

### P1.2: Fine-Grained Workspace Member Invitation Flow
- **Description:** While `Workspace` and `WorkspaceMember` exist in the Prisma schema, inviting external users via email tokens is not fully wired to an email delivery service.
- **Business Impact:** Enables frictionless multi-user collaboration within enterprise teams.
- **Technical Impact:** Integrate Resend or SendGrid API in `app/api/workspaces/invite`.
- **Dependencies:** Institutional SMTP or transactional email provider.
- **Acceptance Criteria:** Admin can invite team members by email; recipients receive secure sign-up link.

---

## 3. P2 — Improvements

### P2.1: Semantic Embedding Cache (Layer 7 Upgrade)
- **Description:** Upgrade the exact-match SHA-256 cache to include a cosine-similarity semantic cache.
- **Business Impact:** Further reduces local GPU latency by answering semantically identical prompts (e.g. "What is our Q3 churn rate?" vs "Show Q3 churn metrics") without re-running model inference.
- **Technical Impact:** Store prompt embeddings and return cached responses when cosine similarity exceeds 0.96.
- **Acceptance Criteria:** Semantically equivalent questions return from cache in < 15ms.

### P2.2: Advanced SHAP Visualization Export
- **Description:** Provide interactive beeswarm and waterfall feature attribution plots in the `/insights` and `/intelligence-reports` interfaces.
- **Acceptance Criteria:** SHAP values exported as interactive Plotly charts directly embedded in the frontend.

---

## 4. P3 — Future Enhancements

### P3.1: Multi-Modal Document & Image Ingestion
- **Description:** Enable drag-and-drop ingestion of scanned medical records, invoice PDFs, and charts parsed via local vision models (e.g. `llama3.2-vision:11b`).
- **Acceptance Criteria:** Vision models extract structured tables from images directly into Parquet files.

### P3.2: Federated Parameter-Efficient Fine-Tuning (PEFT/LoRA)
- **Description:** Allow enterprise tenants to train private low-rank adaptation (LoRA) adapters on custom domain vocabularies without modifying base model weights.
- **Acceptance Criteria:** Trainable LoRA adapter generated locally and loaded dynamically during inference.
