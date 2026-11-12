from typing import Any, Optional, Dict
from .base import ProcessingEngine, PandasEngine, ChunkedPandasEngine, DaskEngine
from ..hardware import HardwareDetector, ModelRegistry
import logging

logger = logging.getLogger("agentix_v2")

class ExecutionEngine:
    @staticmethod
    def get_optimal_engine(dataset_size_mb: float = 0.0, config_engine: Optional[str] = None) -> ProcessingEngine:
        if config_engine == "pandas":
            return PandasEngine()
        elif config_engine == "chunked":
            return ChunkedPandasEngine()
        elif config_engine == "dask":
            return DaskEngine()
            
        hardware = HardwareDetector.scan()
        ram = hardware.get("ram", {})
        available_ram_gb = ram.get("available_gb", 4.0) # Default to 4GB safe fallback

        # Convert available RAM to MB and keep a 3x overhead buffer for operations
        safe_memory_limit_mb = (available_ram_gb * 1024) / 3

        logger.info(f"[ExecutionEngine] Hardware Scan: Available RAM={available_ram_gb}GB. Dataset size={dataset_size_mb}MB.")

        # Logic for adaptive execution engine routing
        if dataset_size_mb < safe_memory_limit_mb and dataset_size_mb < 500:
            logger.info("[ExecutionEngine] Routing to PandasEngine (Fits safely in RAM)")
            return PandasEngine()
        elif dataset_size_mb < (safe_memory_limit_mb * 2):
            logger.info("[ExecutionEngine] Routing to ChunkedPandasEngine (Approaching RAM limits)")
            return ChunkedPandasEngine(chunksize=100000)
        else:
            logger.info("[ExecutionEngine] Routing to DaskEngine (Out of core processing required)")
            return DaskEngine()
            
    @staticmethod
    def select_llm_provider(
        task_type: str = "general",
        requested_model: Optional[str] = None,
        requested_provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Dynamically resolves the active local or configured API-key LLM provider and model."""
        from ..config import settings

        registry = ModelRegistry.get_registry()
        inference_mode = (settings.AI_INFERENCE_MODE or "local").lower()
        local_models = registry.get("local_models", [])

        cloud_keys = {
            "gemini": (settings.GEMINI_API_KEY, settings.GEMINI_MODEL),
            "openai": (settings.OPENAI_API_KEY, settings.OPENAI_MODEL),
            "anthropic": (settings.ANTHROPIC_API_KEY, settings.ANTHROPIC_MODEL),
        }

        # 1. Explicit request override (e.g. from Agent Console model dropdown)
        if requested_provider:
            req_prov = requested_provider.lower()
            if req_prov in ("ollama", "lm_studio"):
                matching = [m["name"] for m in local_models if m.get("provider") == req_prov]
                if requested_model and requested_model in matching:
                    return {"provider": req_prov, "model": requested_model}
                if matching:
                    return {"provider": req_prov, "model": requested_model or matching[0]}
            elif req_prov in cloud_keys and inference_mode != "local":
                key, default_m = cloud_keys[req_prov]
                if key:
                    return {"provider": req_prov, "model": requested_model or default_m}

        # 2. If only requested_model was provided, check local models then configured cloud keys
        if requested_model and not requested_provider:
            for lm in local_models:
                if lm.get("name") == requested_model:
                    return {"provider": lm.get("provider", "ollama"), "model": requested_model}
            if inference_mode != "local":
                if settings.GEMINI_API_KEY and requested_model.lower().startswith(("gemini", "gemma")):
                    return {"provider": "gemini", "model": requested_model}
                if settings.OPENAI_API_KEY and requested_model.lower().startswith(("gpt", "o1", "o3", "o4", "chatgpt")):
                    return {"provider": "openai", "model": requested_model}
                if settings.ANTHROPIC_API_KEY and requested_model.lower().startswith("claude"):
                    return {"provider": "anthropic", "model": requested_model}

        # 3. Configured active cloud provider when mode is 'cloud' or explicitly selected as primary in 'auto'
        active_prov = (settings.AI_PROVIDER or "ollama").lower()
        if active_prov in cloud_keys and inference_mode != "local":
            key, default_m = cloud_keys[active_prov]
            if key:
                logger.info(f"[ExecutionEngine] Routing LLM to active provider {active_prov}: {default_m}")
                return {"provider": active_prov, "model": default_m}

        # 4. Local inference engine (Ollama / LM Studio)
        if local_models:
            preferred_local = settings.OLLAMA_MODEL if active_prov == "ollama" else settings.LM_STUDIO_MODEL
            local_names = [m.get("name") for m in local_models]
            if preferred_local and preferred_local in local_names:
                return {"provider": active_prov, "model": preferred_local}
            model_name = local_models[0].get("name")
            provider = local_models[0].get("provider", "ollama")
            logger.info(f"[ExecutionEngine] Routing LLM to local {provider} model: {model_name}")
            return {"provider": provider, "model": model_name}

        # 5. Respect local-only institutional restriction
        if inference_mode == "local":
            return {"provider": "none", "model": None}

        # 6. Cloud API key fallback when permitted
        if inference_mode == "cloud" or settings.AI_ALLOW_CLOUD_FALLBACK or inference_mode == "auto":
            for prov_id in ("gemini", "openai", "anthropic"):
                key, default_m = cloud_keys[prov_id]
                if key:
                    logger.info(f"[ExecutionEngine] Routing LLM to configured {prov_id} API key: {default_m}")
                    return {"provider": prov_id, "model": default_m}

        return {"provider": "none", "model": None}
