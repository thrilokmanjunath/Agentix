"""
Agentix AutoML Engine - Model Execution and Benchmark Orchestrator
Executes multi-candidate model training, cross-validation, metric computation,
and leaderboard generation with strict reproducibility.
"""

import time
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import KFold, StratifiedKFold, TimeSeriesSplit

from core.automl.types import (
    AutoMLSummary,
    CandidateEvaluationResult,
    CandidateRecommendation,
    TaskType,
)
from core.automl.registry import algorithm_registry
from core.automl.selector import candidate_selector, DatasetProfile
from core.automl.preprocessing import LeakFreePreprocessor, PreprocessedSplit
from core.automl.evaluator import ModelEvaluator

logger = logging.getLogger("agentix_v2")


class AutoMLEngine:
    """
    Core execution engine for Agentix AutoML.
    Orchestrates dataset profiling, candidate selection, leak-free training,
    and comparative benchmark evaluation.
    """

    def __init__(
        self,
        registry=algorithm_registry,
        selector=candidate_selector,
        evaluator=ModelEvaluator,
    ):
        self.registry = registry
        self.selector = selector
        self.evaluator = evaluator

    def run_automl(
        self,
        df: pd.DataFrame,
        dataset_name: str,
        target_column: Optional[str] = None,
        explicit_task: Optional[str] = None,
        selected_algorithm_ids: Optional[List[str]] = None,
        max_candidates: int = 5,
        cv_folds: int = 3,
        random_state: int = 42,
    ) -> AutoMLSummary:
        """
        Executes end-to-end AutoML pipeline across multiple algorithm candidates.
        """
        start_time = time.time()

        # Step 1: Profile Dataset & Detect Task Type
        profile = self.selector.profile_dataframe(
            df, target_column=target_column, explicit_task=explicit_task
        )
        task_type = profile.task_type
        target = profile.target_column

        # Step 2: Intelligent Candidate Selection
        recommendations, all_available = self.selector.select_candidates(
            profile, max_recommended=max_candidates, user_selected_ids=selected_algorithm_ids
        )

        # Determine which algorithms to execute
        if selected_algorithm_ids:
            target_algorithms = [
                r for r in recommendations if r.algorithm_id in selected_algorithm_ids
            ]
            if not target_algorithms:
                target_algorithms = [r for r in recommendations if r.is_recommended][:max_candidates]
        else:
            target_algorithms = [r for r in recommendations if r.is_recommended][:max_candidates]

        # Ensure at least 1 candidate is selected
        if not target_algorithms and recommendations:
            target_algorithms = [recommendations[0]]

        # Step 3: Leak-Free Preprocessing
        split = LeakFreePreprocessor.prepare_data(
            df, task_type=task_type, target_column=target, random_state=random_state
        )

        # Primary Metric definition
        if task_type == TaskType.CLASSIFICATION:
            primary_metric_name = "f1_score"
            higher_is_better = True
        elif task_type == TaskType.REGRESSION:
            primary_metric_name = "r2"
            higher_is_better = True
        elif task_type == TaskType.CLUSTERING:
            primary_metric_name = "silhouette_score"
            higher_is_better = True
        elif task_type == TaskType.TIME_SERIES:
            primary_metric_name = "rmse"
            higher_is_better = False
        else:  # DIMENSIONALITY_REDUCTION
            primary_metric_name = "explained_variance_ratio_sum"
            higher_is_better = True

        # Step 4: Train and Evaluate Each Candidate
        leaderboard: List[CandidateEvaluationResult] = []

        for rec in target_algorithms:
            algo_id = rec.algorithm_id
            algo_meta = self.registry.get_metadata(algo_id)
            if not algo_meta:
                continue

            try:
                eval_res = self._train_and_evaluate_candidate(
                    algo_id=algo_id,
                    algo_meta=algo_meta,
                    split=split,
                    task_type=task_type,
                    primary_metric_name=primary_metric_name,
                    is_baseline=rec.is_baseline,
                    cv_folds=cv_folds,
                    random_state=random_state,
                )
                leaderboard.append(eval_res)
            except Exception as e:
                logger.warning(f"AutoML failed to evaluate candidate '{algo_id}': {e}", exc_info=True)
                leaderboard.append(
                    CandidateEvaluationResult(
                        algorithm_id=algo_id,
                        algorithm_name=algo_meta.name,
                        task_type=task_type,
                        tier=algo_meta.tier,
                        is_best=False,
                        is_baseline=rec.is_baseline,
                        primary_metric_name=primary_metric_name,
                        primary_metric_value=0.0,
                        metrics={},
                        fit_time_sec=0.0,
                        status="failed",
                        error_message=str(e),
                    )
                )

        # Step 5: Rank Leaderboard & Determine Best Model
        successful_models = [m for m in leaderboard if m.status == "success"]

        best_algorithm_id = None
        best_feature_importances = {}
        best_y_pred = None

        if successful_models:
            successful_models.sort(
                key=lambda x: x.primary_metric_value if x.primary_metric_value is not None else -9999.0,
                reverse=higher_is_better,
            )
            # Mark the top model as best
            best_model_candidate = successful_models[0]
            best_model_candidate.is_best = True
            best_model_name = best_model_candidate.algorithm_name
            best_algorithm_id = best_model_candidate.algorithm_id
            best_score = best_model_candidate.primary_metric_value
            best_feature_importances = best_model_candidate.feature_importances or {}
            best_y_pred = getattr(best_model_candidate, "_y_pred", None)
        else:
            best_model_name = "No model successfully trained"
            best_score = 0.0

        total_exec_time = round(time.time() - start_time, 2)

        # Convert y_test to list if present
        y_test_list = split.y_test.tolist() if split.y_test is not None and hasattr(split.y_test, "tolist") else None
        y_pred_list = best_y_pred.tolist() if best_y_pred is not None and hasattr(best_y_pred, "tolist") else (list(best_y_pred) if best_y_pred is not None else None)

        return AutoMLSummary(
            dataset_name=dataset_name,
            task_type=task_type,
            target_column=target,
            rows=profile.n_rows,
            cols=profile.n_features,
            features=split.feature_names,
            best_model=best_model_name,
            best_algorithm_id=best_algorithm_id,
            best_score=best_score,
            primary_metric=primary_metric_name,
            best_feature_importances=best_feature_importances,
            leaderboard=leaderboard,
            recommended_candidates=recommendations,
            y_test=y_test_list,
            y_pred=y_pred_list,
            execution_time_sec=total_exec_time,
        )

    def _train_and_evaluate_candidate(
        self,
        algo_id: str,
        algo_meta: Any,
        split: PreprocessedSplit,
        task_type: TaskType,
        primary_metric_name: str,
        is_baseline: bool,
        cv_folds: int,
        random_state: int,
    ) -> CandidateEvaluationResult:
        """Trains a single algorithm instance and computes metrics."""
        fit_start = time.time()
        model = self.registry.create_instance(algo_id)

        X_train = split.X_train
        X_test = split.X_test
        y_train = split.y_train
        y_test = split.y_test

        metrics: Dict[str, Any] = {}
        feature_importances: Dict[str, float] = {}
        y_pred = None

        if task_type == TaskType.CLASSIFICATION:
            # Fit model
            model.fit(X_train, y_train)
            fit_time = round(time.time() - fit_start, 4)

            # Predictions
            y_pred = model.predict(X_test)

            # Probabilities if available
            y_prob = None
            if hasattr(model, "predict_proba"):
                try:
                    y_prob = model.predict_proba(X_test)
                except Exception:
                    pass

            metrics = self.evaluator.evaluate_classification(
                y_true=y_test,
                y_pred=y_pred,
                y_prob=y_prob,
                classes=split.classes,
            )

        elif task_type == TaskType.REGRESSION:
            # If target scaler is present and model is SGDRegressor, fit with scaled target
            if algo_id == "sgd_regressor" and split.target_scaler is not None:
                y_train_scaled = split.target_scaler.transform(y_train.reshape(-1, 1)).ravel()
                model.fit(X_train, y_train_scaled)
                fit_time = round(time.time() - fit_start, 4)
                y_pred_scaled = model.predict(X_test)
                y_pred = split.target_scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).ravel()
            else:
                model.fit(X_train, y_train)
                fit_time = round(time.time() - fit_start, 4)
                y_pred = model.predict(X_test)

            metrics = self.evaluator.evaluate_regression(y_true=y_test, y_pred=y_pred)

        elif task_type == TaskType.CLUSTERING:
            # Fit clustering model
            labels = model.fit_predict(X_train)
            fit_time = round(time.time() - fit_start, 4)
            y_pred = labels
            metrics = self.evaluator.evaluate_clustering(X=X_train, labels=labels)

        elif task_type == TaskType.DIMENSIONALITY_REDUCTION:
            # Fit projection
            if hasattr(model, "fit_transform"):
                X_trans = model.fit_transform(X_train)
            else:
                X_trans = model.fit(X_train).transform(X_train)
            fit_time = round(time.time() - fit_start, 4)
            metrics = self.evaluator.evaluate_dimensionality_reduction(
                transformer=model, X_orig=X_train, X_trans=X_trans
            )

        elif task_type == TaskType.TIME_SERIES:
            # Train sequential regression model
            model.fit(X_train, y_train)
            fit_time = round(time.time() - fit_start, 4)
            y_pred = model.predict(X_test)
            metrics = self.evaluator.evaluate_time_series(y_true=y_test, y_pred=y_pred)

        # Extract feature importances (native tree/linear weights or permutation importance)
        feature_importances = self._extract_feature_importances(
            model,
            split.feature_names,
            X_test=X_test,
            y_test=y_test,
            task_type=task_type,
        )

        primary_val = metrics.get(primary_metric_name)
        if primary_val is None:
            # Fallback to alternate key if primary metric wasn't computed
            primary_val = metrics.get("accuracy") or metrics.get("mae") or 0.0

        res = CandidateEvaluationResult(
            algorithm_id=algo_id,
            algorithm_name=algo_meta.name,
            task_type=task_type,
            tier=algo_meta.tier,
            is_best=False,
            is_baseline=is_baseline,
            primary_metric_name=primary_metric_name,
            primary_metric_value=float(primary_val),
            metrics=metrics,
            fit_time_sec=fit_time,
            feature_importances=feature_importances,
            status="success",
        )
        res._y_pred = y_pred
        return res

    def _extract_feature_importances(
        self,
        model: Any,
        feature_names: List[str],
        X_test: Optional[np.ndarray] = None,
        y_test: Optional[np.ndarray] = None,
        task_type: Optional[TaskType] = None,
    ) -> Dict[str, float]:
        """Extracts normalized feature importances via native attributes, permutation importance, or unsupervised loadings."""
        importances: Dict[str, float] = {}
        if not feature_names or isinstance(model, (DummyClassifier, DummyRegressor)):
            return importances

        def _normalize_scores(raw_scores: np.ndarray) -> Dict[str, float]:
            arr = np.asarray(raw_scores, dtype=float)
            arr = np.where(np.isfinite(arr), np.maximum(arr, 0.0), 0.0)
            total = float(np.sum(arr))
            if total <= 0.0:
                return {}
            norm = arr / total
            mapped = {name: round(float(val), 4) for name, val in zip(feature_names, norm) if float(val) > 0.0}
            return dict(sorted(mapped.items(), key=lambda kv: kv[1], reverse=True)[:10])

        # 1. Tree-based native feature importances
        if hasattr(model, "feature_importances_"):
            try:
                imp = _normalize_scores(model.feature_importances_)
                if imp:
                    return imp
            except Exception:
                pass

        # 2. Linear model coefficients
        if hasattr(model, "coef_"):
            try:
                coef = np.atleast_2d(model.coef_)
                imp = _normalize_scores(np.mean(np.abs(coef), axis=0))
                if imp:
                    return imp
            except Exception:
                pass

        # 3. Model-agnostic permutation importance on held-out test set
        # Covers HistGradientBoosting, KNN, SVM (RBF), Naive Bayes, MLPs, etc.
        if (
            X_test is not None
            and y_test is not None
            and len(X_test) >= 2
            and len(y_test) == len(X_test)
            and hasattr(model, "predict")
        ):
            try:
                if len(X_test) > 300:
                    rng = np.random.default_rng(42)
                    idx = rng.choice(len(X_test), size=300, replace=False)
                    X_eval = X_test[idx]
                    y_eval = y_test[idx]
                else:
                    X_eval = X_test
                    y_eval = y_test

                scoring = (
                    "accuracy"
                    if task_type == TaskType.CLASSIFICATION
                    else "neg_mean_absolute_error"
                )
                perm = permutation_importance(
                    model,
                    X_eval,
                    y_eval,
                    n_repeats=3,
                    random_state=42,
                    scoring=scoring,
                    n_jobs=1,
                )
                imp = _normalize_scores(perm.importances_mean)
                if imp:
                    return imp
            except Exception as exc:
                logger.debug(f"Permutation importance skipped for {type(model).__name__}: {exc}")

        # 4. Unsupervised dimensionality reduction loadings (PCA, TruncatedSVD)
        if hasattr(model, "components_"):
            try:
                comps = np.atleast_2d(model.components_)
                if comps.shape[1] == len(feature_names):
                    imp = _normalize_scores(np.mean(np.abs(comps), axis=0))
                    if imp:
                        return imp
            except Exception:
                pass

        # 5. Clustering centroid spread (KMeans, MiniBatchKMeans)
        if hasattr(model, "cluster_centers_"):
            try:
                centers = np.atleast_2d(model.cluster_centers_)
                if centers.shape[0] > 1 and centers.shape[1] == len(feature_names):
                    imp = _normalize_scores(np.std(centers, axis=0))
                    if imp:
                        return imp
            except Exception:
                pass

        return importances


# Global AutoML engine instance
automl_engine = AutoMLEngine()
