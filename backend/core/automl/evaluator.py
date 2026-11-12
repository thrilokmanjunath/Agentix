"""
Agentix AutoML Engine - Model Evaluation & Metric Engine
Computes appropriate statistical evaluation metrics across classification,
regression, clustering, dimensionality reduction, and time-series workflows.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    mean_absolute_percentage_error,
    silhouette_score,
    davies_bouldin_score,
    calinski_harabasz_score,
)
from core.automl.types import TaskType

logger = logging.getLogger("agentix_v2")


def _sanitize_float(val: Any) -> Optional[float]:
    """Ensures value is valid JSON-serializable float without NaN or Inf."""
    if val is None:
        return None
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return None
        return round(f, 4)
    except (TypeError, ValueError):
        return None


class ModelEvaluator:
    """
    Evaluates models across task types using appropriate statistical metrics.
    Prevents improper cross-task comparisons and handles edge cases safely.
    """

    @staticmethod
    def evaluate_classification(
        y_true: Union[pd.Series, np.ndarray],
        y_pred: Union[pd.Series, np.ndarray],
        y_prob: Optional[np.ndarray] = None,
        classes: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        """Evaluates classification models."""
        y_t = np.asarray(y_true)
        y_p = np.asarray(y_pred)

        # Basic counts
        n_samples = len(y_t)
        unique_classes = np.unique(y_t)
        n_classes = len(unique_classes)

        acc = accuracy_score(y_t, y_p)
        prec_w = precision_score(y_t, y_p, average="weighted", zero_division=0)
        prec_m = precision_score(y_t, y_p, average="macro", zero_division=0)
        rec_w = recall_score(y_t, y_p, average="weighted", zero_division=0)
        rec_m = recall_score(y_t, y_p, average="macro", zero_division=0)
        f1_w = f1_score(y_t, y_p, average="weighted", zero_division=0)
        f1_m = f1_score(y_t, y_p, average="macro", zero_division=0)

        metrics: Dict[str, Any] = {
            "accuracy": _sanitize_float(acc),
            "precision": _sanitize_float(prec_w),
            "precision_weighted": _sanitize_float(prec_w),
            "precision_macro": _sanitize_float(prec_m),
            "recall": _sanitize_float(rec_w),
            "recall_weighted": _sanitize_float(rec_w),
            "recall_macro": _sanitize_float(rec_m),
            "f1_score": _sanitize_float(f1_w),
            "f1_macro": _sanitize_float(f1_m),
            "n_classes": int(n_classes),
            "n_samples": int(n_samples),
        }

        # Confusion Matrix
        try:
            cm = confusion_matrix(y_t, y_p)
            metrics["confusion_matrix"] = cm.tolist()
            metrics["class_labels"] = [str(c) for c in (classes if classes is not None else unique_classes)]
        except Exception as e:
            logger.debug(f"Could not compute confusion matrix: {e}")

        # ROC-AUC and PR-AUC if probabilities available
        if y_prob is not None:
            try:
                if n_classes == 2:
                    # Binary classification: extract positive class probabilities
                    prob_pos = y_prob[:, 1] if y_prob.ndim == 2 and y_prob.shape[1] >= 2 else y_prob.ravel()
                    metrics["roc_auc"] = _sanitize_float(roc_auc_score(y_t, prob_pos))
                    metrics["pr_auc"] = _sanitize_float(average_precision_score(y_t, prob_pos))
                else:
                    # Multi-class
                    metrics["roc_auc"] = _sanitize_float(
                        roc_auc_score(y_t, y_prob, multi_class="ovr", average="weighted")
                    )
            except Exception as e:
                logger.debug(f"ROC-AUC calculation skipped: {e}")

        return metrics


    @staticmethod
    def evaluate_regression(
        y_true: Union[pd.Series, np.ndarray],
        y_pred: Union[pd.Series, np.ndarray],
    ) -> Dict[str, Any]:
        """Evaluates regression models."""
        y_t = np.asarray(y_true, dtype=float)
        y_p = np.asarray(y_pred, dtype=float)

        mae = mean_absolute_error(y_t, y_p)
        mse = mean_squared_error(y_t, y_p)
        rmse = float(np.sqrt(mse))
        r2 = r2_score(y_t, y_p) if len(y_t) > 1 else 0.0

        metrics: Dict[str, Any] = {
            "r2": _sanitize_float(r2),
            "mae": _sanitize_float(mae),
            "mse": _sanitize_float(mse),
            "rmse": _sanitize_float(rmse),
            "n_samples": len(y_t),
        }

        # MAPE with division-by-zero protection
        try:
            nonzero_mask = np.abs(y_t) > 1e-6
            if np.any(nonzero_mask):
                mape = mean_absolute_percentage_error(y_t[nonzero_mask], y_p[nonzero_mask])
                metrics["mape"] = _sanitize_float(mape * 100.0)  # Reported as percentage
        except Exception:
            pass

        return metrics


    @staticmethod
    def evaluate_clustering(
        X: Union[pd.DataFrame, np.ndarray],
        labels: np.ndarray,
    ) -> Dict[str, Any]:
        """Evaluates clustering partitions."""
        X_mat = np.asarray(X, dtype=float)
        labels_arr = np.asarray(labels)

        unique_labels = np.unique(labels_arr)
        # Exclude noise label -1 in DBSCAN
        cluster_labels = unique_labels[unique_labels >= 0]
        n_clusters = len(cluster_labels)

        metrics: Dict[str, Any] = {
            "n_clusters": int(n_clusters),
            "n_samples": int(len(X_mat)),
            "cluster_distribution": {f"Cluster_{int(c)}": int(np.sum(labels_arr == c)) for c in unique_labels},
        }

        if n_clusters < 2:
            metrics["silhouette_score"] = None
            metrics["davies_bouldin_score"] = None
            metrics["calinski_harabasz_score"] = None
            return metrics


        # Sample capping for silhouette to guarantee sub-second execution on large N
        n_samples = len(X_mat)
        if n_samples > 3000:
            rng = np.random.RandomState(42)
            idx = rng.choice(n_samples, 3000, replace=False)
            X_eval = X_mat[idx]
            y_eval = labels_arr[idx]
        else:
            X_eval = X_mat
            y_eval = labels_arr

        try:
            # Silhouette only valid if valid clusters > 1
            if len(np.unique(y_eval[y_eval >= 0])) >= 2:
                valid_mask = y_eval >= 0
                sil = silhouette_score(X_eval[valid_mask], y_eval[valid_mask])
                metrics["silhouette_score"] = _sanitize_float(sil)
                metrics["silhouette"] = metrics["silhouette_score"]
                db = davies_bouldin_score(X_eval[valid_mask], y_eval[valid_mask])
                metrics["davies_bouldin_score"] = _sanitize_float(db)
                metrics["davies_bouldin"] = metrics["davies_bouldin_score"]
                ch = calinski_harabasz_score(X_eval[valid_mask], y_eval[valid_mask])
                metrics["calinski_harabasz_score"] = _sanitize_float(ch)
                metrics["calinski_harabasz"] = metrics["calinski_harabasz_score"]
        except Exception as e:
            logger.debug(f"Clustering metric calculation exception: {e}")

        return metrics


    @staticmethod
    def evaluate_time_series(
        y_true: Union[pd.Series, np.ndarray],
        y_pred: Union[pd.Series, np.ndarray],
    ) -> Dict[str, Any]:
        """Evaluates time-series forecasting models."""
        y_t = np.asarray(y_true, dtype=float)
        y_p = np.asarray(y_pred, dtype=float)

        mae = mean_absolute_error(y_t, y_p)
        mse = mean_squared_error(y_t, y_p)
        rmse = float(np.sqrt(mse))

        # Directional accuracy: did the prediction move in the same direction as the truth?
        directional_acc = None
        if len(y_t) > 2:
            actual_diff = np.diff(y_t) > 0
            pred_diff = np.diff(y_p) > 0
            directional_acc = float(np.mean(actual_diff == pred_diff))

        metrics: Dict[str, Any] = {
            "mae": _sanitize_float(mae),
            "mse": _sanitize_float(mse),
            "rmse": _sanitize_float(rmse),
            "directional_accuracy": _sanitize_float(directional_acc),
            "n_samples": len(y_t),
        }

        try:
            nonzero_mask = np.abs(y_t) > 1e-6
            if np.any(nonzero_mask):
                mape = mean_absolute_percentage_error(y_t[nonzero_mask], y_p[nonzero_mask])
                metrics["mape"] = _sanitize_float(mape * 100.0)
        except Exception:
            pass

        return metrics


    @staticmethod
    def evaluate_dimensionality_reduction(
        transformer: Any,
        X_orig: np.ndarray,
        X_trans: np.ndarray,
    ) -> Dict[str, Any]:
        """Evaluates dimensionality reduction projections."""
        metrics: Dict[str, Any] = {
            "n_components": int(X_trans.shape[1]),
            "n_samples": int(X_trans.shape[0]),
        }

        # Explained variance for PCA / TruncatedSVD
        exp_var = getattr(transformer, "explained_variance_ratio_", None)
        if exp_var is not None:
            metrics["explained_variance_ratio_sum"] = _sanitize_float(float(np.sum(exp_var)))
            metrics["explained_variance_ratios"] = [_sanitize_float(f) for f in exp_var[:10]]

        # Reconstruction error if inverse_transform is available
        inv_func = getattr(transformer, "inverse_transform", None)
        if callable(inv_func):
            try:
                X_recon = transformer.inverse_transform(X_trans)
                rec_err = float(np.mean((X_orig - X_recon) ** 2))
                metrics["reconstruction_error"] = _sanitize_float(rec_err)
            except Exception:
                pass

        return metrics


# Global singleton instance
model_evaluator = ModelEvaluator()


