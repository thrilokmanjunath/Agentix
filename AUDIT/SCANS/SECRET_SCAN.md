# Secret & Credential Scanning Report

**Scan Date:** November 2026  
**Auditor:** DevSecOps Team  
**Scope:** Whole repository (`agentix-recovery-backup-2026`)

---

## 1. Scan Methodology

Automated regex and entropy analysis was conducted using `git grep` and pattern matchers targeting API keys, private tokens, passwords, database URLs, and cryptographic secrets across all codebases, Dockerfiles, and configuration files.

---

## 2. Identified Hardcoded Credentials & Secrets

### 2.1 Confirmed Hardcoded Credentials in Source Code

| Location | Parameter | Exposure Type | Severity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `frontend/src/auth.config.ts:26` | `email: "admin@agentix.com"`, `password: "admin"` | Plaintext hardcoded credentials | **High** | The NextAuth Credentials provider directly compares input to hardcoded `"admin@agentix.com"` and `"admin"`, immediately granting an ADMIN session to anyone entering them. |
| `frontend/src/app/api/users/settings/route.ts:17` | `apiKey: "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"` | Exposed mock secret file | **Medium** | Stored in unauthenticated world-readable file `data/settings.json`. |
| `backend/core/auth/__init__.py:23` | `SECRET_KEY = "super-secret-agentix-key-2026"` | Hardcoded dev cryptographic secret | **Medium** | Predictable JWT signing key enabled whenever `ENVIRONMENT` is default or `"development"`. |
| `backend/core/auth/__init__.py:60` | `hashed_password=get_password_hash("admin123")` | Default admin password | **Medium** | Auto-provisions `admin@agentix.com` with password `"admin123"` upon unauthenticated access. |
| `docker-compose.yml:25,37` | `POSTGRES_PASSWORD: agentixpass` | Plaintext database password | **Low** | Default credentials hardcoded in Compose configuration. |

### 2.2 Environment Variable Secrets

| File | Variable | Status |
| :--- | :--- | :--- |
| `.env.example` | `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, `NVIDIA_API_KEY` | Placeholder values (Safe) |
| `.env.production.example` | `JWT_SECRET`, `OPENAI_API_KEY` | Placeholder values (Safe) |
| `backend/.env.example` | `DATABASE_URL`, `GEMINI_API_KEY`, `SENTRY_DSN` | Placeholder values (Safe) |

---

## 3. Remediation Actions

1. Remove hardcoded `"admin"` check from `frontend/src/auth.config.ts`. Password verification must use secure bcrypt hashing against database records.
2. Ensure `backend/core/auth/__init__.py` accepts environment-configured secret (`JWT_SECRET_KEY` or `JWT_SECRET`), falling back to a securely generated random ephemeral secret in development with warning logs.
3. Migrate `data/settings.json` sensitive keys into secure database storage (`User.preferences` or `UserSettings`) with masking.
