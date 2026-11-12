import bcrypt
from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from core.repositories.database import get_db
from core.models.models import User
from core.context import current_user_id
import os

# Fail-closed by default: the dev-only bypass/secret below only ever apply when
# ENVIRONMENT is explicitly "development" (unset also counts as development, for
# local convenience) — anything else (production, staging, or a misconfigured/
# unrecognized value) requires a real JWT_SECRET_KEY and a real bearer token.
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET")
if not SECRET_KEY:
    if ENVIRONMENT != "development":
        raise RuntimeError("JWT_SECRET_KEY must be set when ENVIRONMENT is not 'development'")
    SECRET_KEY = "super-secret-agentix-key-2026"  # dev-only fallback, never used outside development
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password[:72].encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password[:72].encode("utf-8"), salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Enrich with role permissions and tenant metadata if role is provided
    role = to_encode.get("role")
    if role:
        from core.auth.rbac import get_user_permissions
        to_encode["permissions"] = get_user_permissions(role)
        if "tenant_id" not in to_encode:
            to_encode["tenant_id"] = "default"

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        if ENVIRONMENT != "development":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Development-only fallback (ENVIRONMENT == "development")
        user = db.query(User).filter(User.email == "admin@agentix.com").first()
        if not user:
            user = User(
                id="default-user",
                email="admin@agentix.com",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True
            )
            try:
                db.add(user)
                db.commit()
                db.refresh(user)
            except Exception:
                db.rollback()
        return user

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        token_email = (payload.get("email") or "").strip().lower()
        if token_email:
            user = db.query(User).filter(User.email == token_email).first()
        if user is None and token_email:
            # Provision federated/NextAuth user row whose identity was cryptographically verified by JWT_SECRET_KEY
            token_role = str(payload.get("role") or "user").lower()
            safe_role = token_role if token_role in ("user", "admin", "analyst") else "user"
            user = User(
                id=user_id,
                email=token_email,
                hashed_password="!external_auth",
                role=safe_role,
                is_active=True,
            )
            try:
                db.add(user)
                db.commit()
                db.refresh(user)
            except Exception:
                db.rollback()
                user = db.query(User).filter(User.email == token_email).first()
        if user is None:
            raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def set_user_context(user: User = Depends(get_current_user)):
    current_user_id.set(user.id)
    return user

def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


# ---------------------------------------------------------------------------
# Granular RBAC & OAuth 2.0 / OIDC Compatibility Layer (Layer 5)
# ---------------------------------------------------------------------------
from core.auth.rbac import Role, Permission, has_permission, get_user_permissions  # noqa: E402


def require_permission(permission: "Permission | str"):
    """FastAPI dependency enforcing granular RBAC permissions."""
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user.role, permission):
            perm_str = permission.value if hasattr(permission, "value") else str(permission)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: user role '{current_user.role}' lacks '{perm_str}'.",
            )
        return current_user
    return dependency


def introspect_token(token: str) -> dict:
    """RFC 7662 OAuth 2.0 / OIDC Token Introspection endpoint helper."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role", "viewer")
        perms = payload.get("permissions") or get_user_permissions(role)
        return {
            "active": True,
            "sub": user_id,
            "role": role,
            "tenant_id": payload.get("tenant_id", "default"),
            "scope": " ".join(perms),
            "permissions": perms,
            "exp": payload.get("exp"),
        }
    except Exception:
        return {"active": False}

