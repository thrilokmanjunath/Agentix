import pytest
from core.config import settings
from core.services.llm_service import (
    generate,
    test_provider_connection as check_provider_connection,
    LLMUnavailableError,
    _validate_local_endpoint
)
from core.hardware.models import ModelRegistry
from core.engines.execution import ExecutionEngine


def test_validate_local_endpoint_blocks_ssrf():
    """Verify SSRF protection rejects cloud metadata and unpermitted external endpoints."""
    with pytest.raises(LLMUnavailableError) as exc:
        _validate_local_endpoint("http://169.254.169.254/latest/meta-data")
    assert "Prohibited metadata" in str(exc.value)

    with pytest.raises(LLMUnavailableError) as exc:
        _validate_local_endpoint("http://evil-attacker.com:11434")
    assert "not a permitted local inference interface" in str(exc.value)

    # Valid loopback must pass without error
    _validate_local_endpoint("http://127.0.0.1:11434")
    _validate_local_endpoint("http://localhost:1234/v1")


def test_local_only_mode_blocks_cloud_providers(monkeypatch):
    """Verify that institutional local-only policy strictly blocks external cloud inference."""
    monkeypatch.setattr(settings, "AI_INFERENCE_MODE", "local")
    with pytest.raises(LLMUnavailableError) as exc:
        generate("Hello", provider="gemini")
    assert "blocked by institutional local-only policy" in str(exc.value)

    with pytest.raises(LLMUnavailableError) as exc:
        generate("Hello", provider="openai")
    assert "blocked by institutional local-only policy" in str(exc.value)


def test_hardware_memory_recommendations():
    """Verify that hardware memory recommendations provide sizing guidelines."""
    guidance = ModelRegistry.get_memory_recommendation()
    assert "total_ram_gb" in guidance
    assert "available_ram_gb" in guidance
    assert "recommended_parameters" in guidance
    assert guidance["available_ram_gb"] > 0


def test_ollama_discovery_and_generation():
    """Verify discovery of local Ollama models and direct execution if running."""
    models = ModelRegistry.get_ollama_models()
    # On this local machine, Ollama is running with models
    if models:
        model_name = models[0]["name"]
        response = generate("Answer 'OK' and nothing else.", model=model_name, provider="ollama", timeout=15)
        assert isinstance(response, str)
        assert len(response) > 0


def test_test_provider_connection_reporting():
    """Verify test_provider_connection returns structured diagnostic status."""
    res_ollama = check_provider_connection("ollama")
    assert "status" in res_ollama
    assert res_ollama["provider"] == "ollama"

    res_missing_cloud = check_provider_connection("openai")
    assert res_missing_cloud["status"] in ("configured", "unconfigured", "connected")


def test_model_selection_for_available_api_key(monkeypatch):
    """Verify ExecutionEngine selects requested and configured API-key models when inference_mode != local."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-fake-gemini-key-12345")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")
    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "AI_INFERENCE_MODE", "auto")

    # No local override when cloud selected
    monkeypatch.setattr(ModelRegistry, "get_ollama_models", staticmethod(lambda: []))
    monkeypatch.setattr(ModelRegistry, "get_lm_studio_models", staticmethod(lambda: []))

    resolved = ExecutionEngine.select_llm_provider(
        requested_model="gemini-3-flash-preview",
        requested_provider="gemini",
    )
    assert resolved["provider"] == "gemini"
    assert resolved["model"] == "gemini-3-flash-preview"

    registry = ModelRegistry.get_registry()
    assert registry["gemini_available"] is True
    assert any(m["name"] == "gemini-3.5-flash" and m["provider"] == "gemini" for m in registry["available_models"])

    # In strict local mode, cloud routing is blocked even if key exists
    monkeypatch.setattr(settings, "AI_INFERENCE_MODE", "local")
    blocked = ExecutionEngine.select_llm_provider(requested_model="gemini-3-flash-preview", requested_provider="gemini")
    assert blocked["provider"] == "none"


def test_runtime_ai_config_persistence_masks_keys(monkeypatch, tmp_path):
    """Verify save_runtime_ai_config persists model choices safely without exposing raw secrets."""
    import core.services.llm_service as llm_svc

    tmp_cfg = tmp_path / "ai_runtime_config.json"
    monkeypatch.setattr(llm_svc, "_RUNTIME_CONFIG_PATH", str(tmp_cfg))
    monkeypatch.setattr(settings, "AI_PROVIDER", "ollama")
    monkeypatch.setattr(settings, "AI_INFERENCE_MODE", "local")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "AIzaSyTestSecretKey987654")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")

    masked = llm_svc.save_runtime_ai_config({
        "ai_provider": "gemini",
        "active_model": "gemini-2.5-pro",
        "inference_mode": "auto",
        "gemini_api_key": "AIzaSy...5678",  # masked string must NOT overwrite real secret
    })

    assert masked["ai_provider"] == "gemini"
    assert masked["gemini_model"] == "gemini-2.5-pro"
    assert masked["inference_mode"] == "auto"
    assert settings.GEMINI_API_KEY == "AIzaSyTestSecretKey987654"
    assert masked["gemini_key_masked"] == "AIzaSy...7654"
    assert "SecretKey" not in str(masked)


def test_installed_local_manifests_appear_in_registry_when_daemon_offline(monkeypatch, tmp_path):
    """Verify local Ollama models on disk appear in unified available_models even when daemon is stopped."""
    manifests_dir = tmp_path / "manifests-v2" / "ollama.com" / "library" / "qwen2.5"
    manifests_dir.mkdir(parents=True)
    (manifests_dir / "3b").write_text('{"layers": [{"size": 1073741824}]}', encoding="utf-8")

    monkeypatch.setenv("OLLAMA_MODELS", str(tmp_path))
    monkeypatch.setattr(ModelRegistry, "get_ollama_models", staticmethod(lambda: []))
    monkeypatch.setattr(ModelRegistry, "get_lm_studio_models", staticmethod(lambda: []))

    reg = ModelRegistry.get_registry()
    installed_names = [m["name"] for m in reg["installed_local_models"]]
    assert "qwen2.5:3b" in installed_names
    assert any(m["name"] == "qwen2.5:3b" and m["is_local"] is True for m in reg["available_models"])
