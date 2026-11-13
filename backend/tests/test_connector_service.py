import pytest
from core.services.connector_service import (
    generate_pairing_token,
    verify_pairing_token,
    ConnectorManager,
)
from core.services.llm_service import test_provider_connection as check_provider_conn, _validate_local_endpoint


def test_pairing_token_lifecycle():
    user_id = "test_user_42"
    token = generate_pairing_token(user_id)
    assert token.startswith("agx_")

    verified_uid = verify_pairing_token(token)
    assert verified_uid == user_id

    # Tampered token fails
    tampered = token[:-4] + "ffff"
    assert verify_pairing_token(tampered) is None

    # Invalid prefix fails
    assert verify_pairing_token("invalid_token") is None


def test_connector_manager_registration():
    cm = ConnectorManager()
    user_id = "user_alpha"
    assert not cm.is_connected(user_id)
    status_offline = cm.get_status(user_id)
    assert status_offline["connected"] is False
    assert status_offline["status"] == "offline"

    # Fake WS registration
    class FakeWS:
        pass

    meta = {"models": ["ollama/qwen2.5:3b", "lm_studio/meta-llama-3"], "version": "1.0.0"}
    cm.register(user_id, FakeWS(), meta)
    assert cm.is_connected(user_id)

    status_online = cm.get_status(user_id)
    assert status_online["connected"] is True
    assert status_online["status"] == "connected"
    assert len(status_online["models"]) == 2

    # Unregister
    cm.unregister(user_id)
    assert not cm.is_connected(user_id)


def test_validate_local_endpoint_security():
    # Permitted endpoints
    _validate_local_endpoint("http://127.0.0.1:11434")
    _validate_local_endpoint("http://localhost:1234")
    _validate_local_endpoint("http://192.168.1.50:11434")

    # SSRF / Cloud metadata prohibited
    with pytest.raises(Exception):
        _validate_local_endpoint("http://169.254.169.254/latest/meta-data")

    with pytest.raises(Exception):
        _validate_local_endpoint("http://metadata.google.internal/computeMetadata")


def test_test_provider_connection_connector():
    res = check_provider_conn("local_connector")
    assert res["provider"] == "local_connector"
    assert "status" in res
