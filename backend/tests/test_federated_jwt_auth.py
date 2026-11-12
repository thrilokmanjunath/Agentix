from datetime import datetime, timedelta, timezone
import jwt
import pytest
from fastapi import HTTPException

import core.auth as auth_mod
from core.models.models import User
from core.repositories.database import SessionLocal


def test_federated_jwt_auto_provisions_user(monkeypatch):
    """Valid NextAuth-minted HS256 JWT auto-provisions an isolated FastAPI User row."""
    secret = "test-shared-jwt-secret-with-more-than-32-bytes"
    monkeypatch.setattr(auth_mod, "SECRET_KEY", secret)
    monkeypatch.setattr(auth_mod, "ENVIRONMENT", "production")

    unique_id = "cuid_fed_test_9911"
    unique_email = "federated-user-9911@example.com"

    db = SessionLocal()
    try:
        db.query(User).filter(User.email == unique_email).delete()
        db.commit()

        token = jwt.encode(
            {
                "sub": unique_id,
                "email": unique_email,
                "role": "user",
                "tenant_id": "default",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            },
            secret,
            algorithm="HS256",
        )

        user = auth_mod.get_current_user(token=token, db=db)
        assert user.id == unique_id
        assert user.email == unique_email
        assert user.role == "user"

        persisted = db.query(User).filter(User.id == unique_id).first()
        assert persisted is not None
        assert persisted.email == unique_email
    finally:
        db.query(User).filter(User.email == unique_email).delete()
        db.commit()
        db.close()


def test_production_rejects_missing_or_forged_jwt(monkeypatch):
    """Production mode fails closed with HTTP 401 when bearer JWT is missing or wrong-key."""
    secret = "test-shared-jwt-secret-with-more-than-32-bytes"
    monkeypatch.setattr(auth_mod, "SECRET_KEY", secret)
    monkeypatch.setattr(auth_mod, "ENVIRONMENT", "production")

    db = SessionLocal()
    try:
        with pytest.raises(HTTPException) as exc_missing:
            auth_mod.get_current_user(token=None, db=db)
        assert exc_missing.value.status_code == 401

        forged = jwt.encode(
            {
                "sub": "attacker",
                "email": "attacker@example.com",
                "role": "admin",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            },
            "wrong-signing-key-32-bytes-minimum",
            algorithm="HS256",
        )
        with pytest.raises(HTTPException) as exc_forged:
            auth_mod.get_current_user(token=forged, db=db)
        assert exc_forged.value.status_code == 401
    finally:
        db.close()
