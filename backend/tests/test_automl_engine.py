"""
Agentix AutoML Engine & Candidate Selection Test Suite
Validates the complete AutoML architecture, Algorithm Registry,
Candidate Selector, Preprocessor, Evaluator, and API endpoints.
"""

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from core.api.main import app
from core.automl.engine import automl_engine
from core.automl.evaluator import model_evaluator
from core.automl.preprocessing import LeakFreePreprocessor
from core.automl.registry import algorithm_registry
from core.automl.selector import candidate_selector
from core.automl.types import AlgorithmTier, TaskType


@pytest.fixture
def test_client():
    return TestClient(app)


# -----------------------------------------------------------------------------
# 1. Algorithm Registry Tests
# -----------------------------------------------------------------------------

def test_registry_has_32_algorithms():
    all_algos = algorithm_registry.list_all()
    assert len(all_algos) >= 30, f"Expected at least 30 algorithms, got {len(all_algos)}"
    ids = {a.id for a in all_algos}
    assert "logistic_regression" in ids
    assert "random_forest" in ids
    assert "lightgbm" in ids
    assert "ridge" in ids
    assert "kmeans" in ids
    assert "pca" in ids
    assert "autoregressive_ridge" in ids


def test_registry_task_distribution():
    cls_algos = algorithm_registry.list_by_task(TaskType.CLASSIFICATION)
    reg_algos = algorithm_registry.list_by_task(TaskType.REGRESSION)
    clu_algos = algorithm_registry.list_by_task(TaskType.CLUSTERING)
    dim_algos = algorithm_registry.list_by_task(TaskType.DIMENSIONALITY_REDUCTION)
    ts_algos = algorithm_registry.list_by_task(TaskType.TIME_SERIES)

    assert len(cls_algos) >= 10, f"Expected >= 10 classification algorithms, got {len(cls_algos)}"
    assert len(reg_algos) >= 10, f"Expected >= 10 regression algorithms, got {len(reg_algos)}"
    assert len(clu_algos) >= 4, f"Expected >= 4 clustering algorithms, got {len(clu_algos)}"
    assert len(dim_algos) >= 3, f"Expected >= 3 reduction algorithms, got {len(dim_algos)}"
    assert len(ts_algos) >= 3, f"Expected >= 3 time series algorithms, got {len(ts_algos)}"


def test_registry_algorithm_instantiation():
    for algo in algorithm_registry.list_all():
        instance = algorithm_registry.create_instance(algo.id)
        assert instance is not None, f"Failed to instantiate algorithm '{algo.id}'"
        assert hasattr(instance, "fit") or hasattr(instance, "fit_predict") or hasattr(instance, "fit_transform"), (
            f"Algorithm '{algo.id}' has no fit/fit_predict/fit_transform interface"
        )


# -----------------------------------------------------------------------------
# 2. Candidate Selector & Profiling Tests
# -----------------------------------------------------------------------------

