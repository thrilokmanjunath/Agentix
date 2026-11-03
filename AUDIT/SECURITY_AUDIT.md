# Comprehensive Security Audit Report (Agentix)

**Assessment Standards:** OWASP ASVS 5.0, OWASP Top 10 (2021), OWASP API Security Top 10 (2023), OWASP Top 10 for LLM Applications (2025)  
**Date:** November 2026  
**Auditor:** Principal Application Security Engineer & DevSecOps Lead  
**Scope:** Complete Agentix Local Workspace  

---

## 1. Executive Summary & Audit Overview

A comprehensive, defense-in-depth security assessment of the Agentix project was performed across all application layers: frontend, backend, database repositories, cognitive execution pipelines, AI/LLM models, and deployment configurations.

The assessment revealed that while core machine learning algorithms and deterministic data-cleaning logic are implemented cleanly, the application possesses severe systemic vulnerabilities in **multi-tenant data isolation**, **authentication enforcement**, **object-level authorization (IDOR)**, **unrestricted resource consumption**, **prompt injection**, and **sensitive credential storage**.

A summary of identified vulnerabilities across security domains:
- **Authentication & Identity:** 4 findings (Hardcoded admin credentials, weak registration password policies, token expiration mismatch, dev auth bypass).
- **Authorization & Multi-Tenancy:** 4 findings (Cross-tenant data exposure in all platform APIs, unauthenticated IDOR on jobs, unverified workspace role escalation, and shared cache contamination).
- **API & Backend Security:** 3 findings (Missing rate limiting, unauthenticated file upload & pipeline trigger, probe routing conflicts).
- **AI & LLM Security:** 2 findings (Direct and indirect prompt injection, unconstrained model invocation).
- **Database & Data Security:** 2 findings (Plaintext API key storage in DB, unauthenticated shared filesystem persistence).
- **Frontend Security:** 2 findings (Middleware exclusion of `/api/*`, missing `@/lib/prisma` singleton).
- **Infrastructure & Dependencies:** 3 findings (Container execution as root, default credentials in compose, 49 NPM vulnerabilities and 3 Python vulnerabilities).

---

## 2. Section A: Authentication and Identity Security

### Findings:
1. **Hardcoded Admin Credential in Frontend Authentication (`VULN-06`):**
   In `frontend/src/auth.config.ts`, the NextAuth `CredentialsProvider` explicitly compares user inputs against hardcoded string values: `admin@agentix.com` / `admin`. Anyone supplying these values is immediately provisioned as an enterprise admin with `role: "ADMIN"`.
2. **Insecure Development Authentication Bypass in Backend (`VULN-11`):**
   In `backend/core/auth/__init__.py`, when `ENVIRONMENT` is default or `"development"`, any request without a Bearer token automatically receives the identity of `admin@agentix.com` with role `"admin"`. Unauthenticated callers gain complete administrative control without sending credentials.
3. **Weak Registration Security & Missing Password Policies (`VULN-14`):**
   `backend/core/api/v1/routes_auth.py` accepts registration requests with zero password length or complexity constraints. Passwords with a single character are hashed and stored.
4. **Token Expiration Inconsistency (`BUG-10`):**
   While `ACCESS_TOKEN_EXPIRE_MINUTES` is defined as 7 days, tokens created in `create_access_token` default to 15 minutes unless an explicit delta is passed.

---

## 3. Section B: Authorization and Access Control

### Findings:
1. **Broken Object Level Authorization (IDOR) on Platform Endpoints (`VULN-01`):**
   All analytical endpoints in `routes_platform.py` (`/eda`, `/xai`, `/insights`, `/recommendations`, `/reports`, `/automl`, `/predict`, `/chat`, `/workflow-status`) fail to enforce tenant authorization. Callers can supply arbitrary dataset names or `run_id`s and inspect execution results, model performance metrics, and feature importances belonging to other users.
2. **Unauthenticated IDOR in Job Status Inspection (`VULN-02`):**
   In `backend/core/api/v1/routes_jobs.py`, `GET /api/v1/jobs/{job_id}` is completely unauthenticated. Any anonymous caller can poll and retrieve the full analytical data and model parameters of any run.
3. **Privilege Escalation via User Registration (`VULN-05`):**
   `POST /api/v1/auth/register` blindly binds the user-provided `role` parameter to the new user model. Any user can set `"role": "admin"`.
4. **Broken Access Control on Workspace Membership (`VULN-04`):**
   In `frontend/src/app/api/workspaces/route.ts`, `add_member`, `update_role`, and `remove_member` do not check if the requesting user is an admin or owner of the workspace. Any authenticated user can promote themselves or others to workspace admin or delete members.

---

