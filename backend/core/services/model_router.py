import re
from enum import Enum
from typing import List, Optional


class ModelComplexity(str, Enum):
    LIGHTWEIGHT = "LIGHTWEIGHT"  # Fast summaries, short lookups, tabular previews
    BALANCED = "BALANCED"        # Standard data science queries, correlations, cleaning suggestions
    REASONING = "REASONING"      # Multivariate causal inference, architectural advice, statistical critique


class DynamicModelRouter:
    """Intelligently routes inference requests based on analytical query complexity
    and hardware capabilities."""

    def __init__(self):
        self.reasoning_keywords = [
            "why", "cause", "causal", "evaluate", "compare", "tradeoff", "critique",
            "derive", "mathematical", "hypothesis", "diagnose", "extrapolate"
        ]

    def classify_complexity(self, query: str, has_dataset: bool = True) -> ModelComplexity:
        text = (query or "").lower().strip()
        word_count = len(text.split())

        # Check for deep reasoning triggers
        if any(re.search(rf'\b{kw}\b', text) for kw in self.reasoning_keywords):
            return ModelComplexity.REASONING

        # Long analytical prompts
        if word_count > 60:
            return ModelComplexity.REASONING

        # Short overview queries
        if word_count < 10 and not has_dataset:
            return ModelComplexity.LIGHTWEIGHT

        return ModelComplexity.BALANCED

    def select_optimal_model(
        self,
        complexity: ModelComplexity,
        available_models: List[str],
    ) -> Optional[str]:
        if not available_models:
            return None

        # Prefer researcher / larger reasoning models for REASONING tasks
        if complexity == ModelComplexity.REASONING:
            for m in available_models:
                if any(k in m.lower() for k in ["researcher", "deepseek", "llama3", "70b", "8b", "qwen2.5:7b"]):
                    return m

        # Prefer fast compact models for LIGHTWEIGHT tasks
        if complexity == ModelComplexity.LIGHTWEIGHT:
            for m in available_models:
                if any(k in m.lower() for k in ["3b", "1.5b", "1b", "mini", "qwen2.5:3b"]):
                    return m

        # Default fallback to first available model
        return available_models[0]


model_router = DynamicModelRouter()
