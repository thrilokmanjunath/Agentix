# Design Specification: Enterprise Authentication Overhaul (Google OAuth 2.0 + TOTP 2FA)

**Status:** Proposed  
**Author:** Principal Authentication Architect & Application Security Engineer  
**Date:** November 28, 2026  
**Target:** Agentix Autonomous ML & Generative AI Platform (Next.js 15 + FastAPI)

---

## 1. Intent & Context

Agentix is an institutional autonomous machine learning and generative AI platform. Authentication is the first gate protecting isolated tenant environments, machine learning pipelines, proprietary datasets, and executive inference models.

The current authentication system supports only basic email/password credentials and contains disabled placeholder routes (`501 Not Implemented`) for Google OAuth, no Two-Factor Authentication (TOTP), and an unpopulated session table.

The goal is to deliver an enterprise-grade, production-ready authentication architecture supporting:
1. Native email/password authentication with bcrypt hashing.
2. Official Google Sign-In using OAuth 2.0 and OpenID Connect (Authorization Code Flow with PKCE and Google JWKS token signature verification).
3. Google Authenticator-compatible Two-Factor Authentication (RFC 6238 TOTP) with AES-GCM encrypted secrets at rest, QR code setup, single-use hashed recovery backup codes, and replay protection.
4. Active session and device management with revocation capabilities.
5. A refined UI/UX matching Agentix's teal glass aesthetic.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Google Sign-In:** Enable 1-click authentication via Google Identity Services using OAuth 2.0 / OIDC. Verify tokens cryptographically against Google's public JWKS.
- **Account Linking:** Safely associate verified Google identities with existing email/password accounts sharing the same verified email address.
- **RFC 6238 TOTP:** Enable users to enroll any standard authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) via a secure QR code and manual key.
- **Encrypted Secrets:** Encrypt all TOTP secrets at rest using AES-GCM with a 256-bit key.
- **Backup Codes:** Issue 10 single-use recovery codes stored as SHA-256 hashes.
- **2FA Challenge Gate:** Gate login sessions behind a 2FA challenge when two-factor authentication is active.
- **Session Revocation:** Track active client sessions and permit per-device or all-device revocation from the Settings Security tab.
- **Seamless UI Integration:** Elegant teal-glass UI for sign-in, sign-up, 2FA challenge, QR setup modal, and Security Settings.

### Non-Goals
- Introducing third-party managed auth vendors (no Auth0, Clerk, Firebase Auth, or Supabase).
- SMS or email-based OTP verification (TOTP authenticator app and backup codes are strictly prioritized for zero carrier dependency and high institutional security).

### Anti-Goals
- Plaintext storage or logging of TOTP secrets or backup codes.
- Allowing frontend-asserted Google user claims to authenticate without backend cryptographic validation.
- Breaking existing user data, demo accounts (`admin@agentix.com`), or active Next.js/FastAPI pipelines.

---

## 3. Approaches Considered

### Approach A: Dual-Engine Federated Authentication (Recommended)
- **Architecture:** Next.js 15 handles frontend authentication workflows and user interface (via NextAuth v5 + custom Server Actions), while the FastAPI backend acts as the authoritative cryptographic identity verifier and token minter.
- **Google OAuth:** Frontend initiates Google OAuth with PKCE parameters or standard redirect. Backend verifies Google `id_token` against Google public JWKS keys (`https://www.googleapis.com/oauth2/v3/certs`) verifying `iss`, `aud`, `exp`, and `email_verified`.
- **TOTP:** FastAPI backend generates and encrypts the TOTP secret, validates incoming 6-digit codes against time-drift windows (-1, 0, +1), maintains replay cache, and manages hashed recovery codes.
- **Pros:**
  - Preserves existing NextAuth v5 middleware and route protection in Next.js.
  - Retains backend-authoritative verification required for FastAPI API routes and local desktop sidecars.
  - Zero external vendor lock-in.
- **Cons:** Requires schema synchronization between Prisma (PostgreSQL) and SQLAlchemy (PostgreSQL / SQLite).

### Approach B: Frontend-Centric Auth with Backend Proxy
- **Architecture:** NextAuth handles all OAuth and TOTP in Next.js server actions; backend blindly trusts NextAuth JWTs signed by `JWT_SECRET_KEY`.
- **Trade-offs:** Weaker backend defense-in-depth. Desktop application and headless API consumers cannot authenticate directly with Google or TOTP without launching a Next.js server.
- **Verdict:** Rejected in favor of Approach A.

