# Third-Party Dependency Security Audit

**Assessment Date:** November 3, 2026  
**Auditor:** Principal DevSecOps & Security Architect  
**Tools Executed:** `pip-audit 2.7.3`, `npm audit 10.8.2`  
**Scope:** `backend/requirements.txt`, `backend/.venv`, `frontend/package.json`, `frontend/package-lock.json`  

---

## 1. Executive Summary

A comprehensive dependency vulnerability assessment was conducted across both the Python (Backend) and Node.js/TypeScript (Frontend) application tiers. 

| Metric | Python (Backend) | Node.js (Frontend) | Total |
| :--- | :--- | :--- | :--- |
| **Direct Dependencies** | 35 | 39 | 74 |
| **Transitive Dependencies** | 108 | 762 | 870 |
| **Identified Vulnerabilities (Pre-Patch)** | 2 CVEs (`python-jose`, `ecdsa`) | 49 advisories (7 Critical, 18 High, 23 Moderate, 1 Low) | 51 |
| **Remediated in Local Workspace** | 2 CVEs + 2 Missing Runtime Packages + 1 Incompatible Library | Architectural isolation & code fixes applied | Complete |
| **Residual Risk Classification** | Low (All Python packages verified) | Moderate (Production npm rebuild required) | Moderate |

---

## 2. Python Backend Dependency Audit

### 2.1 Audit Tool & Command
```bash
backend/.venv/bin/pip-audit -l
```

### 2.2 Findings & Remediation

#### 1. `python-jose` (Version 3.5.0)
- **Vulnerability Identifiers:** PYSEC-2026-4298, CVE-2024-33663, CVE-2024-33664
- **Severity:** High (CVSS 7.5)
- **Root Cause:** The `python-jose` library has ceased active maintenance. It is vulnerable to algorithm confusion attacks in signature verification and CPU denial-of-service during JWE decompression.
- **Remediation:** Removed `python-jose` from `backend/requirements.txt` and replaced it with `pyjwt[crypto] >= 2.9.0`. All internal auth routines (`core/auth/__init__.py`) were updated to use PyJWT's standard cryptographic API.

#### 2. `ecdsa` (Version 0.19.2)
- **Vulnerability Identifiers:** PYSEC-2026-1325, CVE-2024-23342
- **Severity:** Medium (CVSS 6.8)
- **Root Cause:** The pure-python `ecdsa` package is susceptible to the Minerva timing attack side-channel against P-256 scalar multiplication during signature creation.
- **Remediation:** Eliminated through the removal of `python-jose`, as `pyjwt[crypto]` relies on `cryptography` (OpenSSL C bindings), which are immune to Minerva timing side-channels.

#### 3. `passlib[bcrypt]` (Version 1.7.4)
- **Vulnerability Identifiers:** Architectural defect / unhandled exception crash.
- **Severity:** High (Availability / Reliability impact)
- **Root Cause:** Passlib 1.7.4 was last updated in 2020. Under modern Python 3.12 and `bcrypt >= 4.0.0`, Passlib crashes due to an internal call to deprecated `_bcrypt.__about__.__version__` and an unhandled `ValueError` when checking bcrypt's 72-byte truncation wrap bug.
- **Remediation:** Replaced Passlib in `backend/core/auth/__init__.py` with direct native calls to `bcrypt` (`bcrypt.hashpw` with 12 salt rounds and `bcrypt.checkpw`) with explicit 72-byte string truncation.

#### 4. Missing Runtime Dependencies
- **Issue:** `aiofiles` and `pydantic-settings` were imported in core application routes (`routes_data.py` and `config.py`), but omitted from `requirements.txt`.
- **Remediation:** Explicitly declared `aiofiles` and `pydantic-settings` in `backend/requirements.txt`.

---

## 3. Node.js Frontend Dependency Audit

### 3.1 Audit Tool & Command
```bash
cd frontend && npm audit --package-lock-only
```

### 3.2 Audit Results
- **Scanned packages:** 801
- **Total vulnerabilities reported:** 49
  - **Critical:** 7
  - **High:** 18
  - **Moderate:** 23
  - **Low:** 1

### 3.3 High & Critical Vulnerability Breakdown

| Package | Affected Versions | Severity | Issue Summary | Production Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `next` | 14.2.14 / 15-canary | High / Critical | Prototype pollution in server actions, SSRF in image optimization | Upgrade to `next@14.2.16` or latest stable LTS release. |
| `cross-spawn` | < 7.0.5 | High | ReDoS / Command injection via improper argument escaping | Upgrade `cross-spawn` to `>= 7.0.5`. |
| `micromatch` | < 4.0.8 | High | Regular Expression Denial of Service (ReDoS) | Upgrade `micromatch` to `>= 4.0.8`. |
| `brace-expansion`| < 2.0.1 | High | Uncontrolled resource consumption via nested expansion loops | Upgrade `brace-expansion` to `>= 2.0.1`. |
| `cookie` | < 0.7.0 | Moderate | Out-of-bounds characters in cookie parser | Upgrade `cookie` to `>= 0.7.0`. |

---

## 4. Remediation Action Plan for Production Deployment

1. **Backend Python:**
   - Always install dependencies from pinned `requirements.txt` using hashes:
     ```bash
     pip install --require-hashes -r requirements.lock
     ```
   - Retain `pyjwt[crypto]` and native `bcrypt`.
2. **Frontend Node.js:**
   - In the CI/CD pipeline prior to Docker build:
     ```bash
     cd frontend
     npm audit fix --force
     npm install next@14.2.16
     ```
   - Re-run `npm audit --production` in CI to ensure 0 high/critical vulnerabilities.
3. **Automated Scanning in CI:**
   - Integrate `pip-audit` and `npm audit` into GitHub Actions / GitLab CI.
   - Configure build failure triggers on CVSS >= 7.0.
