import logging
import requests
import json
import time
from urllib.parse import urlparse
from typing import Optional, Dict, Any, List
from core.config import settings

logger = logging.getLogger("agentix_v2")


class LLMUnavailableError(Exception):
    """Raised when no LLM backend could service the request.
    Surfaced as an honest 'unavailable' state instead of fabricating responses."""
    pass


def _validate_local_endpoint(url: str) -> None:
    """Validate that local inference endpoints point to safe, trusted loopback or local networks (SSRF prevention)."""
    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            raise ValueError("Invalid endpoint URL")
        
        # Block cloud metadata services
        if hostname in ("169.254.169.254", "metadata.google.internal", "instance-data"):
            raise ValueError(f"Prohibited metadata destination: {hostname}")

        # Allow localhost, loopback, and standard private IP patterns
        allowed = (
            hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0")
            or hostname.startswith("192.168.")
            or hostname.startswith("10.")
            or hostname.startswith("172.16.")
            or hostname.startswith("172.17.")
            or hostname.startswith("172.18.")
            or hostname.startswith("172.19.")
            or hostname.startswith("172.20.")
            or hostname.startswith("172.21.")
            or hostname.startswith("172.22.")
            or hostname.startswith("172.23.")
            or hostname.startswith("172.24.")
            or hostname.startswith("172.25.")
            or hostname.startswith("172.26.")
            or hostname.startswith("172.27.")
            or hostname.startswith("172.28.")
            or hostname.startswith("172.29.")
            or hostname.startswith("172.30.")
            or hostname.startswith("172.31.")
        )
        if not allowed:
            raise ValueError(f"Endpoint '{hostname}' is not a permitted local inference interface.")
    except Exception as e:
        raise LLMUnavailableError(f"Endpoint validation failure: {e}")


def _generate_ollama(prompt: str, model: str, timeout: int) -> str:
    base_url = settings.OLLAMA_BASE_URL.rstrip('/')
    _validate_local_endpoint(base_url)
    try:
        resp = requests.post(
            f"{base_url}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=timeout,
        )
        resp.raise_for_status()
        text = resp.json().get("response", "").strip()
        if not text:
            raise LLMUnavailableError(f"Ollama model '{model}' returned an empty response.")
        return text
    except requests.RequestException as e:
        logger.warning(f"Ollama call failed: {e}")
        raise LLMUnavailableError(f"Ollama service error: {e}")


def _generate_lm_studio(prompt: str, model: str, timeout: int) -> str:
    base_url = settings.LM_STUDIO_BASE_URL.rstrip('/')
    _validate_local_endpoint(base_url)
    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "stream": False
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            raise LLMUnavailableError("LM Studio returned no response choices.")
        return choices[0].get("message", {}).get("content", "").strip()
    except requests.RequestException as e:
        logger.warning(f"LM Studio call failed: {e}")
        raise LLMUnavailableError(f"LM Studio service error: {e}")


def _generate_gemini(prompt: str, model: str, timeout: int) -> str:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise LLMUnavailableError("Google Gemini API key is not configured.")
    try:
        # Use direct REST API to avoid SDK version incompatibilities
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        resp = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise LLMUnavailableError("Gemini returned no candidates.")
        parts = candidates[0].get("content", {}).get("parts", [])
        return parts[0].get("text", "").strip() if parts else ""
    except Exception as e:
        logger.warning(f"Gemini call failed: {e}")
        raise LLMUnavailableError(f"Gemini service error: {e}")


def _generate_openai(prompt: str, model: str, timeout: int) -> str:
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise LLMUnavailableError("OpenAI API key is not configured.")
    base_url = settings.OPENAI_BASE_URL.rstrip('/')
    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            raise LLMUnavailableError("OpenAI returned no response choices.")
        return choices[0].get("message", {}).get("content", "").strip()
    except Exception as e:
        logger.warning(f"OpenAI call failed: {e}")
        raise LLMUnavailableError(f"OpenAI service error: {e}")


