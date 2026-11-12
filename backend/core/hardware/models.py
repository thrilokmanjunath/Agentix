import hashlib
import json
import os
import subprocess
import time
import logging
import requests
from typing import Dict, List, Any, Optional, Tuple
from core.config import settings

logger = logging.getLogger("agentix_v2")

CLOUD_DEFAULT_CATALOG: Dict[str, List[str]] = {
    "gemini": [
        "gemini-3.5-flash",
        "gemini-3-flash-preview",
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-pro-latest",
    ],
    "openai": [
        "gpt-4o",
        "gpt-4o-mini",
        "o3-mini",
        "gpt-4-turbo",
    ],
    "anthropic": [
        "claude-3-7-sonnet-20250219",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
    ],
}

_GEMINI_PREFERRED_ORDER = [
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
]

CLOUD_PROVIDER_META: Dict[str, Dict[str, str]] = {
    "gemini": {"name": "Google Gemini", "default_model_attr": "GEMINI_MODEL", "key_attr": "GEMINI_API_KEY"},
    "openai": {"name": "OpenAI Platform", "default_model_attr": "OPENAI_MODEL", "key_attr": "OPENAI_API_KEY"},
    "anthropic": {"name": "Anthropic Claude", "default_model_attr": "ANTHROPIC_MODEL", "key_attr": "ANTHROPIC_API_KEY"},
}

# Short-lived in-memory cache so UI polling does not spam provider model APIs
_CLOUD_MODEL_CACHE: Dict[Tuple[str, str], Tuple[float, Dict[str, Any]]] = {}
_CACHE_TTL_SEC = 60.0


def _mask_key(secret: Optional[str]) -> str:
    if not secret:
        return ""
    s = secret.strip()
    if len(s) < 10:
        return "***"
    return f"{s[:6]}...{s[-4:]}"


