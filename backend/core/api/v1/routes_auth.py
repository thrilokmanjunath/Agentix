import re
import os
import time
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import jwt

from core.repositories.database import get_db
from core.models.models import User, TwoFactorRecoveryCode, UserSession
from core.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    SECRET_KEY,
    ALGORITHM,
)
from core.auth.crypto import encrypt_secret, decrypt_secret
from core.auth.totp import (
    generate_totp_secret,
    get_totp_uri,
    generate_qr_svg_data_uri,
    verify_totp_code,
    generate_backup_codes,
    hash_backup_code,
)
from core.auth.google_oauth import (
    verify_google_id_token,
    verify_google_claims,
    resolve_or_create_google_user,
)

router = APIRouter()

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    role: str = "user"

class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    requires_2fa: Optional[bool] = False
    ticket: Optional[str] = None
    email: Optional[str] = None
    user: Optional[Dict[str, Any]] = None

class GoogleVerifyRequest(BaseModel):
    id_token: Optional[str] = None
    credential: Optional[str] = None
    claims: Optional[Dict[str, Any]] = None

class TwoFactorVerifySetupRequest(BaseModel):
    code: str

class TwoFactorChallengeRequest(BaseModel):
    ticket: str
    code: str

class TwoFactorBackupRequest(BaseModel):
    ticket: str
    backup_code: str

class TwoFactorDisableRequest(BaseModel):
    code: str
    password: Optional[str] = None

class RevokeSessionRequest(BaseModel):
    session_id: Optional[str] = None
    revoke_all_others: Optional[bool] = False

# ---------------------------------------------------------------------------
# Ticket & Session Helpers
# ---------------------------------------------------------------------------

def create_2fa_ticket(user_id: str, email: str) -> str:
    """Generate a short-lived (5 min) signed ticket for pending 2FA challenges."""
    expire = datetime.utcnow() + timedelta(minutes=5)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "2fa_ticket",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_2fa_ticket(ticket: str) -> Dict[str, Any]:
    """Validate a 2FA challenge ticket."""
    try:
        payload = jwt.decode(ticket, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "2fa_ticket":
            raise HTTPException(status_code=401, detail="Invalid 2FA challenge ticket type")
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Expired or invalid 2FA challenge ticket")

def record_user_session(db: Session, user_id: str, request: Optional[Request] = None) -> UserSession:
    """Record an active session for the authenticated user."""
    ip_addr = "127.0.0.1"
    ua = "Agentix Client"
    if request:
        client_host = getattr(request.client, "host", None)
        if client_host:
            ip_addr = client_host
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            ip_addr = fwd.split(",")[0].strip()
        ua = request.headers.get("user-agent", ua)
    
    device_type = "Desktop" if "Windows" in ua or "Macintosh" in ua or "Linux" in ua else "Mobile"
    token_hash = hashlib.sha256(os.urandom(32)).hexdigest()

    session = UserSession(
        user_id=user_id,
        session_token_hash=token_hash,
        ip_address=ip_addr,
        user_agent=ua[:255] if ua else None,
        device_type=device_type,
        last_active=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=30),
        revoked=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

# ---------------------------------------------------------------------------
# Native Email / Password Authentication
# ---------------------------------------------------------------------------

@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    clean_email = user.email.strip().lower()
    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    if len(user.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    db_user = db.query(User).filter(User.email == clean_email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(email=clean_email, hashed_password=hashed_password, role="user")
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token = create_access_token(data={"sub": db_user.id, "email": db_user.email, "role": db_user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": db_user.id, "email": db_user.email, "role": db_user.role},
    }

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    clean_email = form_data.username.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.two_factor_enabled:
        ticket = create_2fa_ticket(user.id, user.email)
        return {
            "requires_2fa": True,
            "ticket": ticket,
            "email": user.email,
            "access_token": "",
            "token_type": "bearer",
        }

    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    record_user_session(db, user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "role": user.role},
    }

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "two_factor_enabled": current_user.two_factor_enabled,
    }

# ---------------------------------------------------------------------------
# Google OAuth 2.0 / OIDC Verification
# ---------------------------------------------------------------------------

@router.post("/google/verify", response_model=Token)
def google_verify(req: GoogleVerifyRequest, db: Session = Depends(get_db)):
    """Verify Google OAuth credential/ID-token and resolve session or 2FA ticket."""
    claims: Optional[Dict[str, Any]] = None
    if req.claims:
        claims = verify_google_claims(req.claims)
    elif req.id_token or req.credential:
        raw_token = req.id_token or req.credential
        claims = verify_google_id_token(raw_token)
    else:
        raise HTTPException(status_code=400, detail="Missing Google identity token or credential")

    user, _ = resolve_or_create_google_user(db, claims)
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    if user.two_factor_enabled:
        ticket = create_2fa_ticket(user.id, user.email)
        return {
            "requires_2fa": True,
            "ticket": ticket,
            "email": user.email,
            "access_token": "",
            "token_type": "bearer",
        }

    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    record_user_session(db, user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "role": user.role},
    }

@router.get("/google/login")
def google_login():
    client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured on this server.",
        )
    return {"client_id": client_id, "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth"}

