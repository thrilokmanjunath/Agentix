import pytest

def test_user_2fa_and_session_models():
    from core.models.models import User, TwoFactorRecoveryCode, UserSession
    user = User(
        email="test_models@agentix.com",
        hashed_password="hash",
        two_factor_enabled=True,
        two_factor_secret_encrypted="enc_secret_blob"
    )
    assert user.two_factor_enabled is True
    assert user.two_factor_secret_encrypted == "enc_secret_blob"
    
    code = TwoFactorRecoveryCode(user_id="user-123", code_hash="sha256hash", used=False)
    assert code.used is False

    session = UserSession(user_id="user-123", session_token_hash="token_hash", revoked=False)
    assert session.revoked is False
