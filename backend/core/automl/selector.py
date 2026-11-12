"""
Agentix AutoML Engine - Intelligent Candidate Selector
Profiles datasets, infers ML task types, evaluates algorithmic constraints,
and recommends ranked algorithm candidates with detailed rationale.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from core.automl.types import (
    AlgorithmMetadata,
    AlgorithmTier,
    CandidateRecommendation,
    ComplexityRating,
    InterpretabilityRating,
    TaskType,
)
from core.automl.registry import algorithm_registry

logger = logging.getLogger("agentix_v2")


class DatasetProfile:
    """Statistical summary of dataset characteristics for candidate selection."""

    def __init__(
        self,
        n_rows: int,
        n_features: int,
        numeric_features: List[str],
        categorical_features: List[str],
        datetime_features: List[str],
        missing_count: int,
        has_missing: bool,
        high_cardinality_cols: List[str],
        target_column: Optional[str] = None,
        task_type: Optional[TaskType] = None,
        n_classes: Optional[int] = None,
        class_ratios: Optional[Dict[str, float]] = None,
        is_imbalanced: bool = False,
        memory_usage_mb: float = 0.0,
    ):
        self.n_rows = n_rows
        self.n_features = n_features
        self.numeric_features = numeric_features
        self.categorical_features = categorical_features
        self.datetime_features = datetime_features
        self.missing_count = missing_count
        self.has_missing = has_missing
        self.high_cardinality_cols = high_cardinality_cols
        self.target_column = target_column
        self.task_type = task_type
        self.n_classes = n_classes
        self.class_ratios = class_ratios or {}
        self.is_imbalanced = is_imbalanced
        self.memory_usage_mb = memory_usage_mb


class CandidateSelector:
    """
    Intelligent dataset-aware candidate selector for Agentix AutoML.
    Inspects data properties, chooses baseline + competitive algorithms,
    and constructs technical rationale for each recommendation.
    """

    def __init__(self, registry=algorithm_registry):
        self.registry = registry

    def profile_dataframe(
        self,
        df: pd.DataFrame,
        target_column: Optional[str] = None,
        explicit_task: Optional[str] = None,
    ) -> DatasetProfile:
        """Computes statistical properties and infers task type."""
        n_rows, n_cols = df.shape

        # Identify column types
        datetime_features = [
            c for c in df.columns
            if pd.api.types.is_datetime64_any_dtype(df[c]) or (
                isinstance(c, str) and any(kw in c.lower() for kw in ("date", "time", "timestamp"))
                and pd.to_datetime(df[c], errors="coerce").notna().sum() > 0.8 * n_rows
            )
        ]
        remaining = [c for c in df.columns if c not in datetime_features]

        # Target selection heuristic: only pick if explicitly given or strongly indicated
        target = target_column
        if target is None:
            target_keywords = [
                "target", "label", "class", "churn", "status", "price", "outcome",
                "survived", "y", "response", "ground_truth", "dependent_var", "salary", "sales"
            ]
            for col in remaining:
                if col.lower() in target_keywords or any(kw in col.lower() for kw in ("_target", "_label", "_class")):
                    target = col
                    break

        # Task type detection
        n_classes = None
        class_ratios = {}
        is_imbalanced = False

        if explicit_task:
            task = TaskType(explicit_task.lower())
        elif target is not None and target in df.columns:
            y = df[target].dropna()
            n_unique = y.nunique()
            is_temporal = bool(datetime_features) or (isinstance(df.index, pd.DatetimeIndex))
            is_numeric = pd.api.types.is_numeric_dtype(y)
            is_float = pd.api.types.is_float_dtype(y)

            # Continuous check:
            # - float with > 5 unique values or
            # - integer with wide span (max - min > 15) or > 15 unique values or
            # - unique ratio > 0.3 on N >= 10
            is_continuous = is_numeric and (
                (is_float and n_unique > 5)
                or n_unique > 15
                or (n_rows >= 10 and n_unique / max(1, n_rows) > 0.4 and n_unique > 5)
                or (is_numeric and n_unique > 2 and (float(y.max()) - float(y.min()) > 20))
            )

            if is_temporal and is_numeric and is_continuous:
                task = TaskType.TIME_SERIES
            elif is_continuous:
                task = TaskType.REGRESSION
            else:
                task = TaskType.CLASSIFICATION
                n_classes = n_unique
                counts = y.value_counts(normalize=True).to_dict()
                class_ratios = {str(k): float(v) for k, v in counts.items()}
                min_ratio = min(counts.values()) if counts else 1.0
                is_imbalanced = (min_ratio < 0.20) and (n_classes == 2)
        else:
            task = TaskType.CLUSTERING

        # Features and statistics
        feature_cols = [c for c in remaining if c != target] if target else remaining
        numeric_features = [c for c in feature_cols if pd.api.types.is_numeric_dtype(df[c])]
        categorical_features = [c for c in feature_cols if c not in numeric_features]

        missing_count = int(df[feature_cols].isna().sum().sum()) if feature_cols else 0
        has_missing = missing_count > 0

        high_cardinality_cols = [
            c for c in categorical_features
            if df[c].nunique() > 50 or (n_rows > 0 and df[c].nunique() / n_rows > 0.5)
        ]

        memory_usage_mb = float(df.memory_usage(deep=True).sum() / (1024 * 1024))

        return DatasetProfile(
            n_rows=n_rows,
            n_features=len(feature_cols),
            numeric_features=numeric_features,
            categorical_features=categorical_features,
            datetime_features=datetime_features,
            missing_count=missing_count,
            has_missing=has_missing,
            high_cardinality_cols=high_cardinality_cols,
            target_column=target,
            task_type=task,
            n_classes=n_classes,
            class_ratios=class_ratios,
            is_imbalanced=is_imbalanced,
            memory_usage_mb=memory_usage_mb,
        )

    def select_candidates(
        self,
        profile: DatasetProfile,
        max_recommended: int = 5,
        user_selected_ids: Optional[List[str]] = None,
    ) -> Tuple[List[CandidateRecommendation], List[AlgorithmMetadata]]:
        """
        Intelligently scores and recommends algorithms for the dataset.
        Returns (recommended_candidates, all_available_algorithms).
        """
        all_algorithms = self.registry.list_by_task(profile.task_type)
        recommendations: List[CandidateRecommendation] = []

        n_rows = profile.n_rows
        n_features = profile.n_features
        is_large = n_rows > 50000 or profile.memory_usage_mb > 150
        is_small = n_rows < 1000

        # Heuristic scoring of each algorithm
        scored_candidates: List[Tuple[float, AlgorithmMetadata, str, bool]] = []

        for meta in all_algorithms:
            score = 50.0  # Base neutral score
            rationale_parts = []
            is_baseline = False

            # Classification heuristics
            if profile.task_type == TaskType.CLASSIFICATION:
                if meta.id == "logistic_regression":
                    is_baseline = True
                    score += 35.0
                    rationale_parts.append("Standard linear baseline; provides well-calibrated class probabilities and linear explainability.")
                elif meta.id == "hist_gradient_boosting":
                    score += 45.0
                    rationale_parts.append(f"Top-tier tabular candidate; rapid binning handles N={n_rows} samples efficiently.")
                    if profile.has_missing:
                        score += 15.0
                        rationale_parts.append("Natively handles missing values without imputation bias.")
                elif meta.id == "random_forest":
                    if is_large:
                        score -= 20.0
                        rationale_parts.append(f"Deprioritized due to memory footprint across {n_rows} rows.")
                    else:
                        score += 30.0
                        rationale_parts.append("Resistant to overfitting and captures non-linear feature interactions.")
                elif meta.id == "extra_trees":
                    score += 25.0
                    rationale_parts.append("Randomized split thresholds reduce variance on noisy features.")
                elif meta.id == "sgd_classifier":
                    if is_large:
                        score += 40.0
                        rationale_parts.append(f"Optimal for large-scale data (N={n_rows}); ultra-low memory O(1) streaming updates.")
                    else:
                        score += 10.0
                        rationale_parts.append("Fast linear gradient descent solver.")
                elif meta.id == "svm":
                    if is_large:
                        score -= 30.0
                        rationale_parts.append(f"Excluded from top recommendations: Quadratic complexity O(N^2) scales poorly on N={n_rows}.")
                    elif n_features > n_rows:
                        score += 30.0
                        rationale_parts.append("Excels in high-dimensional domains where feature count exceeds row count (P > N).")
                    else:
                        score += 10.0
                        rationale_parts.append("Effective maximum-margin separation.")
                elif meta.id == "knn":
                    if is_large or n_features > 50:
                        score -= 25.0
                        rationale_parts.append("Curse of dimensionality deteriorates Euclidean distance in high dimensions.")
                    elif is_small:
                        score += 20.0
                        rationale_parts.append("Captures local manifold clusters cleanly in small sample sizes.")
                elif meta.id == "gaussian_nb":
                    score += 15.0
                    rationale_parts.append("Ultra-fast probabilistic benchmark with feature independence assumption.")
                elif meta.id == "gradient_boosting":
                    if is_large:
                        score -= 15.0
                        rationale_parts.append("Sequential tree fitting is slower than HistGradientBoosting on large row counts.")
                    else:
                        score += 25.0
                        rationale_parts.append("High precision boosting on tabular feature boundaries.")
                elif meta.id == "lightgbm":
                    score += 48.0
                    rationale_parts.append("Industry-standard gradient booster with leaf-wise tree splitting and GPU/CPU acceleration.")

                # Imbalance bonus
                if profile.is_imbalanced and meta.tier in (AlgorithmTier.BOOSTING, AlgorithmTier.ENSEMBLE):
                    score += 10.0
                    rationale_parts.append("Robust against class imbalance via weighted splitting.")

            # Regression heuristics
            elif profile.task_type == TaskType.REGRESSION:
                if meta.id in ("linear_regression", "ridge"):
                    if meta.id == "ridge":
                        is_baseline = True
                        score += 35.0
                        rationale_parts.append("L2-regularized linear baseline; guarantees stable matrix inversion against collinearity.")
                    else:
                        score += 20.0
                        rationale_parts.append("Closed-form Ordinary Least Squares regression.")
                elif meta.id == "hist_gradient_boosting_regressor":
                    score += 45.0
                    rationale_parts.append("Best-in-class tabular regressor; rapidly optimizes continuous loss surfaces.")
                    if profile.has_missing:
                        score += 15.0
                        rationale_parts.append("Natively preserves missing value branches.")
                elif meta.id == "random_forest_regressor":
                    if is_large:
                        score -= 20.0
                        rationale_parts.append(f"Deprioritized due to tree ensemble size on N={n_rows}.")
                    else:
                        score += 30.0
                        rationale_parts.append("Accurately fits complex non-linear response surfaces.")
                elif meta.id == "extra_trees_regressor":
                    score += 25.0
                    rationale_parts.append("Fast randomized regression trees with smooth continuous predictions.")
                elif meta.id == "sgd_regressor":
                    if is_large:
                        score += 40.0
                        rationale_parts.append(f"Excellent for large datasets (N={n_rows}); O(1) memory gradient updates.")
                    else:
                        score += 10.0
                        rationale_parts.append("Fast iterative stochastic gradient regressor.")
                elif meta.id == "lasso":
                    if n_features > 20:
                        score += 25.0
                        rationale_parts.append(f"Features count P={n_features} benefits from L1 automatic sparsity feature selection.")
                    else:
                        score += 10.0
                        rationale_parts.append("L1 sparse linear regression.")
                elif meta.id == "elastic_net":
                    score += 15.0
                    rationale_parts.append("Balances L1 feature selection with L2 stability.")
                elif meta.id == "decision_tree_regressor":
                    score += 10.0
                    rationale_parts.append("Fast single-tree benchmark.")
                elif meta.id == "gradient_boosting_regressor":
                    if is_large:
                        score -= 15.0
                        rationale_parts.append("HistGradientBoosting provides equivalent accuracy at much higher speed.")
                    else:
                        score += 25.0
                        rationale_parts.append("Minimizes squared error gradients sequentially.")

            # Clustering heuristics
            elif profile.task_type == TaskType.CLUSTERING:
                if meta.id == "kmeans":
                    is_baseline = True
                    score += 35.0
                    rationale_parts.append("Standard centroid-based clustering baseline.")
                elif meta.id == "minibatch_kmeans":
                    if is_large:
                        score += 45.0
                        rationale_parts.append("Mini-batch stochastic updates prevent RAM exhaustion on large datasets.")
                    else:
                        score += 30.0
                        rationale_parts.append("Rapid approximation of Lloyd's algorithm.")
                elif meta.id == "dbscan":
                    score += 30.0
                    rationale_parts.append("Finds non-spherical clusters and isolates anomalous noise points.")
                elif meta.id == "gaussian_mixture":
                    score += 25.0
                    rationale_parts.append("Soft probabilistic clustering with elliptical covariance.")
                elif meta.id == "agglomerative":
                    if is_large:
                        score -= 40.0
                        rationale_parts.append(f"Excluded from top recommendations: O(N^2) memory footprint will OOM on N={n_rows}.")
                    else:
                        score += 20.0
                        rationale_parts.append("Hierarchical dendrogram clustering.")

            # Dimensionality Reduction heuristics
            elif profile.task_type == TaskType.DIMENSIONALITY_REDUCTION:
                if meta.id == "pca":
                    is_baseline = True
                    score += 45.0
                    rationale_parts.append("Linear orthogonal projection maximizing preserved variance.")
                elif meta.id == "truncated_svd":
                    score += 35.0
                    rationale_parts.append("Direct decomposition suited for sparse matrices and high-dimensional one-hot data.")
                elif meta.id == "tsne":
                    score += 25.0
                    rationale_parts.append("Non-linear manifold affinities optimized for 2D/3D visualization.")
                elif meta.id == "umap":
                    score += 40.0
                    rationale_parts.append("High-speed manifold projection preserving global and local structure.")

            # Time Series heuristics
            elif profile.task_type == TaskType.TIME_SERIES:
                if meta.id == "autoregressive_ridge":
                    is_baseline = True
                    score += 40.0
                    rationale_parts.append("Fast, stabilized autoregressive linear forecaster.")
                elif meta.id == "autoregressive_hist_gb":
                    score += 45.0
                    rationale_parts.append("Captures non-linear seasonal patterns and multi-step dynamics.")
                elif meta.id == "time_series_baseline":
                    score += 20.0
                    rationale_parts.append("Rolling historical central tendency baseline.")

            rationale = " ".join(rationale_parts) if rationale_parts else meta.description
            scored_candidates.append((score, meta, rationale, is_baseline))

        # Sort by score descending
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        # Build recommendations
        rank = 1
        for i, (score, meta, rationale, is_baseline) in enumerate(scored_candidates):
            # Check if user explicitly selected this algorithm
            user_selected = user_selected_ids is not None and meta.id in user_selected_ids
            is_rec = (i < max_recommended) or user_selected

            recommendations.append(
                CandidateRecommendation(
                    algorithm_id=meta.id,
                    algorithm_name=meta.name,
                    task_type=meta.task_type,
                    tier=meta.tier,
                    is_recommended=is_rec,
                    is_baseline=is_baseline,
                    priority_rank=rank,
                    rationale=rationale,
                    estimated_training_speed=meta.speed_tier,
                    interpretability=meta.interpretability,
                )
            )
            rank += 1

        return recommendations, all_algorithms


# Global selector instance
candidate_selector = CandidateSelector()