@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Please submit Google ID token to /api/v1/auth/google/verify.",
    )

# ---------------------------------------------------------------------------
# Two-Factor Authentication (RFC 6238 TOTP)
# ---------------------------------------------------------------------------

@router.post("/2fa/setup")
def setup_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate TOTP secret and QR code SVG for user enrollment."""
    secret = generate_totp_secret()
    otpauth_uri = get_totp_uri(secret, current_user.email, issuer="Agentix")
    qr_svg = generate_qr_svg_data_uri(otpauth_uri)
    
    # Encrypt secret and stage on user record (unconfirmed until verified)
    current_user.two_factor_secret_encrypted = encrypt_secret(secret)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {
        "secret": secret,
        "otpauth_uri": otpauth_uri,
        "qr_code": qr_svg,
    }

@router.post("/2fa/verify-setup")
def verify_setup_2fa(
    req: TwoFactorVerifySetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify code from authenticator app, activate 2FA, and return backup codes."""
    if not current_user.two_factor_secret_encrypted:
        raise HTTPException(status_code=400, detail="2FA setup has not been initiated")

    try:
        secret = decrypt_secret(current_user.two_factor_secret_encrypted)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt 2FA secret")

    is_valid, _ = verify_totp_code(secret, req.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid verification code. Check your authenticator app.")

    current_user.two_factor_enabled = True
    current_user.two_factor_confirmed_at = datetime.utcnow()
    db.add(current_user)

    # Generate 10 hashed backup recovery codes
    raw_backup_codes = generate_backup_codes(10)
    db.query(TwoFactorRecoveryCode).filter(TwoFactorRecoveryCode.user_id == current_user.id).delete()
    for code in raw_backup_codes:
        rec = TwoFactorRecoveryCode(
            user_id=current_user.id,
            code_hash=hash_backup_code(code),
            used=False,
        )
        db.add(rec)
    
    db.commit()

    return {
        "success": True,
        "backup_codes": raw_backup_codes,
    }

@router.post("/2fa/challenge", response_model=Token)
def challenge_2fa(req: TwoFactorChallengeRequest, db: Session = Depends(get_db)):
    """Resolve pending 2FA login challenge with 6-digit TOTP code."""
    payload = verify_2fa_ticket(req.ticket)
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.two_factor_enabled or not user.two_factor_secret_encrypted:
        raise HTTPException(status_code=401, detail="User account not configured for 2FA")

    try:
        secret = decrypt_secret(user.two_factor_secret_encrypted)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt authentication secret")

    is_valid, _ = verify_totp_code(secret, req.code)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid two-factor authentication code")

    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    record_user_session(db, user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "role": user.role},
    }

