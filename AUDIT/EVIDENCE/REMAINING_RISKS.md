# Evidence: Residual Risks and Production Hardening

**Assessment Date:** November 3, 2026  
**Auditor:** Principal DevSecOps & Security Architect  
**Scope:** Post-Remediation Risk Analysis and Deployment Advisory  

---

## 1. Residual Risk Summary

Following the implementation of all security patches and verification tests, the core vulnerabilities (critical multi-tenant leakage, privilege escalation, unauthenticated API access, container root execution) have been resolved. 

The residual risks detailed below represent environmental, architectural, and production-scale operational factors that must be addressed during production deployment.

---

## 2. Risk Register & Recommendations

### 2.1 Distributed Rate Limiting via Redis
- **Current State:** The rate limiter in `backend/core/middleware/security.py` operates in-memory using an ASGI sliding-window dictionary per process.
- **Risk:** In a multi-worker production deployment (e.g., Uvicorn with 4 workers or multiple Kubernetes pods), each worker maintains an independent rate limit counter, allowing attackers to multiply the effective request threshold by the worker count.
- **Remediation:** In production, wire the rate limiter to the existing Redis instance (`redis.from_url(os.getenv("REDIS_URL"))`) using atomic Redis pipelines (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`).

### 2.2 Frontend Node.js Dependencies (`package-lock.json`)
- **Current State:** `frontend/package-lock.json` contains 49 known vulnerabilities across transitive dependencies, including Next.js canary issues and ReDoS vulnerabilities in `cross-spawn` and `micromatch`.
- **Risk:** Server-side request forgery (SSRF) in Next.js image optimization and potential regular expression denial of service.
- **Remediation:** During the production CI build, execute:
  ```bash
  cd frontend
  npm audit fix --force
  npm install next@14.2.16
  ```

### 2.3 Production TLS Termination & Reverse Proxy
- **Current State:** Backend Uvicorn and Frontend Next.js listen on plain HTTP.
- **Risk:** Cleartext HTTP traffic across external networks exposes authorization bearer tokens and sensitive dataset payloads to interception.
- **Remediation:** Enforce TLS 1.3 termination at the ingress or reverse proxy layer (e.g., Nginx, Traefik, or AWS ALB) with HSTS preloading enabled.

### 2.4 Production Database Configuration (PostgreSQL vs. SQLite)
- **Current State:** Backend defaults to `sqlite:///./agentix.db` when `DATABASE_URL` is omitted.
- **Risk:** While SQLite WAL mode supports local testing, high-concurrency production deployments will experience file lock contention and inability to scale horizontally.
- **Remediation:** Ensure production environments set `DATABASE_URL=postgresql://agentix:password@db:5432/agentix` as configured in `docker-compose.yml`.

### 2.5 Advanced LLM Guardrails (Indirect Prompt Injection)
- **Current State:** Direct instruction overrides (`ignore previous instructions`, `system prompt extraction`) and query length are sanitized in `/api/v1/platform/chat`.
- **Risk:** Complex indirect prompt injection embedded inside untrusted uploaded tabular CSV cells (e.g., a customer review column containing hidden adversarial text) could still influence model reasoning.
- **Remediation:** Integrate a dedicated model security guardrail (such as NeMo Guardrails, Lakera Guard, or Llama Guard) as a secondary validation layer on model inputs and outputs.

### 2.6 Cryptographic Secret Rotation
- **Current State:** Hardcoded development secret fallback is disabled outside `ENVIRONMENT=development`.
- **Risk:** If administrators configure a static, low-entropy `JWT_SECRET_KEY` in production, tokens could be vulnerable to offline brute-force attacks.
- **Remediation:** Enforce minimum 256-bit entropy (`openssl rand -hex 32`) for `JWT_SECRET_KEY` and inject secrets using an enterprise secret store (e.g., AWS Secrets Manager, HashiCorp Vault).
