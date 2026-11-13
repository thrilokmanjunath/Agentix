# AGENTIX PRODUCTION INCIDENT REPORT — FULL RECOVERY & REMEDIATION

**Incident Identifier:** INC-20261113-AUTH-INGEST-RECOVERY  
**Incident Severity:** P1 / CRITICAL (Full Service Impairment)  
**Status:** RESOLVED & VERIFIED IN PRODUCTION  
**Date of Incident:** November 13, 2026  
**Lead Reliability Engineers:** Principal DevOps Architect, Full-Stack Reliability Engineer & QA Lead  
**Target Systems:**
- **Production Frontend:** `https://agentix-bay.vercel.app` (Next.js 15.0.0, Vercel Serverless)
- **Production Backend:** `https://agentix-api-lord.onrender.com` (FastAPI 0.110.0, Render Web Service)
- **Production Database:** Neon Serverless PostgreSQL (`ep-divine-wind-a5214j2y.us-east-2.aws.neon.tech`)
- **Local Dev Environment:** `http://localhost:3000` (Next.js) + `http://127.0.0.1:8000` (FastAPI / SQLite)

---

## 1. Executive Summary

On November 13, 2026, the deployed Agentix web application experienced three compounding failures rendering the platform inoperable in production:
1. **Client-Side Exception on Initial Load:** Users visiting `https://agentix-bay.vercel.app` encountered a fatal Next.js crash:
   `Application error: a client-side exception has occurred while loading agentix-bay.vercel.app (see the browser console for more information)`.
2. **Authentication Disconnect & Token Invalidation:** Users attempting to log in encountered intermittent authentication errors, token rejection on backend routes (`401 Unauthorized: Could not validate credentials`), and `[auth][error] MissingSecret` exceptions in server logs.
3. **Data Ingestion Systemic Failure:** All dataset uploads failed at the `/api/v1/dataset/upload/complete` endpoint with HTTP `500 Internal Server Error`, completely halting data ingestion, exploratory data analysis, and the downstream 9-stage AutoML pipeline.

A comprehensive reliability engineering intervention was executed. Root causes were isolated, unit and browser regression tests were constructed, fixes were implemented across frontend and backend codebases, and end-to-end verification was completed on both local development environments and the live production cloud.

---

## 2. Root Cause Analysis (RCA)

### RCA 1: Client-Side Runtime Crash in `dashboard/page.tsx`
- **Symptom:** White-screen error on `/dashboard` and initial application navigation.
- **Root Cause:**
  In `frontend/src/app/(app)/dashboard/page.tsx`, the `aiStatus` state variable was initialized to `null`:
  ```tsx
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  ```
  During the initial render phase before the asynchronous `/api/v1/platform/ai-status` call resolved, the component attempted direct property access on `aiStatus`:
  ```tsx
  // Defective code in dashboard/page.tsx:
  {aiStatus.connected ? (
    <span className="text-emerald-600">Active</span>
  ) : (
    <span className="text-amber-600">Disconnected</span>
  )}
  ...
  <span>{aiStatus.provider}</span>
  ```
  Because `aiStatus` was `null`, JavaScript threw an unhandled `TypeError: Cannot read properties of null (reading 'connected')`. In React 18/19 without a localized boundary, this unhandled exception unmounted the entire component tree, triggering Next.js's fatal client-side error overlay.
- **Resolution:**
  Replaced all direct property reads with safe optional chaining (`aiStatus?.connected`, `aiStatus?.provider`) and fallback text in both `dashboard/page.tsx` and `settings/page.tsx` (`connectorStatus?.uptime_seconds`, `connectorStatus?.models`).

---

### RCA 2: Cross-Host JWT Signature Mismatch & NextAuth Secret Failure
- **Symptom:**
  - Login succeeded on NextAuth, but subsequent API calls to Render backend returned `401 Unauthorized: Could not validate credentials`.
  - NextAuth server logs exhibited `[auth][error] MissingSecret`.
