import os
import time
import json
import logging
from typing import Optional, Dict, Any, Tuple
import requests
import jwt
from jwt import PyJWKClient
from sqlalchemy.orm import Session
from core.models.models import User

logger = logging.getLogger(__name__)

GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"

_jwk_client: Optional[PyJWKClient] = None

def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(GOOGLE_JWKS_URL, cache_keys=True, max_cached_keys=16)
    return _jwk_client

def verify_google_claims(claims: Dict[str, Any], client_id: Optional[str] = None) -> Dict[str, Any]:
    """Validate Google OIDC identity claims strictly per specification."""
    iss = claims.get("iss")
    if iss not in GOOGLE_ISSUERS:
        raise ValueError(f"Invalid token issuer: {iss}")

    expected_aud = client_id or os.getenv("GOOGLE_CLIENT_ID") or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
    if expected_aud:
        aud = claims.get("aud")
        if aud != expected_aud:
            raise ValueError(f"Audience mismatch: expected {expected_aud}, got {aud}")

    if not claims.get("email_verified"):
        raise ValueError("Email not verified by Google identity provider")

    now = time.time()
    exp = claims.get("exp")
    if exp is not None and exp < now - 60: # 60s clock skew allowance
        raise ValueError("Google identity token has expired")

    email = claims.get("email", "").strip().lower()
    if not email:
        raise ValueError("Missing email address in Google token claims")

    return {
        "sub": claims.get("sub"),
        "email": email,
        "name": claims.get("name", email.split("@")[0]),
        "picture": claims.get("picture"),
        "email_verified": True,
    }

def verify_google_id_token(id_token_str: str, client_id: Optional[str] = None) -> Dict[str, Any]:
    """Verify Google ID token cryptographically against official Google Public JWKS."""
    expected_aud = client_id or os.getenv("GOOGLE_CLIENT_ID") or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
    jwk_client = _get_jwk_client()
    try:
        signing_key = jwk_client.get_signing_key_from_jwt(id_token_str)
        decoded = jwt.decode(
            id_token_str,
            signing_key.key,
            algorithms=["RS256"],
            audience=expected_aud if expected_aud else None,
            options={"verify_aud": bool(expected_aud)},
        )
        return verify_google_claims(decoded, client_id=expected_aud)
    except Exception as e:
        logger.error(f"[GoogleOAuth] JWKS verification failed: {e}")
        raise ValueError(f"Failed to cryptographically verify Google token: {e}")

def resolve_or_create_google_user(db: Session, google_claims: Dict[str, Any]) -> Tuple[User, bool]:
    """Resolve an existing user or safely provision a new user verified by Google."""
    email = google_claims["email"].strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user, False

    user = User(
        email=email,
        hashed_password="!google_oauth_federated",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, True
