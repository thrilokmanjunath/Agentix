# Agentix — Documented Changelog & Version History

**Product Name: Agentix**  
**Project Owner: Thrilok M**

---

## [Version 2.4.0] — 2026-11-04
### Enterprise 8-Layer AI Governance & Conversational Workspace Transformation
- **Feature (Master Conversational Workspace):** Completely redesigned `/agent-console` with 3-part layout: collapsible session sidebar with `⌘N` shortcut, date-grouped history, rich markdown formatting with syntax-highlighted code blocks, one-click copy buttons, floating auto-resizing composer, and execution telemetry badges.
- **Security (Enterprise 8-Layer Architecture):** Implemented all 8 security layers:
  - Layer 1: Pure ASGI `SecurityMiddleware` with `TenantTokenBucketLimiter` and strict security headers.
  - Layer 2: `PromptRegistry` with SHA-256 template hashing and delimiter boundary enclaves.
  - Layer 3: `TenantVectorStore` providing tenant-partitioned vector indexing and cosine similarity scoring.
  - Layer 4: `MCPRegistry` enforcing JSON-RPC schemas and risk tiers (`READ_ONLY`, `MUTATING`, `DESTRUCTIVE`).
  - Layer 5: Role-based access control matrix (`admin`, `data_scientist`, `analyst`, `viewer`) and RFC 7662 token introspection (`POST /api/v1/auth/oauth/introspect`).
  - Layer 6: `GuardrailEngine` implementing dual-stage regex/leetspeak/base64 jailbreak detection and bidirectional PII redaction.
  - Layer 7: Sub-5ms thread-safe `LLMCache` (SHA-256) and `DynamicModelRouter` (LIGHTWEIGHT, BALANCED, REASONING).
  - Layer 8: `AIEvaluator` automated factual faithfulness, relevancy, and context recall scoring.
- **Fix (Responsiveness):** Resolved tablet and mobile horizontal overflow in header navigation and hero telemetry widget across 4 viewports (Desktop, Laptop, Tablet, Mobile) with zero overflow verified via Playwright.

---

## [Version 2.3.0] — 2026-11-03
### Teal Glass Premium Enterprise Design System & Visibility Remediation
- **Design System:** Implemented cohesive semantic CSS custom property token architecture:
  - **Pearl Teal** (Light theme): Background `#F5FAF9`, Surface `#FFFFFF`, Secondary `#EAF5F2`, Text `#123B3B`, Accent `#168B83`.
  - **Obsidian Teal** (Dark theme): Background `#091B1F`, Surface `#10282D`, Secondary `#15343B`, Text `#E3F5F1`, Accent `#1DBFA8`.
- **Remediation:** Removed all hardcoded `text-slate-100`, `text-slate-200`, `bg-slate-900` classes across `data-dock`, `insights`, `intelligence-reports`, `knowledge-graph`, `history`, `settings`, and `profile`, eliminating all white-on-white and dark-on-dark contrast defects.
- **Fix (Layout):** Applied `min-w-0 overflow-hidden` to flex parents, preventing text truncation clipping.

---

## [Version 2.2.0] — 2026-11-03
### Security Remediation & Authentication Hardening
- **Fix (Auth.js v5):** Decoupled `PrismaAdapter(prisma)` in `auth.ts` behind `USE_DATABASE_ADAPTER === "true"` to prevent `CallbackRouteError` when local PostgreSQL is unprovisioned.
- **Security (IDOR Prevention):** Hardened `GET /jobs/{id}` and dataset endpoints to strictly verify `owner_id == current_user.id`.
- **Security (Mass Assignment):** Enforced immutable `role = "user"` on `POST /register` to prevent privilege escalation attacks.
- **Security (Fail-Closed Auth):** Gated development JWT secret fallback behind `ENVIRONMENT === "development"`, throwing a `RuntimeError` in staging and production if `JWT_SECRET_KEY` is unset.
- **Fix (API Endpoint Duplication):** Normalized all frontend API calls using `.replace(/\/api\/v1\/?$/, '')` to eliminate double `/api/v1/api/v1/` 404 routing errors.

---

## [Version 2.0.0] — 2026-11-02
### Initial Baseline & Reversible 9-Stage Pipeline Architecture
- Initial architecture release establishing the 9-stage analytical pipeline: UploadAgent, ParserAgent, ProfilingAgent, CleaningAgent, EDAAgent, FeatureEngineeringAgent, TrainingAgent, EvaluationAgent, and ReportAgent.
- Introduction of Apache Arrow / Parquet file lake for high-throughput tabular data serialization.
