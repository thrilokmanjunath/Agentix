import pytest
from datetime import datetime, timezone, timedelta
from core.models.models import User
from core.repositories.database import SessionLocal

def test_verify_google_claims_valid():
    from core.auth.google_oauth import verify_google_claims
    now = datetime.now(timezone.utc).timestamp()
    claims = {
        "iss": "https://accounts.google.com",
        "aud": "mock-client-id",
        "email": "user@example.com",
        "email_verified": True,
        "sub": "google-sub-12345",
        "exp": now + 3600,
        "name": "Jane Doe",
    }
    verified = verify_google_claims(claims, client_id="mock-client-id")
    assert verified["email"] == "user@example.com"
    assert verified["sub"] == "google-sub-12345"

def test_verify_google_claims_rejects_unverified_email():
    from core.auth.google_oauth import verify_google_claims
    now = datetime.now(timezone.utc).timestamp()
    with pytest.raises(ValueError, match="Email not verified"):
        verify_google_claims({
            "iss": "https://accounts.google.com",
            "aud": "mock-client-id",
            "email": "user@example.com",
            "email_verified": False,
            "sub": "google-123",
            "exp": now + 3600,
        }, client_id="mock-client-id")

def test_verify_google_claims_rejects_mismatched_audience():
    from core.auth.google_oauth import verify_google_claims
    now = datetime.now(timezone.utc).timestamp()
    with pytest.raises(ValueError, match="Audience mismatch"):
        verify_google_claims({
            "iss": "https://accounts.google.com",
            "aud": "attacker-client-id",
            "email": "user@example.com",
            "email_verified": True,
            "sub": "google-123",
            "exp": now + 3600,
        }, client_id="real-client-id")

def test_resolve_or_create_google_user():
    from core.auth.google_oauth import resolve_or_create_google_user
    db = SessionLocal()
    test_email = "test-oauth-resolution@agentix.com"
    try:
        db.query(User).filter(User.email == test_email).delete()
        db.commit()

        claims = {
            "iss": "https://accounts.google.com",
            "aud": "mock-client-id",
            "email": test_email,
            "email_verified": True,
            "sub": "google-sub-unique-9988",
            "name": "OAuth User",
        }
        user, created = resolve_or_create_google_user(db, claims)
        assert created is True
        assert user.email == test_email
        assert user.role == "user"

        # Resolve again -> should return existing user with created=False
        existing_user, created_again = resolve_or_create_google_user(db, claims)
        assert created_again is False
        assert existing_user.id == user.id
    finally:
        db.query(User).filter(User.email == test_email).delete()
        db.commit()
        db.close()