def generate(
    prompt: str,
    model: Optional[str] = None,
    provider: Optional[str] = None,
    timeout: Optional[int] = None
) -> str:
    """
    Unified LLM generation entrypoint supporting local inference and optional cloud fallback.
    Adheres strictly to the configured AI_INFERENCE_MODE ('local', 'cloud', 'auto').
    """
    req_timeout = timeout or settings.AI_REQUEST_TIMEOUT
    inference_mode = settings.AI_INFERENCE_MODE
    target_provider = (provider or settings.AI_PROVIDER).lower()

    # Rule: If institutional policy is strictly local, reject cloud calls
    if inference_mode == "local" and target_provider not in ("ollama", "lm_studio"):
        raise LLMUnavailableError(
            f"External cloud provider '{target_provider}' is blocked by institutional local-only policy."
        )

    # 1. Attempt primary requested provider
    try:
        if target_provider == "ollama":
            chosen_model = model or settings.OLLAMA_MODEL or "qwen2.5:3b"
            return _generate_ollama(prompt, chosen_model, req_timeout)
        elif target_provider == "lm_studio":
            chosen_model = model or settings.LM_STUDIO_MODEL or "default"
            return _generate_lm_studio(prompt, chosen_model, req_timeout)
        elif target_provider == "gemini":
            chosen_model = model or settings.GEMINI_MODEL
            return _generate_gemini(prompt, chosen_model, req_timeout)
        elif target_provider == "openai":
            chosen_model = model or settings.OPENAI_MODEL
            return _generate_openai(prompt, chosen_model, req_timeout)
        else:
            raise LLMUnavailableError(f"Unsupported AI provider '{target_provider}'.")
    except LLMUnavailableError as err:
        # 2. In 'auto' mode with fallback explicitly permitted, try cloud fallback
        if inference_mode == "auto" and settings.AI_ALLOW_CLOUD_FALLBACK:
            logger.info(f"Local inference failed ({err}), attempting permitted cloud fallback...")
            if settings.GEMINI_API_KEY:
                return _generate_gemini(prompt, settings.GEMINI_MODEL, req_timeout)
            elif settings.OPENAI_API_KEY:
                return _generate_openai(prompt, settings.OPENAI_MODEL, req_timeout)
        raise err


def test_provider_connection(provider: str, base_url: Optional[str] = None) -> Dict[str, Any]:
    """Test connectivity to an inference provider without running a heavy generation query."""
    start = time.time()
    prov = provider.lower()
    try:
        if prov == "ollama":
            url = (base_url or settings.OLLAMA_BASE_URL).rstrip('/')
            _validate_local_endpoint(url)
            resp = requests.get(f"{url}/api/tags", timeout=2.0)
            latency_ms = round((time.time() - start) * 1000)
            if resp.status_code == 200:
                models = [m.get("name") for m in resp.json().get("models", [])]
                return {"status": "connected", "latency_ms": latency_ms, "models": models, "provider": "ollama"}
        elif prov == "lm_studio":
            url = (base_url or settings.LM_STUDIO_BASE_URL).rstrip('/')
            _validate_local_endpoint(url)
            resp = requests.get(f"{url}/models", timeout=2.0)
            latency_ms = round((time.time() - start) * 1000)
            if resp.status_code == 200:
                models = [m.get("id") for m in resp.json().get("data", [])]
                return {"status": "connected", "latency_ms": latency_ms, "models": models, "provider": "lm_studio"}
        elif prov == "gemini":
            if not settings.GEMINI_API_KEY:
                return {"status": "unconfigured", "error": "Missing GEMINI_API_KEY", "provider": "gemini"}
            latency_ms = round((time.time() - start) * 1000)
            return {"status": "configured", "latency_ms": latency_ms, "provider": "gemini"}
        elif prov == "openai":
            if not settings.OPENAI_API_KEY:
                return {"status": "unconfigured", "error": "Missing OPENAI_API_KEY", "provider": "openai"}
            latency_ms = round((time.time() - start) * 1000)
            return {"status": "configured", "latency_ms": latency_ms, "provider": "openai"}
    except Exception as e:
        return {"status": "disconnected", "error": str(e), "provider": prov}

    return {"status": "unreachable", "provider": prov}
