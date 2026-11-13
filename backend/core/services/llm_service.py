import logging
import os
import sys
import requests
import json
import time
from urllib.parse import urlparse
from typing import Optional, Dict, Any
import asyncio
from core.config import settings
from core.context import current_user_id

logger = logging.getLogger("agentix_v2")

_RUNTIME_CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "ai_runtime_config.json",
)


class LLMUnavailableError(Exception):
    """Raised when no LLM backend could service the request.
    Surfaced as an honest 'unavailable' state instead of fabricating responses."""
    pass


def _mask_secret(secret: Optional[str]) -> str:
    if not secret:
        return ""
    s = secret.strip()
    if len(s) < 10:
        return "***"
    return f"{s[:6]}...{s[-4:]}"


def _apply_config_to_settings(cfg: Dict[str, Any]) -> None:
    """Apply non-empty persisted AI runtime settings onto in-memory settings."""
    field_map = {
        "ai_provider": "AI_PROVIDER",
        "inference_mode": "AI_INFERENCE_MODE",
        "allow_cloud_fallback": "AI_ALLOW_CLOUD_FALLBACK",
        "ollama_base_url": "OLLAMA_BASE_URL",
        "ollama_model": "OLLAMA_MODEL",
        "lm_studio_base_url": "LM_STUDIO_BASE_URL",
        "lm_studio_model": "LM_STUDIO_MODEL",
        "gemini_model": "GEMINI_MODEL",
        "openai_model": "OPENAI_MODEL",
        "anthropic_model": "ANTHROPIC_MODEL",
        "gemini_api_key": "GEMINI_API_KEY",
        "openai_api_key": "OPENAI_API_KEY",
        "anthropic_api_key": "ANTHROPIC_API_KEY",
    }
    for key, attr in field_map.items():
        if key in cfg and cfg[key] is not None:
            val = cfg[key]
            if isinstance(val, str) and key.endswith("_api_key"):
                # Never overwrite a valid key with empty/masked strings
                if not val.strip() or "..." in val:
                    continue
            setattr(settings, attr, val)