- **Root Cause:**
  1. **Dual Secret Mismatch:** The Vercel frontend and Render backend were deployed with independent, unshared `JWT_SECRET_KEY` environment variables. When Next.js minted synthetic bearer tokens using its internal secret, Render's backend rejected them because the HMAC-SHA256 signature did not match Render's configured secret.
  2. **Empty String Environment Variables:** The `.env.production.local` file contained `AUTH_SECRET=""` and `NEXTAUTH_SECRET=""`. NextAuth v5 treated empty strings as falsy/empty rather than falling back to defaults, throwing fatal `MissingSecret` errors during cookie signing.
  3. **Backend User Synchronization Gap:** A user registering on the frontend Prisma database was not automatically synchronized into the FastAPI PostgreSQL database, causing credential verification against FastAPI `/api/v1/auth/login` to fail.
- **Resolution:**
  1. **BFF Token Relay Pattern:** Refactored `frontend/src/auth.config.ts`. During credential authorization, Next.js calls the FastAPI backend `/api/v1/auth/login` directly, retrieves the authentic backend-issued JWT token, and embeds it inside the secure session cookie (`backendAccessToken`).
  2. **Auto-Provisioning Bridge:** If the user exists in Prisma but not yet in FastAPI (e.g. during cloud migrations), `fetchBackendTokenForUser` automatically dispatches a registration request to `${backendBase}/api/v1/auth/register` to establish database parity.
  3. **Token Endpoint Prioritization:** Updated `frontend/src/app/api/auth/token/route.ts` to return `session.backendAccessToken` issued directly by FastAPI, ensuring 100% cryptographic compatibility with Render.
  4. **Sanitized Configuration:** Cleaned empty strings in `.env.production.local` and implemented defensive fallback secret generation in `auth.config.ts`.

---

### RCA 3: Data Ingestion 500 Error (Threadpool ContextVar Loss & Foreign Key Violation)
- **Symptom:**
  All dataset uploads failed at `/api/v1/dataset/upload/complete` with `500 Internal Server Error`, regardless of file format (`CSV`, `JSON`, `XLSX`, `Parquet`).
- **Root Cause:**
  In `backend/core/api/v1/routes_data.py`, `upload_complete` was declared as a synchronous function:
  ```python
  @router.post("/dataset/upload/complete")
  def upload_complete(request: UploadCompleteRequest, background_tasks: BackgroundTasks):
      user_id = current_user_id.get() or "guest_user"
      ...
      dataset = Dataset(name=dataset_name, owner_id=user_id, filepath=file_path)
      db.add(dataset)
      db.commit()
  ```
  FastAPI executes synchronous `def` endpoints in a separate worker thread via `anyio.to_thread.run_sync`.
  Because Python `contextvars.ContextVar` (`current_user_id`) does not cross thread boundaries unless explicitly copied, `current_user_id.get()` evaluated to `None`.
  The code defaulted to `"guest_user"`.
  However, in PostgreSQL (Neon), the `datasets` table enforces a strict foreign key:
  ```sql
  CONSTRAINT datasets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users (id)
  ```
  Because `"guest_user"` did not exist in the `users` table, PostgreSQL aborted the transaction with `IntegrityError: Key (owner_id)=(guest_user) is not present in table "users"`. This surfaced as an unhandled HTTP 500 error on every upload.
- **Resolution:**
  Refactored `upload_complete` to use FastAPI's dependency injection system:
  ```python
  @router.post("/dataset/upload/complete")
  def upload_complete(
      request: UploadCompleteRequest,
      background_tasks: BackgroundTasks,
      current_user: User = Depends(get_current_user),
  ):
      user_id = current_user.id
      ...
  ```
  `get_current_user` extracts and cryptographically validates the Bearer token, queries the active `User` record from the database, and injects the verified `current_user` directly into the route handler. `owner_id` is guaranteed to be a valid primary key from the `users` table, eliminating the foreign key violation entirely.

---

## 3. Timeline of Events