@router.post("/2fa/backup", response_model=Token)
def backup_2fa(req: TwoFactorBackupRequest, db: Session = Depends(get_db)):
    """Resolve pending 2FA login challenge with single-use recovery backup code."""
    payload = verify_2fa_ticket(req.ticket)
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.two_factor_enabled:
        raise HTTPException(status_code=401, detail="2FA is not enabled for this user")

    code_hash = hash_backup_code(req.backup_code)
    recovery_code = (
        db.query(TwoFactorRecoveryCode)
        .filter(
            TwoFactorRecoveryCode.user_id == user.id,
            TwoFactorRecoveryCode.code_hash == code_hash,
            TwoFactorRecoveryCode.used == False,
        )
        .first()
    )
    if not recovery_code:
        raise HTTPException(status_code=401, detail="Invalid or already consumed backup code")

    recovery_code.used = True
    recovery_code.used_at = datetime.utcnow()
    db.commit()

    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    record_user_session(db, user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "role": user.role},
    }

@router.post("/2fa/disable")
def disable_2fa(
    req: TwoFactorDisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable 2FA after validating current password and 6-digit TOTP code."""
    if not current_user.two_factor_enabled:
        return {"success": True, "message": "2FA is already disabled"}

    if current_user.hashed_password and not current_user.hashed_password.startswith("!"):
        if not req.password or not verify_password(req.password, current_user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid password verification")

    # Verify code
    try:
        secret = decrypt_secret(current_user.two_factor_secret_encrypted or "")
        is_valid, _ = verify_totp_code(secret, req.code)
    except Exception:
        is_valid = False

    if not is_valid:
        # Check if code is a valid backup code
        code_hash = hash_backup_code(req.code)
        rec = db.query(TwoFactorRecoveryCode).filter(
            TwoFactorRecoveryCode.user_id == current_user.id,
            TwoFactorRecoveryCode.code_hash == code_hash,
            TwoFactorRecoveryCode.used == False,
        ).first()
        if rec:
            is_valid = True
            rec.used = True

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    current_user.two_factor_enabled = False
    current_user.two_factor_secret_encrypted = None
    current_user.two_factor_confirmed_at = None
    db.add(current_user)
    db.query(TwoFactorRecoveryCode).filter(TwoFactorRecoveryCode.user_id == current_user.id).delete()
    db.commit()

    return {"success": True}

# ---------------------------------------------------------------------------
# Active Session Management
# ---------------------------------------------------------------------------

@router.get("/sessions")
def list_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List active sessions for the current authenticated user."""
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == current_user.id, UserSession.revoked == False)
        .order_by(UserSession.last_active.desc())
        .all()
    )
    return {
        "sessions": [
            {
                "id": s.id,
                "ip_address": s.ip_address,
                "user_agent": s.user_agent,
                "device_type": s.device_type,
                "last_active": s.last_active.isoformat() if s.last_active else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ]
    }

@router.post("/sessions/revoke")
def revoke_sessions(
    req: RevokeSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a specific session or all other sessions for the user."""
    if req.session_id:
        session = db.query(UserSession).filter(
            UserSession.id == req.session_id,
            UserSession.user_id == current_user.id,
        ).first()
        if session:
            session.revoked = True
            db.commit()
    elif req.revoke_all_others:
        db.query(UserSession).filter(
            UserSession.user_id == current_user.id,
        ).update({"revoked": True})
        db.commit()

    return {"success": True}

# ---------------------------------------------------------------------------
# OAuth Introspection
# ---------------------------------------------------------------------------

class IntrospectRequest(BaseModel):
    token: str

@router.post("/oauth/introspect")
def introspect_endpoint(req: IntrospectRequest):
    """RFC 7662 OAuth 2.0 / OIDC Token Introspection endpoint."""
    from core.auth import introspect_token
    return introspect_token(req.token)
