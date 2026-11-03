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
    assert res_missing_cloud["status"] in ("configured", "unconfigured")
