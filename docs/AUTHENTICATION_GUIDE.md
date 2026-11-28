# Agentix Enterprise Authentication Architecture & Deployment Guide

## 1. Executive Summary

Agentix features an enterprise-grade, defense-in-depth authentication system designed for zero-trust environments. The architecture is built around a **Dual-Engine Federated Model**:

- **FastAPI Core (`backend/core`)**: Serves as the cryptographic trust authority. Responsible for RS256 token verification against Google Public JWKS, AES-256-GCM symmetric encryption for TOTP secrets at rest, RFC 6238 time-based one-time password verification, replay protection, and device session auditing.
- **Next.js 15 (`frontend/`)**: Provides modern user experiences via Server Actions, NextAuth v5 federated credentials session management, Google Identity Services (GIS) button integration, responsive 2FA challenge flows, and institutional security settings.

---

## 2. Cryptographic Security Standards

| Component | Standard / Algorithm | Implementation Detail |
| :--- | :--- | :--- |
| **Google Sign-In** | OpenID Connect / OAuth 2.0 | RS256 signature verification via Google Public JWKS (`https://www.googleapis.com/oauth2/v3/certs`), PyJWKClient key caching, audience and expiration validation |
| **Password Hashing** | Bcrypt | Work factor 12, constant-time verification |
| **Two-Factor Auth (2FA)** | RFC 6238 TOTP | HMAC-SHA1, 30-second window, 6-digit codes, sliding window ($\pm 1$ step), timestamp replay protection |
| **Secret Storage** | AES-256-GCM | Encrypted with a 256-bit derived key (via PBKDF2/SHA-256 from `ENCRYPTION_KEY` or `JWT_SECRET`), random 96-bit nonce per encryption |
| **Recovery Codes** | SHA-256 Hashing | 10 alphanumeric single-use codes generated via cryptographically secure `secrets.token_hex(4)`, stored hashed |
| **Session Tracking** | UUIDv4 & Bearer JWT | Ephemeral and persistent session tokens with user-agent and IP binding |

---

## 3. Google Cloud Console Configuration

To enable Google Sign-In for your Agentix workspace:

### Step 1: Create OAuth 2.0 Credentials
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Project or create a new one: **Agentix AI Operating System**.
3. Go to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth client ID**.
5. Application type: **Web application**.
6. Name: `Agentix Platform Web Client`.

### Step 2: Configure Authorized Origins & Redirect URIs
Configure the following under **Authorized JavaScript origins**:
```
http://localhost:3000
http://localhost:8000
https://your-production-domain.com
```

Configure the following under **Authorized redirect URIs**:
```
http://localhost:3000/api/auth/callback/google
https://your-production-domain.com/api/auth/callback/google
```

### Step 3: Populate Environment Variables
In your `.env` or deployment settings:
```env
# Backend & Frontend Google Credentials
GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-client-secret>"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"

# Symmetric Encryption Key for TOTP Secrets (minimum 32 characters)
ENCRYPTION_KEY="<generate-a-secure-random-32-character-secret>"
```

---

## 4. Google Authenticator (TOTP) Workflow

### Enrollment Flow
1. User navigates to **Settings > Institutional Security > Two-Factor Authentication**.
2. Click **Enable 2FA**.
3. The server generates an RFC 6238 secret (`base32`), encrypts it via AES-256-GCM, and renders a standard `otpauth://totp/Agentix:<email>?secret=<secret>&issuer=Agentix` QR code SVG.
4. User scans the QR code in Google Authenticator, 1Password, or Microsoft Authenticator.
5. User enters the 6-digit code to verify sync and time calibration.
6. Upon successful verification:
   - `two_factor_enabled` is set to `True`.
   - 10 single-use recovery codes are generated, hashed with SHA-256, and displayed to the user with **Copy All** and **Download .txt** actions.

### Authentication & Interception Flow
1. User attempts login via Email/Password or Google Sign-In.
2. If `user.two_factor_enabled` is active:
   - Login returns `{ requires2fa: true, ticket: "<ephemeral-ticket>" }`.
   - No authenticated session is issued yet.
3. Frontend transitions immediately into the `TwoFactorChallenge` component.
4. User inputs either:
   - Their current 6-digit rotating TOTP code, OR
   - A single-use 8-character recovery backup code.
5. Upon successful validation, the ephemeral ticket is burned, the session is registered in `user_sessions`, and the authenticated JWT session is issued to NextAuth.

---

## 5. Active Session & Device Revocation

Agentix audits all active sessions in the database (`user_sessions`):
- Tracks client device type (Desktop, Laptop, Mobile), User Agent, IP address, creation timestamp, and last activity time.
- Users can view all active sessions in **Settings > Institutional Security > Active Workspace Sessions**.
- Any unauthorized or stale session can be revoked individually with immediate effect.
- Users can click **Revoke Others** to invalidate all remote sessions across devices with a single click.

---

## 6. Zero-Downtime Database Migration

The authentication upgrade does not require database wipes:
- Existing user accounts (`admin@agentix.com`, etc.) and passwords remain 100% intact.
- The database repository (`backend/core/repositories/database.py`) automatically checks and applies missing columns (`two_factor_enabled`, `two_factor_secret_encrypted`, `two_factor_confirmed_at`) with safe defaults (`DEFAULT 0`).
- Tables `two_factor_recovery_codes` and `user_sessions` are automatically created on first startup.
