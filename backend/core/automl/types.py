"""
Agentix AutoML Engine - Domain Types and Schemas
Defines task types, algorithm metadata, candidate recommendations, and evaluation results.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class TaskType(str, Enum):
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    DIMENSIONALITY_REDUCTION = "dimensionality_reduction"
    TIME_SERIES = "time_series"


class AlgorithmTier(str, Enum):
    BASELINE = "baseline"
    LINEAR = "linear"
    TREE = "tree"
    ENSEMBLE = "ensemble"
    BOOSTING = "boosting"
    NEIGHBORS = "neighbors"
    NAIVE_BAYES = "naive_bayes"
    DECOMPOSITION = "decomposition"
    MANIFOLD = "manifold"
    GEOMETRIC = "geometric"
    AUTOREGRESSIVE = "autoregressive"


class InterpretabilityRating(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ComplexityRating(str, Enum):
    O_N = "O(N)"
    O_N_LOG_N = "O(N log N)"
    O_N_SQUARED = "O(N^2)"
    O_N_CUBED = "O(N^3)"


class AlgorithmMetadata(BaseModel):
    id: str
    name: str
    task_type: TaskType
    tier: AlgorithmTier
    description: str
    pros: List[str]
    cons: List[str]
    interpretability: InterpretabilityRating
    computational_complexity: ComplexityRating
    supports_sparse: bool = False
    requires_scaling: bool = False
    handles_missing_natively: bool = False
    is_available: bool = True
    speed_tier: str = "Fast"  # "Ultra-Fast", "Fast", "Moderate", "Compute-Intensive"


class CandidateRecommendation(BaseModel):
    algorithm_id: str
    algorithm_name: str
    task_type: TaskType
    tier: AlgorithmTier
    is_recommended: bool
    is_baseline: bool = False
    priority_rank: int
    rationale: str
    estimated_training_speed: str
    interpretability: InterpretabilityRating


class ClassificationMetrics(BaseModel):
    accuracy: float
    precision_weighted: float
    precision_macro: float
    recall_weighted: float
    recall_macro: float
    f1_score: float
    f1_macro: float
    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None
    log_loss: Optional[float] = None
    confusion_matrix: Optional[List[List[int]]] = None
    classes: Optional[List[str]] = None


class RegressionMetrics(BaseModel):
    r2: float
    mae: float
    mse: float
    rmse: float
    mape: Optional[float] = None


class ClusteringMetrics(BaseModel):
    silhouette_score: float
    davies_bouldin_score: float
    calinski_harabasz_score: float
    n_clusters: int
    cluster_distribution: Dict[str, int]


class DimensionalityReductionMetrics(BaseModel):
    n_components: int
    explained_variance_ratio_sum: Optional[float] = None
    explained_variance_ratios: Optional[List[float]] = None
    reconstruction_error: Optional[float] = None


class TimeSeriesMetrics(BaseModel):
    mae: float
    rmse: float
    mape: Optional[float] = None
    directional_accuracy: Optional[float] = None


class CandidateEvaluationResult(BaseModel):
    algorithm_id: str
    algorithm_name: str
    task_type: TaskType
    tier: AlgorithmTier
    is_best: bool = False
    is_baseline: bool = False
    primary_metric_name: str
    primary_metric_value: float
    metrics: Dict[str, Any]
    fit_time_sec: float
    cv_mean: Optional[float] = None
    cv_std: Optional[float] = None
    feature_importances: Optional[Dict[str, float]] = None
    model_params: Optional[Dict[str, Any]] = None
    status: str = "success"
    error_message: Optional[str] = None


class AutoMLSummary(BaseModel):
    dataset_name: str
    task_type: TaskType
    target_column: Optional[str] = None
    rows: int
    cols: int
    features: List[str]
    best_model: str
    best_algorithm_id: Optional[str] = None
    best_score: float
    primary_metric: str
    best_feature_importances: Optional[Dict[str, float]] = None
    leaderboard: List[CandidateEvaluationResult]
    recommended_candidates: List[CandidateRecommendation]
    y_test: Optional[List[Any]] = None
    y_pred: Optional[List[Any]] = None
    execution_time_sec: float
