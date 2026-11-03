# Agentix Functional Bug Reports

**Audit Date:** November 2026  
**Status:** Audited & Confirmed  
**Target:** Local Workspace Codebase  

---

## Bug ID: BUG-01
- **Affected Component:** Frontend Database Client / Prisma Singleton
- **File Path & Line Number:** Missing file `frontend/src/lib/prisma.ts`; imported by `frontend/src/auth.ts:4`, `frontend/src/auth.config.ts:4`, `frontend/src/app/api/admin/route.ts:3`, `frontend/src/app/api/datasets/route.ts:3`, `frontend/src/app/api/workspaces/route.ts:3`, `frontend/src/app/api/dashboard/route.ts:3`, `frontend/src/app/api/sessions/route.ts:3`, `frontend/src/app/api/notifications/route.ts:3`, `frontend/src/app/api/activity-logs/route.ts:3`
- **Description:** Nine core frontend files and all authenticated API routes import `prisma` from `@/lib/prisma`. The directory `frontend/src/lib/` does not exist and no `prisma.ts` file is present in the repository.
- **Reproduction Steps:**
  1. Navigate to `frontend/`.
  2. Execute `npm run build` or invoke any endpoint such as `POST /api/datasets` or `GET /api/workspaces`.
  3. Observe build failure with `Module not found: Can't resolve '@/lib/prisma'`.
- **Expected Behavior:** Next.js compiles and API routes connect to the database via a globally cached Prisma singleton instance.
- **Actual Behavior:** Compilation failure or runtime `MODULE_NOT_FOUND` crash.
- **Severity:** Critical
- **Root Cause:** Accidental omission of `prisma.ts` utility during code migration or refactoring.
- **Proposed Correction:** Create `frontend/src/lib/prisma.ts` exporting a globally-cached `PrismaClient` with both default and named exports.
- **Verification Result:** Pending patch execution.

---

## Bug ID: BUG-02
- **Affected Component:** Frontend Session & Notification API Handlers
- **File Path & Line Number:** `frontend/src/app/api/sessions/route.ts:32-34` and `frontend/src/app/api/notifications/route.ts:38-41`
- **Description:** `prisma.session.delete({ where: { id: sessionId, userId } })` and `prisma.notification.update({ where: { id, userId }, data: { read: true } })` pass compound clauses `{ id, userId }` to Prisma `delete` and `update`. In Prisma, `delete` and `update` require unique constraints (`@unique` or `@id`). The schema defines no `@@unique([id, userId])` on either model.
- **Reproduction Steps:**
  1. Authenticate as a user.
  2. Send `DELETE /api/sessions` with `{"sessionId": "test-session-id"}`.
  3. Observe Prisma runtime exception: `Argument 'where' of type ... needs at least one of 'id' or 'sessionToken'`.
- **Expected Behavior:** The user's active session or notification is updated/deleted cleanly without schema validation exceptions.
- **Actual Behavior:** 500 Internal Server Error with Prisma client schema error.
- **Severity:** High
- **Root Cause:** Treating Prisma's `delete` and `update` methods as SQL `WHERE` clauses instead of using `deleteMany` / `updateMany` or verifying ownership prior to unique `id` operations.
- **Proposed Correction:** Use `prisma.session.deleteMany({ where: { id: sessionId, userId } })` and `prisma.notification.updateMany({ where: { id, userId }, data: { read: true } })`.
- **Verification Result:** Pending patch execution.

---

## Bug ID: BUG-03
- **Affected Component:** Frontend Backend Integration / Zustand Store
- **File Path & Line Number:** `frontend/src/store/platformStore.ts:134-135, 259, 280, 295`, `frontend/src/app/api/dashboard/route.ts:62, 84`, `frontend/src/app/api/benchmark-stats/route.ts:8, 12`
- **Description:** `.env.example` and `docker-compose.yml` configure `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`. Frontend code appends `/api/v1/...` directly to `NEXT_PUBLIC_API_URL`, resulting in double paths such as `http://localhost:8000/api/v1/api/v1/platform/dashboard-metrics`.
- **Reproduction Steps:**
  1. Set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` in environment.
  2. Open the frontend dashboard and observe network traffic.
  3. Notice requests to `http://localhost:8000/api/v1/api/v1/platform/dashboard-metrics` failing with HTTP 404 Not Found.
