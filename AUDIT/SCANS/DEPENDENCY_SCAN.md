# Software Dependency Vulnerability Assessment (SCA)

**Scan Date:** November 2026  
**Auditor:** DevSecOps Team  
**Scope:** Backend (`backend/requirements.txt`) & Frontend (`frontend/package.json` / `package-lock.json`)

---

## 1. Tooling & Scan Parameters

### 1.1 Python SCA (pip-audit)
- **Tool & Version:** pip-audit 2.10.1 (OSV & PyPI Advisory Database)
- **Command:** `pip-audit -l`
- **Scope:** 135 resolved Python packages in `backend/.venv`

### 1.2 Node.js SCA (npm audit)
- **Tool & Version:** npm audit (npm 11.12.1)
- **Command:** `npm audit --package-lock-only`
- **Scope:** 841 dependencies in `frontend/package-lock.json`

---

## 2. Python Vulnerability Findings (pip-audit)

The scan identified **3 known vulnerabilities** across **2 packages**:

| Package | Installed Version | Advisory ID | Severity | Description | Fix Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`python-jose`** | `3.5.0` | `PYSEC-2026-4298` | **High** | Algorithm confusion / key confusion vulnerability allowing verification bypass when decoding tokens with mismatched algorithms | Replace `python-jose` with `PyJWT>=2.10.1` |
| **`ecdsa`** | `0.19.2` | `PYSEC-2026-1325` | **Medium** | Timing attack / side-channel vulnerability in signature verification (Minerva attack) | Remove dependency (transitive from python-jose) or upgrade |

### Missing Backend Dependencies Identified:
1. `pydantic-settings`: Missing from `backend/requirements.txt` (causes `ModuleNotFoundError` for `BaseSettings` on Pydantic v2).
2. `pyjwt`: Used directly in `core/auth/__init__.py` (`import jwt`, `jwt.PyJWTError`), but omitted from `requirements.txt`.
3. `aiofiles`: Used in `core/api/v1/routes_data.py` (`import aiofiles`), but omitted from `requirements.txt`.

---

## 3. Frontend Vulnerability Findings (npm audit)

The scan identified **49 vulnerabilities**:
- **7 Critical Severity**
- **18 High Severity**
- **23 Moderate Severity**
- **1 Low Severity**

### Summary of Critical & High Vulnerabilities:

| Package | Affected Range | Severity | Vulnerability Summary | Advisory |
| :--- | :--- | :--- | :--- | :--- |
| **`@auth/core`** | `<=0.41.2` | **Critical** | 1. Unicode homoglyph `@` bypass in email normalizer.<br>2. `getToken()` unhandled exception on malformed Bearer headers.<br>3. OAuth state/nonce/PKCE cookies unbound to provider. | `GHSA-7rqj-j65f-68wh`<br>`GHSA-xmf8-cvqr-rfgj`<br>`GHSA-x445-f3h2-j279` |
| **`next-auth`** | `5.0.0-beta.31` | **Critical** | Inherits critical vulnerabilities from `@auth/core`. | Transitive via `@auth/core` |
| **`axios`** | `1.0.0 - 1.19.0` | **High** | Prototype pollution gadget in fetch adapter; ReDoS in data URI and proxy normalization; redirect-based SSRF when `maxRedirects: 0` is bypassed. | `GHSA-vh66-26gq-q6x8`<br>`GHSA-c29m-xwm3-cm6r`<br>`GHSA-r4gj-5m52-g5wh` |
| **`undici`** | `7.0.0 - 7.30.0` | **High** | Cross-user information disclosure via whitespace in Cache-Control; CRLF injection; response desynchronization via retry interceptor; cookie attribute injection. | `GHSA-8xcm-r25x-g524`<br>`GHSA-4cwx-7wf7-3272`<br>`GHSA-m8rv-5g2x-5cg5` |
| **`zod`** | `<4.6.6` | **High** | Unbounded memory consumption during validation of oversized constrained collections leading to Denial of Service. | `GHSA-mrhx-c7xc-m3w5` |
| **`systeminformation`** | `<=5.33.15` | **High** | Path traversal in Linux `networkStats()` via symlinks; command injection in Windows `services()` through Unicode quotation marks. | `GHSA-4vjg-vx72-qq4g`<br>`GHSA-3f7j-7jwc-fxfj` |
| **`body-parser`** | `2.0.0 - 2.3.0` | **High** | Denial of Service via trailing bytes after compressed request body. | `GHSA-27r3-jxmh-p828` |

---

## 4. Remediation Roadmap

1. **Python Dependencies:**
   - Remove unmaintained and vulnerable `python-jose[cryptography]`.
   - Add modern, secure `pyjwt[crypto]>=2.10.1`, `pydantic-settings>=2.8.0`, and `aiofiles>=24.1.0` to `backend/requirements.txt`.
2. **Node.js Dependencies:**
   - Run `npm audit fix` where non-breaking updates are available.
   - Constrain input payload sizes on Axios and Next.js endpoints to mitigate prototype pollution and ReDoS.
   - Validate and normalize email strings strictly prior to authentication callbacks.
