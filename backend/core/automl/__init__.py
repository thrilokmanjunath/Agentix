"""
Agentix AutoML Subsystem
Provides intelligent algorithm registry, candidate selection, leak-free preprocessing,
and multi-model benchmark evaluation.
"""

from core.automl.types import (
    TaskType,
    AlgorithmTier,
    InterpretabilityRating,
    ComplexityRating,
    AlgorithmMetadata,
    CandidateRecommendation,
    CandidateEvaluationResult,
    AutoMLSummary,
)
from core.automl.registry import AlgorithmRegistry, algorithm_registry
from core.automl.selector import CandidateSelector, candidate_selector, DatasetProfile
from core.automl.evaluator import ModelEvaluator
from core.automl.preprocessing import LeakFreePreprocessor, PreprocessedSplit
from core.automl.engine import AutoMLEngine, automl_engine

__all__ = [
    "TaskType",
    "AlgorithmTier",
    "InterpretabilityRating",
    "ComplexityRating",
    "AlgorithmMetadata",
    "CandidateRecommendation",
    "CandidateEvaluationResult",
    "AutoMLSummary",
    "AlgorithmRegistry",
    "algorithm_registry",
    "CandidateSelector",
    "candidate_selector",
    "DatasetProfile",
    "ModelEvaluator",
    "LeakFreePreprocessor",
    "PreprocessedSplit",
    "AutoMLEngine",
    "automl_engine",
]