## 4. Section C: Multi-Tenant Institutional Security

### Findings:
1. **Cross-Tenant Data Exposure in Database Queries (`VULN-01`):**
   `_latest_dataset_and_run(db, dataset_name)` queries datasets strictly by name: `db.query(Dataset).filter_by(name=dataset_name).order_by(Dataset.created_at.desc()).first()`. It completely ignores `owner_id`. If Institution Alpha and Institution Beta upload files with identical names (e.g., `customers.csv`), Institution Beta accesses Institution Alpha's dataset, models, and predictions.
2. **In-Memory Cache Contamination in `DataService` (`VULN-07`):**
   The backend `DataService` stores intermediate pipeline state in an in-memory dictionary keyed solely by `dataset_name`. Cross-tenant dataset name collisions result in one institution overwriting or reading another institution's in-flight dataset and test predictions.
3. **Shared Filesystem Profile Contamination (`VULN-03`):**
   In `frontend/src/app/api/users/profile/route.ts` and `settings/route.ts`, all users read and write to the same single JSON files on disk (`data/profile.json` and `data/settings.json`). Changes by one user overwrite all others globally.

---

## 5. Section D: API and Backend Security

### Findings:
1. **Missing Rate Limiting (`VULN-10`):**
   Rate limiting is commented out in `SecurityMiddleware` (`# 2. Rate Limiting (Temporarily disabled due to redis removal)`). No protection exists against brute-force login attempts or denial-of-service flood requests.
2. **Unauthenticated Chunk Upload & Pipeline Dispatch (`VULN-08`):**
   `/api/v1/dataset/upload/init`, `/upload/chunk`, and `/upload/complete` permit unauthenticated file uploads up to 500MB and launch asynchronous 9-stage ML pipelines on background workers without authentication.
3. **Kubernetes Health Probe Routing Conflict (`BUG-09`):**
   Kubernetes probes (`/health`, `/liveness`, `/readiness`) are mounted under an admin-authenticated router prefix (`/api/v1/admin/system/*`), preventing automated container orchestrators from performing health checks without authentication.

---

## 6. Section E: AI and LLM Security (OWASP LLM Top 10)

### Findings:
1. **Direct Prompt Injection via User Chat (`VULN-09`):**
   In `/api/v1/platform/chat`, user queries are interpolated directly into prompts:
   ```python
   prompt = (
       "You are Agentix's data analyst assistant. Answer the user's question using ONLY the real pipeline "
       f"data given below...\n"
       f"Dataset context: {context_blob}\n"
       f"User question: {query}"
   )
   ```
   No delimiter boundaries or guardrails are present. Attackers can override assistant personas, extract system prompts, or induce false analytical assertions.
2. **Indirect Prompt Injection via Uploaded Datasets (`VULN-09`):**
   Adversarial column headers or string values inside uploaded CSV files are passed directly through EDA statistics into `context_blob`, enabling malicious datasets to execute prompt injection against data analysts viewing insights.
3. **Unrestricted Model Invocation / Denial-of-Wallet:**
   No quota or token limit is applied per tenant or per IP for LLM inference requests.

---

## 7. Section F: Database and Data Security

### Findings:
1. **Plaintext API Key Storage (`VULN-12`):**
   `UserSettings.openai_api_key` stores external provider credentials in plaintext in PostgreSQL without encryption.
2. **Unauthenticated File-Based Settings with Exposed Secrets (`VULN-03`):**
   `frontend/src/app/api/users/settings/route.ts` exposes `apiKey: 'sk-proj-...'` via unauthenticated `GET /api/users/settings`.

---

## 8. Section G: Frontend Security

### Findings:
1. **Next.js Middleware Matcher Exclusion (`BUG-04`):**
   `frontend/src/middleware.ts` excludes all `/api/*` routes from authentication middleware.
2. **Missing Database Adapter (`BUG-01`):**
   Missing `frontend/src/lib/prisma.ts` breaks all frontend API endpoints and NextAuth session persistence.
3. **Prisma Type Mismatch on Delete/Update Handlers (`BUG-02`):**
   Invalid non-unique compound where clauses cause runtime crashes in session deletion and notification updating.

---

## 9. Section H: Infrastructure and Deployment

### Findings:
1. **Backend Container Execution as Root (`VULN-13`):**
   `backend/Dockerfile` lacks a non-root `USER` specification.
2. **Database Port Exposure (`VULN-13`):**
   `docker-compose.yml` binds PostgreSQL (`5432`) and Redis (`6379`) to `0.0.0.0`.
3. **Vulnerable Dependencies (`VULN-16`):**
   49 NPM vulnerabilities (7 critical, 18 high) and 3 Python vulnerabilities identified.