def load_runtime_ai_config() -> None:
    """Load persisted runtime AI config overrides from disk if present."""
    try:
        if os.path.exists(_RUNTIME_CONFIG_PATH):
            with open(_RUNTIME_CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    _apply_config_to_settings(data)
    except Exception as e:
        logger.warning(f"Failed to load persisted AI runtime config: {e}")


# Load on module import in runtime servers (skip during pytest runs for determinism)
if not os.getenv("PYTEST_CURRENT_TEST") and "pytest" not in sys.modules:
    load_runtime_ai_config()


def save_runtime_ai_config(updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Persist AI provider/model/inference-mode/API-key updates server-side.
    Never overwrites existing secrets with masked ('...') values.
    """
    existing: Dict[str, Any] = {}
    if os.path.exists(_RUNTIME_CONFIG_PATH):
        try:
            with open(_RUNTIME_CONFIG_PATH, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    existing = loaded
        except Exception:
            existing = {}

    merged = dict(existing)
    for k, v in updates.items():
        if v is None:
            continue
        if k.endswith("_api_key") and isinstance(v, str):
            stripped = v.strip()
            if not stripped or "..." in stripped:
                continue
            merged[k] = stripped
        else:
            merged[k] = v

    # When setting a model alongside active provider, store under that provider's specific model key too
    prov = str(merged.get("ai_provider") or settings.AI_PROVIDER).lower()
    active_model = updates.get("active_model")
    if active_model:
        if prov == "gemini":
            merged["gemini_model"] = active_model
        elif prov == "openai":
            merged["openai_model"] = active_model
        elif prov == "anthropic":
            merged["anthropic_model"] = active_model
        elif prov == "ollama":
            merged["ollama_model"] = active_model
        elif prov == "lm_studio":
            merged["lm_studio_model"] = active_model
        elif prov in ("local_connector", "connector"):
            merged["connector_model"] = active_model

    _apply_config_to_settings(merged)

    os.makedirs(os.path.dirname(_RUNTIME_CONFIG_PATH), exist_ok=True)
    with open(_RUNTIME_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)
    try:
        os.chmod(_RUNTIME_CONFIG_PATH, 0o600)
    except Exception:
        pass

    return get_masked_ai_config()


def get_active_model_for_provider(provider: Optional[str] = None) -> Optional[str]:
    prov = (provider or settings.AI_PROVIDER).lower()
    if prov == "gemini":
        return settings.GEMINI_MODEL
    if prov == "openai":
        return settings.OPENAI_MODEL
    if prov == "anthropic":
        return settings.ANTHROPIC_MODEL
    if prov == "ollama":
        return settings.OLLAMA_MODEL
    if prov == "lm_studio":
        return settings.LM_STUDIO_MODEL
    if prov in ("local_connector", "connector"):
        return getattr(settings, "CONNECTOR_MODEL", None) or "local-default"
    return None


def get_masked_ai_config() -> Dict[str, Any]:
    """Return non-secret AI settings & masked key hints for safe frontend consumption."""
    return {
        "ai_provider": settings.AI_PROVIDER,
        "active_model": get_active_model_for_provider(settings.AI_PROVIDER),
        "inference_mode": settings.AI_INFERENCE_MODE,
        "allow_cloud_fallback": settings.AI_ALLOW_CLOUD_FALLBACK,
        "ollama_base_url": settings.OLLAMA_BASE_URL,
        "ollama_model": settings.OLLAMA_MODEL,
        "lm_studio_base_url": settings.LM_STUDIO_BASE_URL,
        "lm_studio_model": settings.LM_STUDIO_MODEL,
        "gemini_model": settings.GEMINI_MODEL,
        "openai_model": settings.OPENAI_MODEL,
        "anthropic_model": settings.ANTHROPIC_MODEL,
        "has_gemini_key": bool(settings.GEMINI_API_KEY),
        "gemini_key_masked": _mask_secret(settings.GEMINI_API_KEY),
        "has_openai_key": bool(settings.OPENAI_API_KEY),
        "openai_key_masked": _mask_secret(settings.OPENAI_API_KEY),
        "has_anthropic_key": bool(settings.ANTHROPIC_API_KEY),
        "anthropic_key_masked": _mask_secret(settings.ANTHROPIC_API_KEY),
    }


def _validate_local_endpoint(url: str) -> None:
    """Validate that local inference endpoints point to safe, trusted loopback or local networks (SSRF prevention)."""
    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            raise ValueError("Invalid endpoint URL")

        if hostname in ("169.254.169.254", "metadata.google.internal", "instance-data"):
            raise ValueError(f"Prohibited metadata destination: {hostname}")

        allowed = (
            hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0")
            or hostname.startswith("192.168.")
            or hostname.startswith("10.")
            or any(hostname.startswith(f"172.{i}.") for i in range(16, 32))
        )
        if not allowed:
            raise ValueError(f"Endpoint '{hostname}' is not a permitted local inference interface.")
    except Exception as e:
        raise LLMUnavailableError(f"Endpoint validation failure: {e}")


def _generate_ollama(prompt: str, model: str, timeout: int) -> str:
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
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
    base_url = settings.LM_STUDIO_BASE_URL.rstrip("/")
    _validate_local_endpoint(base_url)
    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "stream": False,
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


def _sanitize_error_text(text: str) -> str:
    """Ensure API keys never leak in error logs or user-facing messages."""
    import re
    return re.sub(r"([?&]key=)[^&\s\"']+", r"\1[REDACTED]", text)


def _extract_api_error(resp: requests.Response) -> Optional[str]:
    try:
        err_json = resp.json()
        if isinstance(err_json, dict) and isinstance(err_json.get("error"), dict):
            msg = err_json["error"].get("message")
            if msg:
                return _sanitize_error_text(str(msg))
    except Exception:
        pass
    return None


def _generate_gemini(prompt: str, model: str, timeout: int) -> str:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise LLMUnavailableError("Google Gemini API key is not configured.")
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        resp = requests.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=timeout,
        )
        if not resp.ok:
            api_msg = _extract_api_error(resp) or f"HTTP {resp.status_code} from Gemini API"
            raise LLMUnavailableError(f"Gemini service error: {api_msg}")
        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise LLMUnavailableError("Gemini returned no candidates.")
        parts = candidates[0].get("content", {}).get("parts", [])
        text_parts = [p.get("text", "") for p in parts if not p.get("thought") and p.get("text")]
        if not text_parts:
            text_parts = [p.get("text", "") for p in parts if p.get("text")]
        return "\n".join(text_parts).strip()
    except LLMUnavailableError:
        raise
    except Exception as e:
        safe_err = _sanitize_error_text(str(e))
        logger.warning(f"Gemini call failed: {safe_err}")
        raise LLMUnavailableError(f"Gemini service error: {safe_err}")


def _generate_openai(prompt: str, model: str, timeout: int) -> str:
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise LLMUnavailableError("OpenAI API key is not configured.")
    base_url = settings.OPENAI_BASE_URL.rstrip("/")
    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
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


def _generate_anthropic(prompt: str, model: str, timeout: int) -> str:
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise LLMUnavailableError("Anthropic API key is not configured.")
    try:
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data.get("content", [])
        if not content:
            raise LLMUnavailableError("Anthropic returned no content blocks.")
        texts = [block.get("text", "") for block in content if block.get("type") == "text"]
        return "\n".join(texts).strip()
    except Exception as e:
        logger.warning(f"Anthropic call failed: {e}")
        raise LLMUnavailableError(f"Anthropic service error: {e}")


def _run_coroutine_sync(coro):
    """Executes an async coroutine synchronously, safely handling running event loops."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


def generate(
    prompt: str,
    model: Optional[str] = None,
    provider: Optional[str] = None,
    timeout: Optional[int] = None,
) -> str:
    """
    Unified LLM generation entrypoint supporting local inference and configured API-key cloud models.
    Adheres strictly to the configured AI_INFERENCE_MODE ('local', 'cloud', 'auto').
    """
    req_timeout = timeout or settings.AI_REQUEST_TIMEOUT
    inference_mode = settings.AI_INFERENCE_MODE
    target_provider = (provider or settings.AI_PROVIDER).lower()

    # Rule: If institutional policy is strictly local, reject cloud calls
    if inference_mode == "local" and target_provider not in ("ollama", "lm_studio", "local_connector", "connector"):
        raise LLMUnavailableError(
            f"External cloud provider '{target_provider}' is blocked by institutional local-only policy."
        )

    try:
        if target_provider in ("local_connector", "connector"):
            from core.services.connector_service import connector_manager
            uid = current_user_id.get() or "guest_user"
            if not connector_manager.is_connected(uid):
                raise LLMUnavailableError(
                    "Local connector companion is offline. Please launch the Agentix Local Connector on your device."
                )
            chosen_model = model or "default"
            coro = connector_manager.execute_local_inference(user_id=uid, prompt=prompt, model=chosen_model, timeout=req_timeout)
            return _run_coroutine_sync(coro)
        elif target_provider == "ollama":
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
        elif target_provider == "anthropic":
            chosen_model = model or settings.ANTHROPIC_MODEL
            return _generate_anthropic(prompt, chosen_model, req_timeout)
        else:
            raise LLMUnavailableError(f"Unsupported AI provider '{target_provider}'.")
    except LLMUnavailableError as err:
        if inference_mode == "auto" and settings.AI_ALLOW_CLOUD_FALLBACK and target_provider in ("ollama", "lm_studio", "local_connector", "connector"):
            logger.info(f"Local inference failed ({err}), attempting permitted cloud fallback...")
            if settings.GEMINI_API_KEY:
                return _generate_gemini(prompt, settings.GEMINI_MODEL, req_timeout)
            elif settings.OPENAI_API_KEY:
                return _generate_openai(prompt, settings.OPENAI_MODEL, req_timeout)
            elif settings.ANTHROPIC_API_KEY:
                return _generate_anthropic(prompt, settings.ANTHROPIC_MODEL, req_timeout)
        raise err


def test_provider_connection(
    provider: str,
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Test connectivity and model availability for a local or cloud inference provider."""
    start = time.time()
    prov = provider.lower()
    try:
        if prov in ("local_connector", "connector"):
            from core.services.connector_service import connector_manager
            uid = current_user_id.get() or "guest_user"
            status = connector_manager.get_status(uid)
            latency_ms = round((time.time() - start) * 1000)
            if status.get("connected"):
                return {
                    "status": "connected",
                    "latency_ms": latency_ms,
                    "models": status.get("models", []),
                    "provider": "local_connector",
                    "message": "Local connector online via secure WebSocket bridge."
                }
            return {
                "status": "disconnected",
                "error": "Local connector companion is not paired or offline.",
                "provider": "local_connector"
            }
        elif prov == "ollama":
            url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
            _validate_local_endpoint(url)
            resp = requests.get(f"{url}/api/tags", timeout=1.5)
            latency_ms = round((time.time() - start) * 1000)
            if resp.status_code == 200:
                models = [m.get("name") for m in resp.json().get("models", [])]
                return {"status": "connected", "latency_ms": latency_ms, "models": models, "provider": "ollama"}
            return {"status": "disconnected", "error": f"Ollama HTTP {resp.status_code}", "provider": "ollama"}
        elif prov == "lm_studio":
            url = (base_url or settings.LM_STUDIO_BASE_URL).rstrip("/")
            _validate_local_endpoint(url)
            endpoints = [f"{url}/models"] if url.endswith("/v1") else [f"{url}/v1/models", f"{url}/models"]
            resp = None
            for ep in endpoints:
                try:
                    r = requests.get(ep, timeout=1.5)
                    if r.status_code == 200:
                        resp = r
                        break
                except Exception:
                    continue
            latency_ms = round((time.time() - start) * 1000)
            if resp and resp.status_code == 200:
                models = [m.get("id") for m in resp.json().get("data", [])]
                return {"status": "connected", "latency_ms": latency_ms, "models": models, "provider": "lm_studio"}
            return {"status": "disconnected", "error": "LM Studio not reachable on local port 1234", "provider": "lm_studio"}
        elif prov == "gemini":
            key = api_key if (api_key and "..." not in api_key) else settings.GEMINI_API_KEY
            if not key:
                return {"status": "unconfigured", "error": "Missing GEMINI_API_KEY", "provider": "gemini"}
            from core.hardware.models import ModelRegistry
            discovered = ModelRegistry.discover_cloud_models("gemini", api_key=key, force_refresh=True)
            latency_ms = round((time.time() - start) * 1000)
            return {
                "status": "connected" if discovered.get("live") else "configured",
                "latency_ms": latency_ms,
                "models": discovered.get("models", []),
                "provider": "gemini",
            }
        elif prov == "openai":
            key = api_key if (api_key and "..." not in api_key) else settings.OPENAI_API_KEY
            if not key:
                return {"status": "unconfigured", "error": "Missing OPENAI_API_KEY", "provider": "openai"}
            from core.hardware.models import ModelRegistry
            discovered = ModelRegistry.discover_cloud_models("openai", api_key=key, force_refresh=True)
            latency_ms = round((time.time() - start) * 1000)
            return {
                "status": "connected" if discovered.get("live") else "configured",
                "latency_ms": latency_ms,
                "models": discovered.get("models", []),
                "provider": "openai",
            }
        elif prov == "anthropic":
            key = api_key if (api_key and "..." not in api_key) else settings.ANTHROPIC_API_KEY
            if not key:
                return {"status": "unconfigured", "error": "Missing ANTHROPIC_API_KEY", "provider": "anthropic"}
            from core.hardware.models import ModelRegistry
            discovered = ModelRegistry.discover_cloud_models("anthropic", api_key=key, force_refresh=True)
            latency_ms = round((time.time() - start) * 1000)
            return {
                "status": "connected" if discovered.get("live") else "configured",
                "latency_ms": latency_ms,
                "models": discovered.get("models", []),
                "provider": "anthropic",
            }
    except Exception as e:
        return {"status": "disconnected", "error": str(e), "provider": prov}

    return {"status": "unreachable", "provider": prov}
