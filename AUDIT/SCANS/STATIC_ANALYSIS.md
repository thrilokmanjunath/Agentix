# Static Application Security Testing (SAST) Report

**Scan Date:** November 2026  
**Auditor:** DevSecOps & Security Engineering Team  
**Scope:** Backend (`backend/core/`) and Frontend (`frontend/src/`)  

---

## 1. Tooling & Execution Parameters

### 1.1 Python SAST (Bandit)
- **Tool & Version:** Bandit 1.9.4 (running on Python 3.12.13)
- **Execution Command:** `bandit -r backend/core -f txt`
- **Scan Scope:** 2,455 lines of code across `backend/core`
- **Excluded Paths:** None

### 1.2 TypeScript/JavaScript Analysis
- **Tooling:** ESLint 9 + TypeScript 5 static compiler + manual code review
- **Scan Scope:** Frontend App Router pages, API routes, middleware, and Zustand stores (`frontend/src/`)

---

## 2. Bandit SAST Results Summary

| Severity | High Confidence | Medium Confidence | Low Confidence | Total |
| :--- | :--- | :--- | :--- | :--- |
| **Critical / High** | 0 | 0 | 0 | **0** |
| **Medium** | 0 | 0 | 0 | **0** |
| **Low** | 13 | 4 | 0 | **17** |
| **Total Issues** | **13** | **4** | **0** | **17** |

---

## 3. Detailed Bandit Findings

### Finding 1 & 2: Silent Exception Handling (`B110:try_except_pass`)
- **Severity / Confidence:** Low / High (CWE-703)
- **Locations:**
  - `backend/core/agents/base.py:108`
  - `backend/core/agents/pipeline_agents.py:457`
  - `backend/core/hardware/detector.py:22`, `55`
  - `backend/core/hardware/models.py:28`
- **Description:** Bare `except Exception: pass` suppresses unexpected runtime errors and could hide denial-of-service or parsing failures.
- **Remediation:** Replace bare `pass` with explicit logger warnings (`logger.warning("...", exc_info=True)`).

### Finding 3 & 4: Subprocess Execution with Partial Path (`B607` / `B603` / `B404`)
- **Severity / Confidence:** Low / High (CWE-78)
- **Locations:**
  - `backend/core/hardware/detector.py:42`, `44` (`nvidia-smi`)
  - `backend/core/hardware/models.py:13` (`ollama list`)
- **Description:** Starting subprocesses with partial paths relying on ambient `$PATH` resolution.
- **Remediation:** Use `shutil.which` to resolve absolute binary paths and ensure inputs are strictly constant arguments with `shell=False`.

### Finding 5: Possible Hardcoded Cryptographic Key / Credentials (`B105` / `B106`)
- **Severity / Confidence:** Low / Medium (CWE-259)
- **Locations:**
  - `backend/core/auth/__init__.py:23`: `SECRET_KEY = "super-secret-agentix-key-2026"`
  - `backend/core/repositories/database.py:87`: `hashed_password="!disabled"`
- **Description:** Hardcoded fallback JWT secret in source code.
- **Remediation:** Require environment-configured secrets or generate random ephemeral secrets; reject insecure defaults.

---

## 4. Frontend Static Code Analysis Findings

### Finding 6: Missing Module Resolution (`@/lib/prisma`)
- **Severity:** Critical (Functional & Security Blocker)
- **Locations:** 9 files across `frontend/src/app/api/*` and `frontend/src/auth.ts`
- **Description:** All database-backed API handlers import `@/lib/prisma`, which does not exist on disk, causing fatal runtime exceptions.

### Finding 7: Non-Unique Compound WHERE in Prisma Calls
- **Severity:** High (Runtime Error)
- **Locations:**
  - `frontend/src/app/api/sessions/route.ts:33`: `prisma.session.delete({ where: { id: sessionId, userId } })`
  - `frontend/src/app/api/notifications/route.ts:39`: `prisma.notification.update({ where: { id, userId }, data: ... })`
- **Description:** Prisma schema defines no `@@unique` constraint on `[id, userId]`. Passing compound non-unique clauses to `delete` or `update` triggers runtime validation failures.

### Finding 8: Client-Side Double Base Path Resolution
- **Severity:** High (API Failure)
- **Locations:**
  - `frontend/src/store/platformStore.ts:135`
  - `frontend/src/app/api/dashboard/route.ts:62`
  - `frontend/src/app/api/benchmark-stats/route.ts:12`
- **Description:** Concatenating `${NEXT_PUBLIC_API_URL}/api/v1/...` when `NEXT_PUBLIC_API_URL` already contains `/api/v1` creates malformed URLs (`/api/v1/api/v1/...`).