- **Expected Behavior:** Requests route to `http://localhost:8000/api/v1/platform/dashboard-metrics`.
- **Actual Behavior:** HTTP 404 Not Found across all platform metrics and file chunk upload requests.
- **Severity:** High
- **Root Cause:** Lack of URL normalization when joining `NEXT_PUBLIC_API_URL` with `/api/v1` routes.
- **Proposed Correction:** Strip any trailing `/api/v1` or `/api/v1/` from `backendBase` before constructing endpoint URLs.
- **Verification Result:** Pending patch execution.

---

## Bug ID: BUG-04
- **Affected Component:** Frontend Next.js Middleware Route Protection
- **File Path & Line Number:** `frontend/src/middleware.ts:36`
- **Description:** The matcher configuration `matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]` explicitly excludes `api` from authentication middleware. All internal API routes (`/api/*`) are therefore bypassed by edge authentication checks.
- **Reproduction Steps:**
  1. Send an unauthenticated HTTP GET request to `/api/users/profile` or `/api/users/settings`.
  2. Observe that the middleware does not intercept the request, allowing unauthenticated access to the route handlers.
- **Expected Behavior:** Protected API routes require authentication unless explicitly marked public.
- **Actual Behavior:** Edge middleware executes zero authentication checks on any `/api/*` route.
- **Severity:** High
- **Root Cause:** Overly permissive negative lookahead regex in the middleware matcher.
- **Proposed Correction:** Require session authentication explicitly inside individual route handlers or adjust matcher to protect private API routes.
- **Verification Result:** Pending patch execution.

---

## Bug ID: BUG-05
- **Affected Component:** Backend Dependencies
- **File Path & Line Number:** `backend/requirements.txt`
- **Description:** The Python backend imports `pydantic_settings.BaseSettings`, `import jwt`, and `aiofiles`. None of these three libraries are listed in `backend/requirements.txt`.
- **Reproduction Steps:**
  1. Build a fresh virtual environment from `backend/requirements.txt`.
  2. Run `python -m uvicorn core.api.main:app`.
  3. Observe `ModuleNotFoundError: No module named 'pydantic_settings'`.
- **Expected Behavior:** All imported runtime modules are specified in `backend/requirements.txt`.
- **Actual Behavior:** Startup failure on clean installations.
- **Severity:** High
- **Root Cause:** Incomplete dependency enumeration during Python 3.12 / Pydantic v2 migration.
- **Proposed Correction:** Add `pydantic-settings`, `pyjwt[crypto]`, and `aiofiles` to `backend/requirements.txt`.
- **Verification Result:** Confirmed by installing dependencies in `backend/.venv` and running test suite.

---

## Bug ID: BUG-06
- **Affected Component:** Backend Authentication Configuration
- **File Path & Line Number:** `backend/core/auth/__init__.py:19-23`, `docker-compose.yml:25`, `.env.example:10`
- **Description:** `backend/core/auth/__init__.py` reads `os.getenv("JWT_SECRET_KEY")`. However, `.env.example` provides `JWT_SECRET`. In `docker-compose.yml`, `ENVIRONMENT=production` is declared but neither variable is set, causing the backend to crash on boot with `RuntimeError: JWT_SECRET_KEY must be set when ENVIRONMENT is not 'development'`.
- **Reproduction Steps:**
  1. Start container with `docker-compose up backend`.
  2. Observe backend container exit with exit code 1 and RuntimeError.
- **Expected Behavior:** Backend reads the configured JWT secret reliably and boots cleanly.
- **Actual Behavior:** Fatal startup crash in production configuration.
- **Severity:** Medium
- **Root Cause:** Variable naming mismatch (`JWT_SECRET` vs `JWT_SECRET_KEY`).
- **Proposed Correction:** Check both `JWT_SECRET_KEY` and `JWT_SECRET` in `backend/core/auth/__init__.py` and `backend/core/config.py`.
- **Verification Result:** Pending patch execution.

---