def test_candidate_selector_classification_profiling():
    df = pd.DataFrame({
        "feature_1": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
        "feature_2": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        "label": [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    })
    profile = candidate_selector.profile_dataframe(df, target_column="label")
    assert profile.task_type == TaskType.CLASSIFICATION
    assert profile.n_rows == 10
    assert profile.n_features == 2
    assert profile.n_classes == 2

    recs, all_algos = candidate_selector.select_candidates(profile, max_recommended=5)
    rec_ids = [r.algorithm_id for r in recs if r.is_recommended]
    assert len(rec_ids) == 5
    assert "logistic_regression" in rec_ids  # Standard linear baseline


def test_candidate_selector_regression_profiling():
    df = pd.DataFrame({
        "sqft": [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500],
        "price": [200000.0, 280000.0, 350000.0, 420000.0, 510000.0, 600000.0, 710000.0, 800000.0, 900000.0, 1050000.0],
    })
    profile = candidate_selector.profile_dataframe(df, target_column="price")
    assert profile.task_type == TaskType.REGRESSION
    assert profile.n_rows == 10
    assert profile.n_features == 1

    recs, _ = candidate_selector.select_candidates(profile, max_recommended=4)
    rec_ids = [r.algorithm_id for r in recs if r.is_recommended]
    assert len(rec_ids) == 4
    assert "ridge" in rec_ids or "hist_gradient_boosting_regressor" in rec_ids


def test_candidate_selector_clustering_when_no_target():
    df = pd.DataFrame({
        "dim1": [1.0, 1.2, 5.0, 5.2, 9.0, 9.2],
        "dim2": [0.9, 1.1, 4.8, 5.1, 9.1, 8.9],
    })
    profile = candidate_selector.profile_dataframe(df, target_column=None)
    assert profile.task_type == TaskType.CLUSTERING

    recs, _ = candidate_selector.select_candidates(profile, max_recommended=3)
    rec_ids = [r.algorithm_id for r in recs if r.is_recommended]
    assert "kmeans" in rec_ids


# -----------------------------------------------------------------------------
# 3. Leak-Free Preprocessor Tests
# -----------------------------------------------------------------------------

def test_leak_free_preprocessor_prevents_leakage():
    df = pd.DataFrame({
        "num": [10.0, 20.0, 30.0, 40.0, 50.0, np.nan, 70.0, 80.0, 90.0, 100.0],
        "cat": ["A", "B", "A", "B", "C", "A", "C", "B", "A", "C"],
        "target": [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    })
    preprocessor = LeakFreePreprocessor(test_size=0.2, random_state=42)
    split = preprocessor.prepare(df, target_column="target", task_type=TaskType.CLASSIFICATION)

    assert split.X_train.shape[0] == 8
    assert split.X_test.shape[0] == 2
    # Ensure no NaN remains in either train or test matrices
    assert not np.isnan(split.X_train).any()
    assert not np.isnan(split.X_test).any()


# -----------------------------------------------------------------------------
# 4. Evaluator Metric Tests
# -----------------------------------------------------------------------------

def test_evaluator_classification_metrics():
    y_true = np.array([0, 1, 0, 1, 0, 1])
    y_pred = np.array([0, 1, 0, 1, 1, 1])
    metrics = model_evaluator.evaluate_classification(y_true, y_pred)

    assert "accuracy" in metrics
    assert "precision" in metrics
    assert "recall" in metrics
    assert "f1_score" in metrics
    assert "confusion_matrix" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0


def test_evaluator_regression_metrics():
    y_true = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
    y_pred = np.array([11.0, 19.0, 31.0, 39.0, 51.0])
    metrics = model_evaluator.evaluate_regression(y_true, y_pred)

    assert "r2" in metrics
    assert "mae" in metrics
    assert "rmse" in metrics
    assert metrics["mae"] == 1.0


def test_evaluator_clustering_metrics():
    X = np.array([[1, 1], [1, 2], [2, 1], [10, 10], [10, 11], [11, 10]])
    labels = np.array([0, 0, 0, 1, 1, 1])
    metrics = model_evaluator.evaluate_clustering(X, labels)

    assert "silhouette_score" in metrics
    assert metrics["silhouette_score"] > 0.7  # Clean distinct clusters
    assert "davies_bouldin_score" in metrics
    assert "calinski_harabasz_score" in metrics


# -----------------------------------------------------------------------------
# 5. Full AutoML Engine Execution Test
# -----------------------------------------------------------------------------

def test_automl_engine_end_to_end_classification():
    df = pd.DataFrame({
        "feat1": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
        "feat2": [2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0],
        "target": [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
    })
    summary = automl_engine.run_automl(df, target_column="target", dataset_name="test_cls_run", max_candidates=4)

    assert summary.task_type == TaskType.CLASSIFICATION
    assert len(summary.leaderboard) == 4
    assert any(m.is_best for m in summary.leaderboard)
    assert summary.best_score > 0.0
    assert summary.execution_time_sec >= 0.0


# -----------------------------------------------------------------------------
# 6. API Platform Endpoints Tests
# -----------------------------------------------------------------------------

def test_api_algorithms_catalog(test_client):
    res = test_client.get("/api/v1/platform/algorithms")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["data"]["total"] >= 30
    assert len(data["data"]["algorithms"]) >= 30


def test_api_algorithms_filtering(test_client):
    res_cls = test_client.get("/api/v1/platform/algorithms?task_type=classification")
    assert res_cls.status_code == 200
    data_cls = res_cls.json()["data"]["algorithms"]
    assert all(a["task_type"] == "classification" for a in data_cls)

    res_reg = test_client.get("/api/v1/platform/algorithms?task_type=regression")
    assert res_reg.status_code == 200
    data_reg = res_reg.json()["data"]["algorithms"]
    assert all(a["task_type"] == "regression" for a in data_reg)


# -----------------------------------------------------------------------------
# 7. Permutation Feature Importance & XAI Attribution Fallback Tests
# -----------------------------------------------------------------------------

def test_permutation_importance_for_hist_gradient_boosting():
    from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor

    rng = np.random.default_rng(42)
    X_train = rng.normal(size=(160, 3))
    y_reg_train = 5.0 * X_train[:, 0] - 2.0 * X_train[:, 1]
    X_test = rng.normal(size=(60, 3))
    y_reg_test = 5.0 * X_test[:, 0] - 2.0 * X_test[:, 1]

    reg_model = HistGradientBoostingRegressor(random_state=42, max_iter=50, min_samples_leaf=5)
    reg_model.fit(X_train, y_reg_train)
    assert not hasattr(reg_model, "feature_importances_")

    reg_imp = automl_engine._extract_feature_importances(
        reg_model,
        ["signal_a", "signal_b", "noise"],
        X_test=X_test,
        y_test=y_reg_test,
        task_type=TaskType.REGRESSION,
    )
    assert reg_imp
    assert "signal_a" in reg_imp
    assert reg_imp["signal_a"] > reg_imp.get("noise", 0.0)
    assert abs(sum(reg_imp.values()) - 1.0) <= 0.05

    y_cls_train = (X_train[:, 0] > 0.0).astype(int)
    y_cls_test = (X_test[:, 0] > 0.0).astype(int)
    cls_model = HistGradientBoostingClassifier(random_state=42, max_iter=50, min_samples_leaf=5)
    cls_model.fit(X_train, y_cls_train)

    cls_imp = automl_engine._extract_feature_importances(
        cls_model,
        ["signal_a", "signal_b", "noise"],
        X_test=X_test,
        y_test=y_cls_test,
        task_type=TaskType.CLASSIFICATION,
    )
    assert cls_imp
    assert next(iter(cls_imp)) == "signal_a"


def test_xai_endpoint_surrogate_and_eda_fallbacks(test_client, monkeypatch):
    from core.api.v1 import routes_platform

    monkeypatch.setattr(routes_platform, "_latest_dataset_and_run", lambda db, name: (None, None))
    monkeypatch.setattr(routes_platform.data_service, "get_dataset", lambda name: None)

    # Case 1: Persisted HistGradientBoosting winner with empty {} importances + Ridge surrogate
    stage_payloads = {
        "TrainingAgent": {
            "best_model": "Autoregressive HistGradientBoosting",
            "target": "Worldwide Gross",
            "feature_importances": {},
            "leaderboard": [
                {
                    "algorithm_id": "time_series_baseline",
                    "algorithm_name": "Naive Persistence Baseline",
                    "is_baseline": True,
                    "primary_metric_name": "mae",
                    "primary_metric_value": 100.0,
                    "status": "success",
                    "feature_importances": {},
                },
                {
                    "algorithm_id": "autoregressive_ridge",
                    "algorithm_name": "Autoregressive Lagged Ridge",
                    "is_baseline": False,
                    "primary_metric_name": "mae",
                    "primary_metric_value": 42.5,
                    "status": "success",
                    "feature_importances": {"IMDB Rating": 0.45, "US Gross": 0.35, "Production Budget": 0.20},
                },
            ],
        },
        "EDAAgent": None,
    }
    monkeypatch.setattr(routes_platform, "_stage_result", lambda db, run_id, name: stage_payloads.get(name))

    res = test_client.get("/api/v1/platform/xai?dataset_name=legacy_hgb_run")
    assert res.status_code == 200
    payload = res.json()["data"]
    assert payload is not None
    assert payload["method"] == "surrogate_model_attribution"
    assert payload["model"] == "Autoregressive Lagged Ridge"
    assert payload["best_model"] == "Autoregressive HistGradientBoosting"
    assert payload["top_drivers"] == ["IMDB Rating", "US Gross", "Production Budget"]
    assert payload["dominant_feature"] == "IMDB Rating"

    # Case 2: Model leaderboard has no feature importances anywhere -> EDA target correlation fallback
    stage_payloads["TrainingAgent"] = {
        "best_model": "DBSCAN Clustering",
        "target": "Outcome",
        "feature_importances": {},
        "leaderboard": [],
    }
    stage_payloads["EDAAgent"] = {
        "correlations": {
            "Outcome": {"Outcome": 1.0, "Glucose": 0.72, "BMI": 0.28},
        }
    }
    res_eda = test_client.get("/api/v1/platform/xai?dataset_name=eda_only_run")
    assert res_eda.status_code == 200
    payload_eda = res_eda.json()["data"]
    assert payload_eda is not None
    assert payload_eda["method"] == "pearson_target_correlation"
    assert payload_eda["top_drivers"] == ["Glucose", "BMI"]
    assert payload_eda["importances"]["Glucose"] == 0.72