class ModelRegistry:
    @staticmethod
    def get_ollama_models() -> List[Dict[str, Any]]:
        """Query live local Ollama daemon for installed models using fast loopback REST."""
        models: List[Dict[str, Any]] = []
        base_url = settings.OLLAMA_BASE_URL.rstrip('/')

        try:
            resp = requests.get(f"{base_url}/api/tags", timeout=0.5)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("models", []):
                    size_bytes = item.get("size", 0)
                    size_mb = round(size_bytes / (1024 * 1024), 1)
                    size_str = f"{round(size_mb / 1024, 2)} GB" if size_mb >= 1024 else f"{size_mb} MB"
                    details = item.get("details", {})
                    models.append({
                        "name": item.get("name"),
                        "id": item.get("digest", "")[:12],
                        "size": size_str,
                        "size_bytes": size_bytes,
                        "parameter_size": details.get("parameter_size", "Unknown"),
                        "quantization": details.get("quantization_level", "Unknown"),
                        "family": details.get("family", "Unknown"),
                        "modified": item.get("modified_at", "Unknown"),
                        "provider": "ollama",
                        "is_local": True,
                        "daemon_running": True,
                    })
                return models
        except requests.ConnectionError:
            # Daemon is offline; no need to spawn CLI which would fail with connection refused
            return []
        except Exception as e:
            logger.debug(f"Ollama REST API query failed: {e}")

        try:
            result = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True, timeout=0.8)
            lines = result.stdout.strip().split('\n')[1:]
            for line in lines:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 3:
                        models.append({
                            "name": parts[0],
                            "id": parts[1],
                            "size": parts[2],
                            "modified": " ".join(parts[3:]) if len(parts) > 3 else "Unknown",
                            "provider": "ollama",
                            "is_local": True,
                            "daemon_running": True,
                        })
        except Exception:
            pass

        return models

    @staticmethod
    def get_installed_ollama_manifests() -> List[Dict[str, Any]]:
        """Scan ~/.ollama/models manifests (v1 and v2 symlinks) so local models appear even when daemon is stopped."""
        ollama_home = os.environ.get("OLLAMA_MODELS") or os.path.expanduser("~/.ollama/models")
        manifest_roots = [
            os.path.join(ollama_home, "manifests-v2", "ollama.com", "library"),
            os.path.join(ollama_home, "manifests", "registry.ollama.ai", "library"),
        ]
        found: Dict[str, Dict[str, Any]] = {}

        for root in manifest_roots:
            if not os.path.isdir(root):
                continue
            try:
                for model_dir in sorted(os.listdir(root)):
                    model_path = os.path.join(root, model_dir)
                    if not os.path.isdir(model_path):
                        continue
                    for tag in sorted(os.listdir(model_path)):
                        tag_path = os.path.join(model_path, tag)
                        if not (os.path.isfile(tag_path) or os.path.islink(tag_path)):
                            continue
                        full_name = f"{model_dir}:{tag}"
                        if full_name in found:
                            continue
                        size_bytes = 0
                        try:
                            real_path = os.path.realpath(tag_path)
                            if os.path.isfile(real_path):
                                with open(real_path, "r", encoding="utf-8", errors="ignore") as f:
                                    manifest_json = json.loads(f.read(65536))
                                layers = manifest_json.get("layers", [])
                                size_bytes = sum(int(l.get("size", 0)) for l in layers if isinstance(l, dict))
                                if size_bytes == 0 and manifest_json.get("config"):
                                    size_bytes = int(manifest_json["config"].get("size", 0))
                        except Exception:
                            try:
                                size_bytes = os.path.getsize(os.path.realpath(tag_path))
                            except Exception:
                                size_bytes = 0

                        size_mb = round(size_bytes / (1024 * 1024), 1) if size_bytes else 0
                        size_str = (
                            f"{round(size_mb / 1024, 2)} GB"
                            if size_mb >= 1024
                            else (f"{size_mb} MB" if size_mb > 0 else "Installed")
                        )
                        found[full_name] = {
                            "name": full_name,
                            "id": tag,
                            "size": size_str,
                            "size_bytes": size_bytes,
                            "provider": "ollama",
                            "is_local": True,
                            "daemon_running": False,
                        }
            except Exception as e:
                logger.debug(f"Manifest scan failed for {root}: {e}")

        return list(found.values())

    @staticmethod
    def get_lm_studio_models() -> List[Dict[str, Any]]:
        """Query local LM Studio instance for loaded/available models via OpenAI-compatible endpoint."""
        models: List[Dict[str, Any]] = []
        base_url = settings.LM_STUDIO_BASE_URL.rstrip('/')
        try:
            resp = requests.get(f"{base_url}/models", timeout=0.4)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("data", []):
                    models.append({
                        "name": item.get("id"),
                        "id": item.get("id"),
                        "size": "Local Loaded",
                        "provider": "lm_studio",
                        "is_local": True,
                        "daemon_running": True,
                    })
        except Exception:
            pass
        return models

    @classmethod
    def discover_cloud_models(
        cls,
        provider: str,
        api_key: Optional[str] = None,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Discover available chat/reasoning models for a cloud API provider.
        Queries the live provider API when a key is present, caching briefly and
        gracefully falling back to the curated official catalog if offline.
        """
        prov = provider.lower()
        if prov not in CLOUD_PROVIDER_META:
            return {"provider": prov, "models": [], "live": False, "configured": False}

        meta = CLOUD_PROVIDER_META[prov]
        configured_key = getattr(settings, meta["key_attr"], None)
        key_to_use = api_key if (api_key and "..." not in api_key) else configured_key
        fallback_models = list(CLOUD_DEFAULT_CATALOG[prov])

        if not key_to_use:
            return {
                "provider": prov,
                "models": fallback_models,
                "live": False,
                "configured": False,
            }

        key_hash = hashlib.sha256(key_to_use.encode("utf-8")).hexdigest()[:12]
        cache_key = (prov, key_hash)
        now = time.time()
        if not force_refresh and cache_key in _CLOUD_MODEL_CACHE:
            cached_at, cached_val = _CLOUD_MODEL_CACHE[cache_key]
            if (now - cached_at) < _CACHE_TTL_SEC:
                return cached_val

        live_models: List[str] = []
        live_ok = False

        try:
            if prov == "gemini":
                resp = requests.get(
                    "https://generativelanguage.googleapis.com/v1beta/models",
                    headers={"x-goog-api-key": key_to_use},
                    timeout=3.0,
                )
                if resp.status_code == 200:
                    raw = resp.json().get("models", [])
                    discovered_set: List[str] = []
                    for item in raw:
                        methods = item.get("supportedGenerationMethods", [])
                        if "generateContent" not in methods:
                            continue
                        name = str(item.get("name", "")).replace("models/", "")
                        lower = name.lower()
                        if any(
                            skip in lower
                            for skip in (
                                "-tts",
                                "embedding",
                                "imagen",
                                "veo",
                                "aqa",
                                "robotics",
                                "computer-use",
                                "-image",
                                "lyria",
                                "transcribe",
                                "nano-banana",
                                "deep-research",
                            )
                        ):
                            continue
                        if name and name not in discovered_set:
                            discovered_set.append(name)

                    # Prioritize current verified Gemini generations above deprecated 2.5 entries
                    prioritized = [m for m in _GEMINI_PREFERRED_ORDER if m in discovered_set]
                    remaining = [
                        m for m in discovered_set
                        if m not in prioritized and not m.startswith("gemini-2.5-")
                    ]
                    legacy = [m for m in discovered_set if m.startswith("gemini-2.5-")]
                    live_models = prioritized + remaining + legacy
                    live_ok = len(live_models) > 0
            elif prov == "openai":
                base_url = settings.OPENAI_BASE_URL.rstrip("/")
                resp = requests.get(
                    f"{base_url}/models",
                    headers={"Authorization": f"Bearer {key_to_use}"},
                    timeout=3.0,
                )
                if resp.status_code == 200:
                    raw = resp.json().get("data", [])
                    prefixes = ("gpt-4", "gpt-5", "o1", "o3", "o4", "chatgpt-")
                    filtered = [
                        str(item.get("id", ""))
                        for item in raw
                        if str(item.get("id", "")).startswith(prefixes)
                        and not any(skip in str(item.get("id", "")).lower() for skip in ("realtime", "audio", "transcribe", "tts", "image", "search"))
                    ]
                    live_models = sorted(set(filtered), reverse=True)
                    live_ok = len(live_models) > 0
            elif prov == "anthropic":
                resp = requests.get(
                    "https://api.anthropic.com/v1/models",
                    headers={"x-api-key": key_to_use, "anthropic-version": "2023-06-01"},
                    timeout=3.0,
                )
                if resp.status_code == 200:
                    raw = resp.json().get("data", [])
                    live_models = [str(item.get("id", "")) for item in raw if item.get("id")]
                    live_ok = len(live_models) > 0
        except Exception as e:
            logger.debug(f"Live model discovery skipped/failed for {prov}: {e}")

        models = live_models if live_ok else fallback_models
        result = {
            "provider": prov,
            "models": models,
            "live": live_ok,
            "configured": True,
        }
        _CLOUD_MODEL_CACHE[cache_key] = (now, result)
        return result

    @classmethod
    def get_memory_recommendation(cls) -> Dict[str, Any]:
        """Provides memory-aware local model size recommendations based on host hardware."""
        import psutil
        try:
            vm = psutil.virtual_memory()
            available_gb = round(vm.available / (1024**3), 2)
            total_gb = round(vm.total / (1024**3), 2)
        except Exception:
            available_gb = 4.0
            total_gb = 8.0

        if available_gb < 6.0:
            recommended_param = "<= 3B parameters (e.g. Qwen2.5-3B, Phi-3 Mini)"
            max_recommended_size_gb = 3.0
            warning = "Memory is constrained. Run quantized 3B models to avoid swapping."
        elif available_gb < 14.0:
            recommended_param = "3B - 8B parameters (e.g. Qwen2.5-7B, Llama 3.1 8B Q4_K_M)"
            max_recommended_size_gb = 7.0
            warning = None
        else:
            recommended_param = "Up to 14B - 32B parameters (e.g. Qwen2.5-14B, Command-R)"
            max_recommended_size_gb = 18.0
            warning = None

        return {
            "total_ram_gb": total_gb,
            "available_ram_gb": available_gb,
            "recommended_parameters": recommended_param,
            "max_model_size_gb": max_recommended_size_gb,
            "advisory": warning,
        }

    @classmethod
    def get_registry(cls) -> Dict[str, Any]:
        """Returns full model registry including local runtimes, disk manifests, and API-key-backed cloud models."""
        ollama_models = cls.get_ollama_models()
        lm_studio_models = cls.get_lm_studio_models()
        local_models = ollama_models + lm_studio_models
        installed_manifests = cls.get_installed_ollama_manifests()

        cloud_providers: List[Dict[str, Any]] = []
        unified_models: List[Dict[str, Any]] = []

        live_names = {m.get("name") for m in local_models if m.get("name")}
        for lm in local_models:
            unified_models.append({
                "name": lm["name"],
                "provider": lm.get("provider", "ollama"),
                "provider_name": "Ollama (Local)" if lm.get("provider") == "ollama" else "LM Studio (Local)",
                "is_local": True,
                "available": True,
                "daemon_running": True,
                "size": lm.get("size"),
            })

        # Also include downloaded local Ollama models from disk when daemon is stopped
        for dm in installed_manifests:
            if dm["name"] not in live_names:
                unified_models.append({
                    "name": dm["name"],
                    "provider": "ollama",
                    "provider_name": "Ollama (Offline — Start Ollama)",
                    "is_local": True,
                    "available": False,
                    "daemon_running": False,
                    "size": dm.get("size"),
                })

        for prov_id, meta in CLOUD_PROVIDER_META.items():
            raw_key = getattr(settings, meta["key_attr"], None)
            default_model = getattr(settings, meta["default_model_attr"], CLOUD_DEFAULT_CATALOG[prov_id][0])
            discovered = cls.discover_cloud_models(prov_id)
            models_list = discovered.get("models", list(CLOUD_DEFAULT_CATALOG[prov_id]))
            if default_model and default_model not in models_list and raw_key:
                models_list = [default_model] + models_list

            is_conf = bool(raw_key)
            if is_conf:
                cloud_providers.append({
                    "provider": prov_id,
                    "name": meta["name"],
                    "default_model": default_model,
                    "selected_model": default_model,
                    "is_configured": True,
                    "key_masked": _mask_key(raw_key),
                    "live_discovered": discovered.get("live", False),
                    "available_models": models_list,
                })
                for model_id in models_list:
                    unified_models.append({
                        "name": model_id,
                        "provider": prov_id,
                        "provider_name": meta["name"],
                        "is_local": False,
                        "available": True,
                    })

        active_provider = settings.AI_PROVIDER.lower()
        active_model: Optional[str] = None
        if active_provider == "ollama":
            active_model = settings.OLLAMA_MODEL or (ollama_models[0]["name"] if ollama_models else None)
        elif active_provider == "lm_studio":
            active_model = settings.LM_STUDIO_MODEL or (lm_studio_models[0]["name"] if lm_studio_models else None)
        elif active_provider == "gemini":
            active_model = settings.GEMINI_MODEL
        elif active_provider == "openai":
            active_model = settings.OPENAI_MODEL
        elif active_provider == "anthropic":
            active_model = settings.ANTHROPIC_MODEL

        return {
            "active_provider": active_provider,
            "active_model": active_model,
            "inference_mode": settings.AI_INFERENCE_MODE,
            "allow_cloud_fallback": settings.AI_ALLOW_CLOUD_FALLBACK,
            "has_local_llm": len(local_models) > 0,
            "ollama_daemon_online": len(ollama_models) > 0,
            "local_models": local_models,
            "local_ollama_models": ollama_models,
            "installed_local_models": installed_manifests,
            "local_lm_studio_models": lm_studio_models,
            "cloud_providers": cloud_providers,
            "available_models": unified_models,
            "gemini_available": bool(settings.GEMINI_API_KEY),
            "openai_available": bool(settings.OPENAI_API_KEY),
            "anthropic_available": bool(settings.ANTHROPIC_API_KEY),
            "memory_guidance": cls.get_memory_recommendation(),
        }