| Timestamp (UTC) | Phase | Action / Event |
| :--- | :--- | :--- |
| **02:45** | Detection | Incident flagged: Client-side exception on `agentix-bay.vercel.app`, login failures, and upload 500 errors. |
| **02:50** | Triage | Inspected browser console logs; captured unhandled null reference on `aiStatus.connected`. |
| **02:55** | Reproduction | Reproduced unauthenticated and authenticated failure paths using local Playwright headless browser. |
| **03:05** | Checkpoint | Created Git recovery checkpoint tag `checkpoint-pre-incident-recovery-20261113` on branch `production-deployment`. |
| **03:12** | Fix 1 | Patched `dashboard/page.tsx` and `settings/page.tsx` with defensive optional chaining. |
| **03:18** | Fix 2 | Implemented BFF Token Relay in `frontend/src/auth.config.ts` and `frontend/src/app/api/auth/token/route.ts`. |
| **03:22** | Fix 3 | Patched `backend/core/api/v1/routes_data.py` to inject `current_user: User = Depends(get_current_user)`. |
| **03:26** | Local Test | Executed test suites: 11 tests in `test_auth_session_regression.py` and `test_data_ingestion.py` passed 100%. |
| **03:31** | Deployment | Built and deployed frontend to Vercel production (`agentix-qug1vnyjj-thrilok-m.vercel.app` -> `agentix-bay.vercel.app`). Pushed backend commit `80091e8` to GitHub. |
| **03:36** | Prod Browser Test | Executed Playwright browser test on `https://agentix-bay.vercel.app`: 100% passed with zero console/page errors. |
| **03:39** | Prod E2E Ingestion | Uploaded dataset to live Render backend; complete 9-stage ML pipeline executed to 100% completion with LightGBM model fit. |
| **03:42** | Resolution | Production incident officially resolved and verified. |

---

## 4. Verification & Validation Evidence

### A. Production Playwright Full Browser Lifecycle Test
Executed headless Chrome browser against `https://agentix-bay.vercel.app`:
- **Unauthenticated route protection:** `GET /dashboard` cleanly redirected to `/login` (Status: PASSED)
- **Invalid credentials defense:** Surfaced error message with zero uncaught exceptions (Status: PASSED)
- **Valid credentials authentication:** Successfully authenticated `admin@agentix.com`, redirected to `/dashboard` (Status: PASSED)
- **Session persistence:** Maintained active session across hard page reloads (Status: PASSED)
- **Header user profile:** User menu rendered "Enterprise Admin" and `admin@agentix.com` (Status: PASSED)
- **Clean signout:** Terminated session and redirected to `/login` (Status: PASSED)
- **Console error telemetry:** `0` ClientFetchErrors, `0` unhandled page errors detected (Status: PASSED)

### B. Live Production Data Ingestion & 9-Stage Pipeline Execution
Executed live chunked dataset upload against `https://agentix-api-lord.onrender.com`:
```json
{
  "job_id": "8f2926de-21dd-4326-acf9-68517bcde72a",
  "status": "completed",
  "dataset_name": "ca96656d-3a60-402e-8a8a-c67b79fe06c5_churn_30_production.csv",
  "current_stage": "Complete",
  "current_stage_index": 9,
  "total_stages": 9,
  "progress": 100,
  "stages_executed": [
    "UploadAgent (success)",
    "ParserAgent (success - 30 rows, 5 cols, target: churn)",
    "ProfilingAgent (success - schemas, nulls, outliers, types)",
    "CleaningAgent (success - missing value imputation)",
    "EDAAgent (success - correlations and descriptive stats)",
    "FeatureEngineeringAgent (success)",
    "TrainingAgent (success - 32 candidate ranking, LightGBM fit)",
    "EvaluationAgent (success - Accuracy: 0.6667, F1: 0.5333, ROC-AUC: 0.5000)",
    "ReportAgent (success - summary generated)"
  ]
}
```

### C. Vercel-to-Render Proxy Rewrite Verification
Verified Next.js rewrite routing from `https://agentix-bay.vercel.app/api/v1/dataset/upload/init`:
- Returned HTTP `200 OK` with valid `upload_id`.
- Confirmed zero CORS friction and seamless token pass-through.

---

## 5. Preventative Actions & Long-Term Safeguards

1. **Mandatory Type Narrowing & Null Checks:** Enforce ESLint rules preventing unchecked property reads on asynchronous state models across all Next.js pages.
2. **Explicit Dependency Injection in FastAPI:** Deprecate thread-unsafe `ContextVar` lookups in synchronous endpoints; require explicit `Depends(get_current_user)` on all authenticated route handlers.
3. **Automated E2E CI Smoke Tests:** Add Playwright browser lifecycle and live chunked upload tests into the CI/CD pipeline before production promotion.
4. **Synchronized Secret Rotation:** Ensure environment variables across Vercel and Render are managed through centralized deployment workflows to prevent cryptographic drift.