## Bug ID: BUG-07
- **Affected Component:** Frontend Dockerfile
- **File Path & Line Number:** `frontend/Dockerfile:16`
- **Description:** `frontend/Dockerfile` specifies `COPY --from=builder /app/next.config.js ./`. The repository contains `next.config.ts`, not `next.config.js`.
- **Reproduction Steps:**
  1. Run `docker build -t frontend frontend/`.
  2. Observe failure at step 16: `COPY failed: file not found: /app/next.config.js`.
- **Expected Behavior:** Docker image builds successfully.
- **Actual Behavior:** Build failure due to missing file reference.
- **Severity:** Medium
- **Root Cause:** Rename of Next.js config to TypeScript without updating Dockerfile COPY instruction.
- **Proposed Correction:** Update instruction to `COPY --from=builder /app/next.config.ts ./` (or copy if exists).
- **Verification Result:** Pending patch execution.

---

## Bug ID: BUG-08
- **Affected Component:** Backend OpenTelemetry Telemetry
- **File Path & Line Number:** `backend/core/telemetry.py:43-46`
- **Description:** `ConsoleSpanExporter` inside `BatchSpanProcessor` writes spans asynchronously to standard output. When pytest or Python exits and closes stdout/stderr, the background thread attempts to write to the closed stream, generating `ValueError: I/O operation on closed file`.
- **Reproduction Steps:**
  1. Run `backend/.venv/bin/pytest backend/tests`.
  2. Observe unhandled exception traceback logged to terminal during shutdown.
- **Expected Behavior:** Clean shutdown without broken I/O traceback.
- **Actual Behavior:** Dirty error traceback emitted by OpenTelemetry batch processor.
- **Severity:** Medium
- **Root Cause:** Active console span exporter background thread alive during interpreter shutdown.
- **Proposed Correction:** Detect test/headless environment (`PYTEST_CURRENT_TEST` or `TESTING=true`) and default to `NoOpSpanExporter`.
- **Verification Result:** Pending patch execution.

---

## Bug ID: BUG-09
- **Affected Component:** Kubernetes Probes & Routing
- **File Path & Line Number:** `backend/core/api/v1/api.py:15-18`
- **Description:** Health check routes (`routes_system.py`) are mounted under `admin_router` (`/api/v1/admin/system/*`), which has `dependencies=[Depends(get_current_admin)]`. Standard Kubernetes liveness and readiness probes cannot pass admin credentials, causing pod restarts or failing health probes.
- **Reproduction Steps:**
  1. Send `GET /api/v1/system/health` as documented in `README.md`.
  2. Observe 404 Not Found (or 401 Unauthorized if directed to `/api/v1/admin/system/health`).
- **Expected Behavior:** Basic health, liveness, and readiness probes at `/api/v1/system/*` respond 200 OK without requiring authentication.
- **Actual Behavior:** 404 / 401 probe failure.
- **Severity:** Medium
- **Root Cause:** Bundling public probes into the admin-protected router.
- **Proposed Correction:** Mount `/system/health`, `/system/liveness`, `/system/readiness` as public routes while keeping sensitive OS metrics (`/system/system`) admin-protected.
- **Verification Result:** Pending patch execution.

---

## Bug ID: BUG-10
- **Affected Component:** Backend Token Lifecycle
- **File Path & Line Number:** `backend/core/auth/__init__.py:25, 41`
- **Description:** `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7` (7 days) is declared, but `create_access_token` falls back to `timedelta(minutes=15)` when `expires_delta` is omitted (which is the case in both `/register` and `/login`), prematurely expiring tokens in 15 minutes.
- **Reproduction Steps:**
  1. Call `POST /api/v1/auth/login`.
  2. Inspect the returned JWT `exp` timestamp.
  3. Note that `exp` is 15 minutes from issue time rather than 7 days.
- **Expected Behavior:** Token expiration matches `ACCESS_TOKEN_EXPIRE_MINUTES` configuration.
- **Actual Behavior:** 15-minute premature expiration.
- **Severity:** Medium
- **Root Cause:** Hardcoded 15-minute fallback inside `create_access_token`.
- **Proposed Correction:** Default to `timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)`.
- **Verification Result:** Pending patch execution.