### Approach C: Pure Backend OAuth (Replacing NextAuth entirely)
- **Architecture:** Remove NextAuth; Next.js uses pure cookies and direct FastAPI endpoints for all auth.
- **Trade-offs:** High regression risk across Next.js 15 App Router server components, route middleware, and existing sessions.
- **Verdict:** Rejected to respect the directive to preserve working architecture.

---

## 4. Technical Architecture

### 4.1 Backend Cryptography & TOTP Engine (`backend/core/auth/`)
1. **AES-GCM Encryption (`backend/core/auth/crypto.py`):**
   - Encrypts TOTP secrets using `AESGCM` (from `cryptography.hazmat.primitives.ciphers.aead`).
   - Generates unique 96-bit IV per encryption. Returns base64 string `IV + Ciphertext + Tag`.
2. **RFC 6238 TOTP Engine (`backend/core/auth/totp.py`):**
   - Standard 30-second window, HMAC-SHA1, 6-digit code generation and verification.
   - Replay protection: In-memory sliding set or DB timestamp of last consumed time step.
   - QR Code Data URI generation: Pure Python SVG generator without external binary C dependencies, outputting base64 image data URI.
3. **Backup Codes:**
   - 10 alphanumeric codes (8 characters, formatted `XXXX-XXXX`).
   - Stored in `two_factor_recovery_codes` table with `code_hash = SHA256(code)`.

### 4.2 Google OAuth 2.0 & OIDC Verification (`backend/core/auth/google_oauth.py`)
1. **Verification Endpoint:** Accepts Google authorization `code` + `code_verifier` or Google `id_token` / `credential`.
2. **JWKS Token Validation:**
   - Fetches Google JWKS from `https://www.googleapis.com/oauth2/v3/certs` (cached for 1 hour).
   - Validates signature using matching `kid`.
   - Asserts:
     - `iss` in `["https://accounts.google.com", "accounts.google.com"]`
     - `aud == GOOGLE_CLIENT_ID`
     - `exp > current_time`
     - `email_verified == True`
3. **Account Resolution:**
   - Query user by `google_sub` or `email`.
   - If user exists: link account if not already linked; check if 2FA is required.
   - If new user: create user row, default workspace, and account link.

### 4.3 Database Schema Extensions
1. **User Extensions:**
   - `two_factor_enabled: bool` (default False)
   - `two_factor_secret_encrypted: str` (nullable)
   - `two_factor_confirmed_at: datetime` (nullable)
2. **Recovery Codes Table (`two_factor_recovery_codes`):**
   - `id: str (UUID / CUID)`
   - `user_id: str (FK users.id)`
   - `code_hash: str (SHA-256)`
   - `used: bool (default False)`
   - `used_at: datetime (nullable)`
   - `created_at: datetime`
3. **User Sessions Table (`user_sessions`):**
   - `id: str`
   - `user_id: str`
   - `session_token_hash: str`
   - `ip_address: str`
   - `user_agent: str`
   - `device_type: str`
   - `last_active: datetime`
   - `expires_at: datetime`
   - `revoked: bool (default False)`

### 4.4 Frontend Components & Pages
1. **Login Page (`frontend/src/app/login/page.tsx`):**
   - Google Sign-In button with official branding.
   - Divider: "Or authenticate with credentials".
   - 2FA Challenge Step:
     - 6 individual digit input boxes with auto-focus advance and paste support.
     - "Use recovery backup code" fallback toggle.
     - "Cancel and return to sign in".
2. **Settings Security Tab (`frontend/src/app/(app)/settings/page.tsx`):**
   - 2FA Card:
     - Current status badge (Protected with 2FA / Unprotected).
     - "Enable 2FA" button -> opens modal with QR code, secret key, 6-digit verification code input.
     - On successful activation -> displays 10 recovery codes with "Copy All" and "Download .txt" buttons.
     - "Disable 2FA" button -> requires password confirmation.
     - "View / Regenerate Backup Codes" modal.
   - Active Sessions Card:
     - List of connected devices (browser, OS, IP address, last active, current badge).
     - "Revoke" button per non-current session.
     - "Revoke All Other Sessions" button.
   - Connected Accounts Card:
     - Google account link status and email display.

---

## 5. Verification & Testing Plan
- **Automated Tests:**
  - `backend/tests/test_auth_totp.py`: Tests secret generation, encryption, code validation, window boundaries, replay protection, and backup code hashing.
  - `backend/tests/test_google_oauth.py`: Tests JWKS signature validation, invalid issuer/audience rejection, and account linking.
  - `backend/tests/test_session_management.py`: Tests session creation, listing, and revocation.
- **Full Build & Typecheck:**
  - `pytest backend/tests/`
  - `npm --prefix frontend run build`
