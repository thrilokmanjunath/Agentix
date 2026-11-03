# Agentix — Residual Risks, Deprecations & Architectural Notes

**Audit Identifier:** `AUDIT-UNRESOLVED-2026-V1`  
**Classification:** Low / Informational / Future Maintenance  
**Date:** November 2026  
**Status:** Open for Future Milestone Iterations  

---

## 1. Overview & Risk Summary

Zero critical, high, or medium severity security vulnerabilities remain in the Agentix codebase. All 16 primary vulnerabilities identified during the initial defensive security audit have been remediated, verified, and locked in commit `a1f4a35` and forward.

This document transparently tracks residual low-severity items, upstream library deprecation notices, and architectural considerations recommended for subsequent enterprise milestones.

---

## 2. Itemized Residual Observations & Deprecation Warnings

### 2.1 Pandas 4.0 Parquet Engine Deprecation (Low / Informational)
- **Component:** `backend/core/engines/base.py` (Line 32)
- **Warning:** `Pandas4Warning: The 'fastparquet' engine is deprecated and will be removed in a future version. Use 'pyarrow' instead.`
- **Current Impact:** None. Parquet read/write functions normally in pandas 2.x and 3.x.
- **Recommended Remediation:** Migrate default Parquet reader invocation to `engine='pyarrow'` across `backend/core/engines/` when bumping to Pandas 4.0.

### 2.2 Python 3.12+ `datetime.utcnow()` Deprecation (Low / Informational)
- **Components:** `backend/core/auth/__init__.py`, SQLAlchemy schema default hooks
- **Warning:** `DeprecationWarning: datetime.datetime.utcnow() is deprecated and scheduled for removal in Python 3.14. Use timezone-aware datetime.datetime.now(datetime.UTC).`
- **Current Impact:** None. Timestamp arithmetic is mathematically correct and evaluated as UTC epoch.
- **Recommended Remediation:** Replace `datetime.utcnow()` with `datetime.now(datetime.UTC)` across all auth token generation utilities and schema defaults.

### 2.3 Administrative Preview Scope Boundaries (Informational)
- **Components:** `frontend/src/app/admin/*`
- **Observation:** Administrative pages (e.g., `brain-console`, `workflow-manager`, `model-manager`) are UI previews for planned administrative tooling and do not yet bind to real backend controllers.
- **Mitigation Implemented:** Added an explicit amber advisory banner in `AdminLayout` notifying institutional operators that these pages are UI mockups displaying illustrative data, preventing operational confusion.

### 2.4 Cloud Secret Key Storage (Informational / Cloud Milestone)
- **Component:** `backend/.env`
- **Observation:** When operating in optional cloud inference mode, API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) reside in local `.env` files.
- **Current Impact:** Mitigated by `.gitignore` preventing `.env` commits and strict local-first default setting (`AI_INFERENCE_MODE=local`).
- **Recommended Remediation:** For enterprise multi-cluster deployments across AWS/GCP, integrate native cloud key management (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault).

---

## 3. Residual Risk Assessment Matrix

| Item | Category | Likelihood | Impact | Residual Risk | Status |
|---|---|---|---|---|---|
| Parquet Engine Deprecation | Technical Debt | Low | Low | **NEGLIGIBLE** | Scheduled for Pandas 4.0 upgrade |
| UTC Datetime Deprecation | Technical Debt | Low | Low | **NEGLIGIBLE** | Scheduled for Python 3.14 upgrade |
| Admin Pro Preview Mockups | Transparency | Low | Low | **MITIGATED** | Banner added; no backend exposure |
| Cloud Key Local Storage | Operational | Low | Medium | **LOW** | Managed via `.env` file permissions |

**Conclusion:** Residual risks are negligible and purely operational/maintenance-related. The platform is secure and production-ready for institutional air-gapped environments.
