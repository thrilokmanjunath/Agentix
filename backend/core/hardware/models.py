import os
import subprocess
import json
import logging
import requests
from typing import Dict, List, Any, Optional
from core.config import settings

logger = logging.getLogger("agentix_v2")

class ModelRegistry:
    @staticmethod
    def get_ollama_models() -> List[Dict[str, Any]]:
        """Query local Ollama instance for installed models using REST API, with CLI fallback."""
        models: List[Dict[str, Any]] = []
        base_url = settings.OLLAMA_BASE_URL.rstrip('/')
        
        # Method 1: Direct HTTP API query (Fast and accurate)
        try:
            resp = requests.get(f"{base_url}/api/tags", timeout=2.0)
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
                        "is_local": True
                    })
                if models:
                    return models
        except Exception as e:
            logger.debug(f"Ollama REST API query failed: {e}")

        # Method 2: Fallback to CLI parsing
        try:
            result = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True, timeout=2.0)
            lines = result.stdout.strip().split('\n')[1:]  # Skip header
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
                            "is_local": True
                        })
        except Exception:
            pass

        return models

    @staticmethod
    def get_lm_studio_models() -> List[Dict[str, Any]]:
        """Query local LM Studio instance for loaded/available models via OpenAI-compatible endpoint."""
        models: List[Dict[str, Any]] = []
        base_url = settings.LM_STUDIO_BASE_URL.rstrip('/')
        try:
            resp = requests.get(f"{base_url}/models", timeout=1.5)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("data", []):
                    models.append({
                        "name": item.get("id"),
                        "id": item.get("id"),
                        "size": "Local Loaded",
                        "provider": "lm_studio",
                        "is_local": True
                    })
        except Exception:
            pass
        return models

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
            "advisory": warning
        }

    @classmethod
    def get_registry(cls) -> Dict[str, Any]:
        """Returns the full model registry including local Ollama, LM Studio, and configured cloud providers."""
        ollama_models = cls.get_ollama_models()
        lm_studio_models = cls.get_lm_studio_models()
        local_models = ollama_models + lm_studio_models

        cloud_providers = []
        if settings.GEMINI_API_KEY:
            cloud_providers.append({
                "provider": "gemini",
                "name": "Google Gemini",
                "default_model": settings.GEMINI_MODEL,
                "is_configured": True
            })
        if settings.OPENAI_API_KEY:
            cloud_providers.append({
                "provider": "openai",
                "name": "OpenAI",
                "default_model": settings.OPENAI_MODEL,
                "is_configured": True
            })
        if settings.ANTHROPIC_API_KEY:
            cloud_providers.append({
                "provider": "anthropic",
                "name": "Anthropic Claude",
                "default_model": settings.ANTHROPIC_MODEL,
                "is_configured": True
            })

        return {
            "active_provider": settings.AI_PROVIDER,
            "inference_mode": settings.AI_INFERENCE_MODE,
            "allow_cloud_fallback": settings.AI_ALLOW_CLOUD_FALLBACK,
            "has_local_llm": len(local_models) > 0,
            "local_models": local_models,
            "local_ollama_models": ollama_models,
            "local_lm_studio_models": lm_studio_models,
            "cloud_providers": cloud_providers,
            "gemini_available": bool(settings.GEMINI_API_KEY),
            "memory_guidance": cls.get_memory_recommendation()
        }
