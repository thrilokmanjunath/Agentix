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
    def select_llm_provider(task_type: str = "general") -> Dict[str, Any]:
        """Dynamically routes to Ollama/LM Studio if local models exist, otherwise checks cloud configuration."""
        from ..config import settings
        registry = ModelRegistry.get_registry()
        
        if registry.get("has_local_llm"):
            models = registry.get("local_models", [])
            if models:
                model_name = models[0].get("name")
                provider = models[0].get("provider", "ollama")
                logger.info(f"[ExecutionEngine] Routing LLM to local {provider} model: {model_name}")
                return {"provider": provider, "model": model_name}
                
        # If in local-only mode and no local model is running:
        if settings.AI_INFERENCE_MODE == "local" or not settings.AI_ALLOW_CLOUD_FALLBACK:
            return {"provider": "none", "model": None}

        if settings.GEMINI_API_KEY:
            logger.info("[ExecutionEngine] Routing LLM to configured Gemini fallback.")
            return {"provider": "gemini", "model": settings.GEMINI_MODEL}
        elif settings.OPENAI_API_KEY:
            logger.info("[ExecutionEngine] Routing LLM to configured OpenAI fallback.")
            return {"provider": "openai", "model": settings.OPENAI_MODEL}

        return {"provider": "none", "model": None}
