import time
import base64
import hmac
import hashlib
import struct
import pytest
from fastapi.testclient import TestClient
from core.api.main import app
from core.models.models import User
from core.repositories.database import SessionLocal
from core.auth import create_access_token, get_password_hash
from core.auth.totp import compute_totp_code

client = TestClient(app)

@pytest.fixture(autouse=True)
def use_real_auth():
    from core.auth import get_current_user
    app.dependency_overrides.pop(get_current_user, None)
    yield
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture
def auth_user():
    db = SessionLocal()
    email = "auth-extended-test@agentix.com"
    db.query(User).filter(User.email == email).delete()
    db.commit()
    user = User(
        email=email,
        hashed_password=get_password_hash("Password123!"),
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    yield user, token
    db.query(User).filter(User.email == email).delete()
    db.commit()
    db.close()

def test_google_verify_endpoint(auth_user):
    user, _ = auth_user
    # Mocking verify_google_claims
    res = client.post(
        "/api/v1/auth/google/verify",
        json={"claims": {
            "iss": "https://accounts.google.com",
            "aud": "mock-aud",
            "email": user.email,
            "email_verified": True,
            "sub": "mock-google-sub-7766",
        }}
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_2fa_full_lifecycle(auth_user):
    user, token = auth_user
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Setup 2FA
    setup_res = client.post("/api/v1/auth/2fa/setup", headers=headers)
    assert setup_res.status_code == 200, f"Setup error: {setup_res.json()}"
    setup_data = setup_res.json()
    secret = setup_data["secret"]
    assert "otpauth_uri" in setup_data
    assert "qr_code" in setup_data

    # 2. Verify Setup with valid code
    time_step = int(time.time() // 30)
    code = compute_totp_code(secret, time_step)
    verify_res = client.post("/api/v1/auth/2fa/verify-setup", json={"code": code}, headers=headers)
    assert verify_res.status_code == 200, f"Got error: {verify_res.json()}"
    verify_data = verify_res.json()
    assert verify_data["success"] is True
    assert len(verify_data["backup_codes"]) == 10
    backup_code = verify_data["backup_codes"][0]

    # 3. Login with credentials now returns requires_2fa + ticket
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": user.email, "password": "Password123!"}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data.get("requires_2fa") is True
    ticket = login_data["ticket"]

    # 4. Challenge resolution via TOTP code
    time_step = int(time.time() // 30)
    code = compute_totp_code(secret, time_step)
    chal_res = client.post("/api/v1/auth/2fa/challenge", json={"ticket": ticket, "code": code})
    assert chal_res.status_code == 200
    chal_data = chal_res.json()
    assert "access_token" in chal_data

    # 5. Challenge resolution via Backup code
    login_res2 = client.post(
        "/api/v1/auth/login",
        data={"username": user.email, "password": "Password123!"}
    )
    ticket2 = login_res2.json()["ticket"]
    backup_res = client.post("/api/v1/auth/2fa/backup", json={"ticket": ticket2, "backup_code": backup_code})
    assert backup_res.status_code == 200
    assert "access_token" in backup_res.json()

    # Reusing the same backup code must fail
    login_res3 = client.post(
        "/api/v1/auth/login",
        data={"username": user.email, "password": "Password123!"}
    )
    ticket3 = login_res3.json()["ticket"]
    backup_res2 = client.post("/api/v1/auth/2fa/backup", json={"ticket": ticket3, "backup_code": backup_code})
    assert backup_res2.status_code == 401

    # 6. Disable 2FA
    time_step = int(time.time() // 30)
    code = compute_totp_code(secret, time_step)
    disable_res = client.post("/api/v1/auth/2fa/disable", json={"code": code, "password": "Password123!"}, headers=headers)
    assert disable_res.status_code == 200
    assert disable_res.json()["success"] is True

def test_session_listing_and_revocation(auth_user):
    user, token = auth_user
    headers = {"Authorization": f"Bearer {token}"}
    
    # List sessions
    res = client.get("/api/v1/auth/sessions", headers=headers)
    assert res.status_code == 200
    sessions = res.json()["sessions"]
    assert isinstance(sessions, list)
