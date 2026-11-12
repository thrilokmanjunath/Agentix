import json
import logging
import math
import os
import re
import shutil
from datetime import datetime
from typing import Optional, Any, Dict, List, Tuple

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.schemas.api_schemas import (
    DatasetRequest, ChatRequest, BaseResponse, PredictRequest,
    ConversationCreateRequest, ConversationRenameRequest,
    AutoMLRunRequest, AIConfigUpdateRequest, AIModelDiscoveryRequest
)
from core.automl.registry import algorithm_registry
from core.automl.engine import automl_engine
from core.automl.types import TaskType
from core.services.data_service import data_service
from core.agents.profiling_agent import ProfilingAgent, ProfilingInput
from core.orchestrator import PipelineOrchestrator
from core.context import current_user_id
from core.repositories.database import SessionLocal
from core.models.models import WorkflowRun, PipelineStage, Dataset, User, Conversation, ChatMessage
from core.hardware.detector import HardwareDetector
from core.hardware.models import ModelRegistry
from core.engines.execution import ExecutionEngine
from core.services.llm_service import generate as llm_generate, LLMUnavailableError
from core.guardrails.engine import guardrail_engine
from core.prompts.registry import prompt_registry
from core.rag.retriever import rag_retriever
from core.cache.llm_cache import llm_cache
from core.services.model_router import model_router
from core.evaluations.evaluator import ai_evaluator
from core.telemetry import GenAISpanContext
from core.mcp.registry import mcp_registry, ToolRiskTier
from core.auth import set_user_context
from core.auth.rbac import Permission, get_user_permissions

logger = logging.getLogger("agentix_v2")
router = APIRouter()
orchestrator = PipelineOrchestrator()


# ---------------------------------------------------------------------------
# Shared helpers: pull real, persisted pipeline results out of the DB instead
# of fabricating data. A dataset can have multiple WorkflowRuns (reprocessed,
# retried); we always read the most recent one.
# ---------------------------------------------------------------------------

def _latest_dataset_and_run(db: Session, dataset_name: str, user_id: Optional[str] = None):
    uid = user_id or current_user_id.get() or "guest_user"
    query = db.query(Dataset).filter_by(name=dataset_name)
    if uid and uid not in ("guest_user", "default", "default-user"):
        dataset = query.filter_by(owner_id=uid).order_by(Dataset.created_at.desc()).first()
        if not dataset:
            # Fall back to public/guest dataset for backward compatibility
            dataset = query.filter(Dataset.owner_id.in_(["guest_user", "default", "default-user"])).order_by(Dataset.created_at.desc()).first()
    else:
        dataset = query.order_by(Dataset.created_at.desc()).first()

    if not dataset:
        return None, None
    run = (
        db.query(WorkflowRun)
        .filter_by(dataset_id=dataset.id)
        .order_by(WorkflowRun.created_at.desc())
        .first()
    )
    return dataset, run


def _stage_result(db: Session, run_id: str, agent_name: str) -> Optional[Dict[str, Any]]:
    if not run_id:
        return None
    stage = (
        db.query(PipelineStage)
        .filter_by(run_id=run_id, agent_name=agent_name, status="completed")
        .first()
    )
    if not stage or not stage.output_data:
        return None
    payload = json.loads(stage.output_data)
    return payload.get("result", payload)


@router.post("/profile", response_model=BaseResponse)
async def profile_endpoint(req: DatasetRequest):
    # Bug fix: this endpoint used to unconditionally call orchestrator.start_pipeline()
    # + re-run ProfilingAgent live against data_service's in-memory dict, every time it
    # was hit. Two real problems resulted: (1) data_service is keyed only by dataset_name,
    # so once the full pipeline had run past Profiling (Cleaning/FeatureEngineering
    # overwrite the same key), a live re-profile after that point returned stats for the
    # *transformed* data (e.g. one-hot-encoded column count, post-imputation zero missing)
    # rather than the raw upload — while still being displayed as the dataset's raw
    # Overview. (2) start_pipeline() created a brand new WorkflowRun with no dataset_id
    # every single call, which was never marked completed/failed — the source of the
    # orphaned WorkflowRun rows stuck at status="started" found in the database.
    # Fix: prefer the already-persisted ProfilingAgent result from the dataset's latest
    # completed run (same pattern as /eda, /xai, /insights below), and only fall back to
    # a live single-stage profile when no pipeline has been run for this dataset yet.
    db = SessionLocal()
    try:
        _, run = _latest_dataset_and_run(db, req.dataset_name)
        persisted = _stage_result(db, run.id if run else None, "ProfilingAgent")
        if persisted is not None:
            return BaseResponse(status="success", message="OK", data=persisted)
    finally:
        db.close()

    user_id = current_user_id.get() or "guest_user"
    try:
        run_id = orchestrator.start_pipeline(user_id=user_id)
        agent = ProfilingAgent()
        input_data = ProfilingInput(dataset_name=req.dataset_name, user_id=user_id)
        engine = ExecutionEngine.get_optimal_engine(dataset_size_mb=0.0)
        output = orchestrator.execute_stage(run_id, agent, input_data, engine)
        return BaseResponse(status="success", message="OK", data=output)
    except Exception as e:
        logger.error(f"Error in profile: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


# `/clean` and `/feature-engineering` used to be no-op stubs that claimed
# "success" without doing anything. Real cleaning/feature-engineering already
# runs as part of the full 9-stage pipeline (`POST /start-workflow`); these
# standalone endpoints have no frontend caller and would need their own
# parquet/session bookkeeping to run a single stage in isolation safely, so
# rather than fake success we say plainly that they're not available.
@router.post("/clean", response_model=BaseResponse)
async def clean_endpoint(req: DatasetRequest):
    raise HTTPException(
        status_code=501,
        detail="Standalone cleaning is not available; cleaning runs automatically as part of the full pipeline (start-workflow).",
    )


@router.post("/feature-engineering", response_model=BaseResponse)
async def fe_endpoint(req: DatasetRequest):
    raise HTTPException(
        status_code=501,
        detail="Standalone feature engineering is not available; it runs automatically as part of the full pipeline (start-workflow).",
    )


@router.get("/eda", response_model=BaseResponse)
async def eda_endpoint(dataset_name: str):
    db = SessionLocal()
    try:
        _, run = _latest_dataset_and_run(db, dataset_name)
        result = _stage_result(db, run.id if run else None, "EDAAgent")
        if result is None:
            return BaseResponse(status="success", message="No completed EDA run found for this dataset.", data=None)
        return BaseResponse(status="success", message="OK", data=result)
    finally:
        db.close()


def _leaderboard_from_stages(db: Session, run_id: Optional[str], dataset_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    training = _stage_result(db, run_id, "TrainingAgent")
    evaluation = _stage_result(db, run_id, "EvaluationAgent")

    ds_info = data_service.get_dataset(dataset_name) if dataset_name else None

    if training is None and not ds_info:
        return None

    # Merge info from DB stage or in-memory data_service
    problem_type = (training or {}).get("problem_type") or (ds_info or {}).get("problem_type")
    target = (training or {}).get("target") or (ds_info or {}).get("target_column")
    best_model = (training or {}).get("best_model") or (training or {}).get("model_type") or (ds_info or {}).get("best_model")
    best_score = (training or {}).get("best_score") or (ds_info or {}).get("best_score")
    primary_metric = (training or {}).get("primary_metric") or (ds_info or {}).get("primary_metric")
    stored_leaderboard = (training or {}).get("leaderboard") or (ds_info or {}).get("leaderboard")
    rec_candidates = (training or {}).get("recommended_candidates") or (ds_info or {}).get("recommended_candidates") or []
    feature_importances = (training or {}).get("feature_importances") or (ds_info or {}).get("feature_importances") or {}

    if stored_leaderboard and isinstance(stored_leaderboard, list) and len(stored_leaderboard) > 0:
        leaderboard_rows = []
        for idx, entry in enumerate(stored_leaderboard):
            metrics = entry.get("metrics", {})
            row = {
                "rank": idx + 1,
                "model": entry.get("algorithm_name", entry.get("algorithm_id")),
                "algorithm_id": entry.get("algorithm_id"),
                "tier": entry.get("tier"),
                "is_best": entry.get("is_best", False),
                "is_baseline": entry.get("is_baseline", False),
                "score": entry.get("primary_metric_value"),
                "primary_metric": entry.get("primary_metric_name"),
                "fit_time_sec": entry.get("fit_time_sec"),
                **metrics,
                "feature_importances": entry.get("feature_importances") or feature_importances,
            }
            leaderboard_rows.append(row)

        return {
            "problem_type": problem_type,
            "target": target,
            "best_model": best_model,
            "best_score": best_score,
            "primary_metric": primary_metric,
            "leaderboard": leaderboard_rows,
            "recommended_candidates": rec_candidates,
            "feature_importances": feature_importances,
        }

    # Fallback for single model legacy runs
    metrics = evaluation or {}
    if problem_type == "regression":
        score = metrics.get("r2")
    else:
        score = metrics.get("accuracy")

    leaderboard_row = {
        "model": (training or {}).get("model_type", (training or {}).get("model_id", "Model")),
        "score": score,
        **metrics,
        "feature_importances": feature_importances,
    }

    return {
        "problem_type": problem_type,
        "target": target,
        "best_model": best_model,
        "leaderboard": [leaderboard_row],
    }


@router.get("/algorithms", response_model=BaseResponse)
async def list_algorithms_endpoint(task_type: Optional[str] = None):
    """
    Returns the Agentix Algorithm Registry catalog.
    Can be filtered by task_type (classification, regression, clustering, dimensionality_reduction, time_series).
    """
    if task_type:
        try:
            tt = TaskType(task_type.lower())
            algos = algorithm_registry.list_by_task(tt)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid task_type: '{task_type}'. Valid values: {[t.value for t in TaskType]}")
    else:
        algos = algorithm_registry.list_all()

    catalog = [a.model_dump() for a in algos]
    return BaseResponse(
        status="success",
        message=f"Retrieved {len(catalog)} algorithms from Agentix Algorithm Registry",
        data={"algorithms": catalog, "total": len(catalog)},
    )


@router.post("/automl/run", response_model=BaseResponse)
async def run_automl_endpoint(req: AutoMLRunRequest):
    """
    Triggers an intelligent multi-candidate AutoML exploration run.
    """
    db = SessionLocal()
    try:
        dataset, run = _latest_dataset_and_run(db, req.dataset_name)
        dataset_info = data_service.get_dataset(req.dataset_name) or {}
        parquet_path = dataset_info.get("parquet_path")
        
        # If parquet path not in data_service, try to read file path from DB dataset
        if not parquet_path and dataset:
            if dataset.file_path and os.path.exists(f"{dataset.file_path}.parquet"):
                parquet_path = f"{dataset.file_path}.parquet"
            elif dataset.file_path and os.path.exists(dataset.file_path):
                parquet_path = dataset.file_path

        if not parquet_path or not os.path.exists(parquet_path):
            raise HTTPException(status_code=404, detail=f"Dataset '{req.dataset_name}' data files not found. Please upload and parse the dataset first.")

        # Load data
        import pandas as pd
        if parquet_path.endswith(".parquet"):
            df = pd.read_parquet(parquet_path)
        else:
            df = pd.read_csv(parquet_path)

        target = req.target_column or dataset_info.get("target_column")
        
        summary = automl_engine.run_automl(
            df=df,
            target_column=target,
            dataset_name=req.dataset_name,
            user_selected_ids=req.selected_algorithms,
            max_candidates=req.max_candidates or 5,
        )

        leaderboard_data = [m.model_dump() for m in summary.leaderboard]
        recommended_candidates = [c.model_dump() for c in summary.recommended_candidates]

        # Update in-memory data_service
        data_service.store_dataset(req.dataset_name, {
            **dataset_info,
            "problem_type": summary.task_type.value,
            "y_test": summary.y_test,
            "y_pred": summary.y_pred,
            "automl_summary": summary.model_dump(),
            "leaderboard": leaderboard_data,
            "recommended_candidates": recommended_candidates,
            "feature_importances": summary.best_feature_importances or {},
            "best_model": summary.best_model,
            "best_score": summary.best_score,
            "primary_metric": summary.primary_metric,
        }, change_summary="AutoML Multi-Candidate Training Complete via API")

        return BaseResponse(
            status="success",
            message=f"AutoML run completed across {len(leaderboard_data)} candidates. Best: {summary.best_model}",
            data=summary.model_dump(),
        )
    finally:
        db.close()


@router.post("/predict", response_model=BaseResponse)
async def predict_endpoint(req: PredictRequest):
    dataset_name = getattr(req, "dataset_name", None)
    db = SessionLocal()
    try:
        _, run = _latest_dataset_and_run(db, dataset_name) if dataset_name else (None, None)
        data = _leaderboard_from_stages(db, run.id if run else None, dataset_name=dataset_name)
        if data is None:
            return BaseResponse(status="success", message="No trained model found for this dataset yet.", data=None)
        return BaseResponse(status="success", message="OK", data=data)
    finally:
        db.close()


@router.get("/automl", response_model=BaseResponse)
async def automl_endpoint(dataset_name: str):
    db = SessionLocal()
    try:
        _, run = _latest_dataset_and_run(db, dataset_name)
        data = _leaderboard_from_stages(db, run.id if run else None, dataset_name=dataset_name)
        if data is None:
            return BaseResponse(status="success", message="No trained model found for this dataset yet.", data={"leaderboard": []})
        return BaseResponse(status="success", message="OK", data=data)
    finally:
        db.close()


_LOWER_IS_BETTER_METRICS = {"mae", "mse", "rmse", "mape", "davies_bouldin_score"}


def _clean_normalized_importances(raw: Any, limit: int = 10) -> Dict[str, float]:
    """Normalize positive finite feature attribution scores into top-N descending shares."""
    if not isinstance(raw, dict):
        return {}
    cleaned: Dict[str, float] = {}
    for k, v in raw.items():
        try:
            fval = abs(float(v))
        except (TypeError, ValueError):
            continue
        if math.isfinite(fval) and fval > 0.0:
            cleaned[str(k)] = fval
    total = sum(cleaned.values())
    if total <= 0.0:
        return {}
    normalized = {k: round(v / total, 4) for k, v in cleaned.items()}
    return dict(sorted(normalized.items(), key=lambda kv: kv[1], reverse=True)[:limit])


def _classify_attribution_method(model_name: Optional[str]) -> Tuple[str, str]:
    """Return an honest (method, method_label) pair for the winning model architecture."""
    name = (model_name or "").lower()
    if any(tok in name for tok in ("histgradientboosting", "hist gradient", "knn", "nearest", "svm", "svc", "svr", "naive bayes", "gaussian", "mlp", "neural")):
        return "permutation_importance", "Permutation Feature Importance"
    if any(tok in name for tok in ("forest", "tree", "gradientboosting", "gradient boosting", "lightgbm", "xgboost", "catboost")):
        return "tree_feature_importances", "Tree Feature Importances"
    if any(tok in name for tok in ("pca", "svd", "kmeans", "k-means", "mixture", "gmm")):
        return "structural_loadings", "Structural Component Attribution"
    if any(tok in name for tok in ("ridge", "lasso", "elastic", "logistic", "linear", "sgd")):
        return "linear_model_coefficients", "Linear Model Coefficients"
    return "model_feature_importances", "Model Feature Importances"


def _resolve_xai_attribution(
    training: Optional[Dict[str, Any]],
    ds_info: Optional[Dict[str, Any]],
    eda: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Resolve real feature attributions from the winning model, attributed leaderboard surrogate, or EDA correlations."""
    best_model = (
        (training or {}).get("best_model")
        or (training or {}).get("model_type")
        or (ds_info or {}).get("best_model")
    )
    target = (training or {}).get("target") or (ds_info or {}).get("target_column")
    leaderboard = (training or {}).get("leaderboard") or (ds_info or {}).get("leaderboard") or []

    # 1. Direct attribution from the winning model (native importances, coefficients, or permutation importance)
    direct_imp = _clean_normalized_importances(
        (training or {}).get("feature_importances") or (ds_info or {}).get("feature_importances") or {}
    )
    if direct_imp:
        method, method_label = _classify_attribution_method(best_model)
        top_drivers = list(direct_imp.keys())[:5]
        return {
            "method": method,
            "method_label": method_label,
            "model": best_model,
            "best_model": best_model,
            "target": target,
            "top_drivers": top_drivers,
            "dominant_feature": top_drivers[0],
            "importances": direct_imp,
        }

    # 2. Surrogate attribution from highest-ranked leaderboard candidate with computed importances
    attributed_candidates: List[Dict[str, Any]] = []
    for entry in leaderboard:
        if not isinstance(entry, dict):
            continue
        if entry.get("status", "success") != "success":
            continue
        imp = _clean_normalized_importances(entry.get("feature_importances"))
        if imp:
            attributed_candidates.append({**entry, "_clean_imp": imp})

    if attributed_candidates:
        def _sort_key(entry: Dict[str, Any]) -> Tuple[int, float]:
            metric_name = str(entry.get("primary_metric_name") or "").lower()
            raw_val = entry.get("primary_metric_value")
            try:
                val = float(raw_val) if raw_val is not None else 0.0
            except (TypeError, ValueError):
                val = 0.0
            is_baseline = 1 if entry.get("is_baseline") else 0
            score_key = val if metric_name in _LOWER_IS_BETTER_METRICS else -val
            return (is_baseline, score_key)

        attributed_candidates.sort(key=_sort_key)
        surrogate = attributed_candidates[0]
        surrogate_name = surrogate.get("algorithm_name") or surrogate.get("algorithm_id") or "Benchmark Surrogate"
        imp = surrogate["_clean_imp"]
        top_drivers = list(imp.keys())[:5]
        return {
            "method": "surrogate_model_attribution",
            "method_label": f"Surrogate Model Attribution ({surrogate_name})",
            "model": surrogate_name,
            "best_model": best_model,
            "target": target,
            "top_drivers": top_drivers,
            "dominant_feature": top_drivers[0],
            "importances": imp,
        }

    # 3. Statistical EDA fallback (Pearson correlation with target or multivariate association)
    corr_matrix = (eda or {}).get("correlations") or {}
    if isinstance(corr_matrix, dict) and corr_matrix:
        if target and isinstance(corr_matrix.get(target), dict):
            raw_corr = {k: v for k, v in corr_matrix[target].items() if k != target}
            imp = _clean_normalized_importances(raw_corr)
            if imp:
                top_drivers = list(imp.keys())[:5]
                return {
                    "method": "pearson_target_correlation",
                    "method_label": "Target Correlation Magnitude",
                    "model": "Statistical EDA",
                    "best_model": best_model,
                    "target": target,
                    "top_drivers": top_drivers,
                    "dominant_feature": top_drivers[0],
                    "importances": imp,
                }
        avg_corr: Dict[str, float] = {}
        for col, row in corr_matrix.items():
            if not isinstance(row, dict):
                continue
            vals = []
            for other, v in row.items():
                if other == col:
                    continue
                try:
                    fv = abs(float(v))
                except (TypeError, ValueError):
                    continue
                if math.isfinite(fv):
                    vals.append(fv)
            if vals:
                avg_corr[col] = sum(vals) / len(vals)
        imp = _clean_normalized_importances(avg_corr)
        if imp:
            top_drivers = list(imp.keys())[:5]
            return {
                "method": "multivariate_variance_association",
                "method_label": "Multivariate Feature Association",
                "model": "Statistical EDA",
                "best_model": best_model,
                "target": target,
                "top_drivers": top_drivers,
                "dominant_feature": top_drivers[0],
                "importances": imp,
            }

    return None


@router.get("/xai", response_model=BaseResponse)
async def xai_endpoint(dataset_name: str):
    db = SessionLocal()
    try:
        _, run = _latest_dataset_and_run(db, dataset_name)
        run_id = run.id if run else None
        training = _stage_result(db, run_id, "TrainingAgent")
        eda = _stage_result(db, run_id, "EDAAgent")
        ds_info = data_service.get_dataset(dataset_name)

        if training is None and ds_info is None and eda is None:
            return BaseResponse(status="success", message="No trained model found for this dataset yet.", data=None)

        data = _resolve_xai_attribution(training=training, ds_info=ds_info, eda=eda)
        if data is None:
            return BaseResponse(status="success", message="Feature attributions are not available for this dataset yet.", data=None)

        return BaseResponse(status="success", message="OK", data=data)
    finally:
        db.close()


def _ollama_model_or_none() -> Optional[str]:
    provider = ExecutionEngine.select_llm_provider()
    if provider.get("provider") in ("ollama", "lm_studio"):
        return provider.get("model")
    return None


def _resolve_active_llm(
    requested_model: Optional[str] = None,
    requested_provider: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """Resolve active (provider, model) supporting local runtimes and configured cloud API keys."""
    from core.config import settings

    if requested_model or requested_provider:
        resolved = ExecutionEngine.select_llm_provider(
            requested_model=requested_model,
            requested_provider=requested_provider,
        )
        prov = resolved.get("provider")
        model = resolved.get("model")
        return (prov, model) if prov and prov != "none" and model else (None, None)

    inference_mode = (settings.AI_INFERENCE_MODE or "local").lower()
    active_prov = (settings.AI_PROVIDER or "ollama").lower()

    if active_prov in ("gemini", "openai", "anthropic") and inference_mode != "local":
        resolved = ExecutionEngine.select_llm_provider()
        prov = resolved.get("provider")
        model = resolved.get("model")
        if prov and prov != "none" and model:
            return prov, model

    local_model = _ollama_model_or_none()
    if local_model:
        return active_prov if active_prov in ("ollama", "lm_studio") else "ollama", local_model

    if inference_mode != "local":
        resolved = ExecutionEngine.select_llm_provider()
        prov = resolved.get("provider")
        model = resolved.get("model")
        if prov and prov != "none" and model:
            return prov, model

    return None, None


@router.get("/insights", response_model=BaseResponse)
async def insights_endpoint(dataset_name: str):
    db = SessionLocal()
    try:
        _, run = _latest_dataset_and_run(db, dataset_name)
        eda = _stage_result(db, run.id if run else None, "EDAAgent") or {}
        training = _stage_result(db, run.id if run else None, "TrainingAgent") or {}
        evaluation = _stage_result(db, run.id if run else None, "EvaluationAgent") or {}

        if not eda and not evaluation:
            return BaseResponse(status="success", message="No completed analysis found for this dataset yet.", data=None)

        provider, model = _resolve_active_llm()
        if model and provider:
            context = {"eda_statistics": eda.get("statistics", {}), "training": training, "evaluation": evaluation}
            prompt = (
                f"You are a data analyst. Based on this real pipeline output for dataset '{dataset_name}', "
                f"write 3 short, concrete insight bullet points (no more than 20 words each), grounded only in "
                f"the numbers given, no invented statistics:\n{json.dumps(context, default=str)}"
            )
            try:
                try:
                    text = llm_generate(prompt, model, provider=provider)
                except TypeError:
                    text = llm_generate(prompt, model)
                insights = [line.strip("-* ").strip() for line in text.splitlines() if line.strip()][:5]
                return BaseResponse(status="success", message="OK", data={"insights": insights, "source": provider, "model": model})
            except LLMUnavailableError as e:
                logger.warning(f"Insights LLM call failed, falling back to rule-based: {e}")

        # Deterministic fallback grounded in real numbers, no LLM required.
        insights = []
        stats = eda.get("statistics", {})
        if stats:
            col, s = max(stats.items(), key=lambda kv: abs(kv[1].get("skew", 0)))
            insights.append(f"'{col}' is the most skewed numeric column (skew={s.get('skew'):.2f}).")
        if evaluation.get("accuracy") is not None:
            insights.append(f"The trained {training.get('model_type', 'model')} reached {evaluation['accuracy']*100:.1f}% accuracy on held-out data.")
        if evaluation.get("r2") is not None:
            insights.append(f"The trained {training.get('model_type', 'model')} reached an R² of {evaluation['r2']:.3f} on held-out data.")
        if not insights:
            insights.append("Not enough completed pipeline data yet to generate insights.")
        return BaseResponse(status="success", message="OK", data={"insights": insights, "source": "rule-based"})
    finally:
        db.close()


@router.get("/recommendations", response_model=BaseResponse)
async def recommendations_endpoint(dataset_name: str):
    db = SessionLocal()
    try:
        _, run = _latest_dataset_and_run(db, dataset_name)
        evaluation = _stage_result(db, run.id if run else None, "EvaluationAgent")
        cleaning = _stage_result(db, run.id if run else None, "CleaningAgent")

        if evaluation is None and cleaning is None:
            return BaseResponse(status="success", message="No completed analysis found for this dataset yet.", data=None)

        actions = []
        if cleaning and cleaning.get("imputation"):
            n_imputed = len(cleaning["imputation"])
            actions.append(f"{n_imputed} column(s) had missing values imputed; verify the imputation reasons match domain expectations.")
        if evaluation and evaluation.get("accuracy") is not None and evaluation["accuracy"] < 0.7:
            actions.append("Model accuracy is below 70% — consider adding more informative features or collecting more data.")
        if evaluation and evaluation.get("r2") is not None and evaluation["r2"] < 0.3:
            actions.append("R² is low — the current features may not explain much of the target's variance.")
        if not actions:
            actions.append("No specific issues detected from the completed pipeline run.")
        return BaseResponse(status="success", message="OK", data={"actions": actions})
    finally:
        db.close()


@router.get("/reports", response_model=BaseResponse)
async def reports_endpoint(dataset_name: str):
    db = SessionLocal()
    try:
        _, run = _latest_dataset_and_run(db, dataset_name)
        result = _stage_result(db, run.id if run else None, "ReportAgent")
        if result is None:
            return BaseResponse(status="success", message="No completed report found for this dataset yet.", data=None)
        return BaseResponse(status="success", message="OK", data=result)
    finally:
        db.close()


@router.post("/chat", response_model=BaseResponse)
async def chat_endpoint(req: ChatRequest, current_user: User = Depends(set_user_context)):
    query = getattr(req, "query", "")
    dataset_name = getattr(req, "dataset_name", None)
    tenant_id = getattr(req, "tenant_id", None) or "default"

    # Layer 6: Adversarial Jailbreak Detection & PII Redaction Guardrail
    guard_res = guardrail_engine.sanitize_input(query)
    sanitized_query = guard_res.sanitized_text

    # Layer 3: Context Retrieval & RAG Indexing
    context_blob = ""
    eda, evaluation, training = {}, {}, {}
    if dataset_name:
        db = SessionLocal()
        try:
            _, run = _latest_dataset_and_run(db, dataset_name)
            if run:
                eda = _stage_result(db, run.id, "EDAAgent") or {}
                evaluation = _stage_result(db, run.id, "EvaluationAgent") or {}
                training = _stage_result(db, run.id, "TrainingAgent") or {}
                context_blob = json.dumps(
                    {"eda_statistics": eda.get("statistics", {}), "training": training, "evaluation": evaluation},
                    default=str,
                )
                # Ingest into tenant-isolated vector index
                rag_retriever.index_pipeline_run(
                    tenant_id=tenant_id,
                    dataset_name=dataset_name,
                    eda_stats=eda.get("statistics") if eda else None,
                    evaluation_data=evaluation,
                    training_data=training,
                )
        finally:
            db.close()

    provider, model = _resolve_active_llm(
        requested_model=getattr(req, "model", None),
        requested_provider=getattr(req, "provider", None),
    )
    if not model or not provider:
        return BaseResponse(
            status="success",
            message="AI chat unavailable",
            data={
                "response": (
                    "No local AI model or active API-key model is currently available. "
                    "Start Ollama locally or choose an available API-key model in Institutional Settings or the Console Model Dropdown."
                )
            },
        )

    cache_model_key = f"{provider}:{model}"

    # Layer 7: Dynamic Complexity Classification
    complexity = model_router.classify_complexity(sanitized_query, has_dataset=bool(dataset_name))

    # Layer 2: Centralized Versioned Prompt Registry & System Prompt Rendering
    context_str = context_blob or "No pipeline results available for this dataset yet."
    rendered_prompt, prompt_hash = prompt_registry.render(
        prompt_id="analyst_core",
        variables={"dataset_context": context_str, "sanitized_query": sanitized_query},
        tenant_id=tenant_id,
    )

    # Layer 7: Tenant-Aware SHA-256 Exact-Match Response Cache
    cached_response = llm_cache.get(
        tenant_id=tenant_id,
        model=cache_model_key,
        template_id="analyst_core",
        prompt=rendered_prompt,
    )
    if cached_response is not None:
        # Persist cached query and response
        user_id = current_user.id
        conv_id = req.conversation_id
        db_chat = SessionLocal()
        try:
            conv = None
            if conv_id:
                conv = db_chat.query(Conversation).filter_by(id=conv_id).first()
                if conv and current_user.role != "admin" and conv.owner_id != user_id:
                    conv = None
            if not conv:
                title = query[:36] + ("..." if len(query) > 36 else "")
                conv = Conversation(title=title or "New Conversation", owner_id=user_id, tenant_id=tenant_id)
                db_chat.add(conv)
                db_chat.commit()
                db_chat.refresh(conv)
            conv_id = conv.id
            db_chat.add(ChatMessage(conversation_id=conv_id, role="user", content=query))
            db_chat.add(ChatMessage(conversation_id=conv_id, role="agent", content=cached_response, model=model, cached=True, guardrail_status="Layer 6 Certified"))
            conv.updated_at = datetime.utcnow()
            db_chat.commit()
        except Exception as e:
            logger.warning(f"Failed to persist cached chat message: {e}")
            db_chat.rollback()
        finally:
            db_chat.close()

        return BaseResponse(
            status="success",
            message="OK",
            data={
                "response": cached_response,
                "model": model,
                "provider": provider,
                "cached": True,
                "prompt_hash": prompt_hash,
                "complexity": complexity.value,
                "conversation_id": conv_id,
            },
        )

    # Layer 8: GenAI Semantic OpenTelemetry Instrumentation
    try:
        with GenAISpanContext(model=model, prompt_template_id="analyst_core", tenant_id=tenant_id) as span_ctx:
            try:
                text = llm_generate(rendered_prompt, model, provider=provider)
            except TypeError:
                text = llm_generate(rendered_prompt, model)
            prompt_tokens = int(len(rendered_prompt.split()) * 1.3)
            comp_tokens = int(len(text.split()) * 1.3)
            span_ctx.record_usage(prompt_tokens=prompt_tokens, completion_tokens=comp_tokens)
    except LLMUnavailableError as e:
        return BaseResponse(
            status="success",
            message="AI chat unavailable",
            data={"response": f"The selected AI model ({provider}: {model}) is unavailable right now ({e}).", "model": model, "provider": provider},
        )

    # Layer 6: Output Safety & Credential Leakage Scanner
    out_safe, out_checked = guardrail_engine.scan_output(text)
    if not out_safe:
        return BaseResponse(
            status="success",
            message="Output Safety Alert",
            data={"response": "Model output withheld due to detected internal policy violation.", "model": model, "provider": provider},
        )

    # Layer 8: Automated Factual Grounding & Faithfulness Evaluation
    eval_report = ai_evaluator.evaluate(
        question=sanitized_query,
        answer=out_checked,
        context=context_str,
    )

    # Populate Cache (Layer 7)
    llm_cache.set(
        tenant_id=tenant_id,
        model=cache_model_key,
        template_id="analyst_core",
        prompt=rendered_prompt,
        response=out_checked,
    )

    # Persist new conversation & messages
    user_id = current_user.id
    conv_id = req.conversation_id
    db_chat = SessionLocal()
    try:
        conv = None
        if conv_id:
            conv = db_chat.query(Conversation).filter_by(id=conv_id).first()
            if conv and current_user.role != "admin" and conv.owner_id != user_id:
                conv = None
        if not conv:
            title = query[:36] + ("..." if len(query) > 36 else "")
            conv = Conversation(title=title or "New Conversation", owner_id=user_id, tenant_id=tenant_id)
            db_chat.add(conv)
            db_chat.commit()
            db_chat.refresh(conv)
        conv_id = conv.id
        db_chat.add(ChatMessage(conversation_id=conv_id, role="user", content=query))
        db_chat.add(ChatMessage(conversation_id=conv_id, role="agent", content=out_checked, model=model, cached=False, guardrail_status="Layer 6 Certified"))
        conv.updated_at = datetime.utcnow()
        db_chat.commit()
    except Exception as e:
        logger.warning(f"Failed to persist chat message: {e}")
        db_chat.rollback()
    finally:
        db_chat.close()

    return BaseResponse(
        status="success",
        message="OK",
        data={
            "response": out_checked,
            "model": model,
            "provider": provider,
            "cached": False,
            "prompt_hash": prompt_hash,
            "complexity": complexity.value,
            "evaluations": eval_report.evaluation_metadata,
            "pii_redacted": guard_res.pii_counts,
            "conversation_id": conv_id,
        },
    )


# ---------------------------------------------------------------------------
# Conversation Management Endpoints (CRUD + Cascading Deletion + Tenant Isolation)
# ---------------------------------------------------------------------------

@router.get("/conversations", response_model=BaseResponse)
def list_conversations(current_user: User = Depends(set_user_context)):
    user_id = current_user.id
    db = SessionLocal()
    try:
        conversations = (
            db.query(Conversation)
            .filter_by(owner_id=user_id)
            .order_by(Conversation.updated_at.desc())
            .all()
        )
        data = []
        for c in conversations:
            msg_count = len(c.messages)
            last_msg = c.messages[-1].content if c.messages else ""
            data.append({
                "id": c.id,
                "title": c.title,
                "message_count": msg_count,
                "last_message": last_msg[:80] + ("..." if len(last_msg) > 80 else ""),
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            })
        return BaseResponse(status="success", message="OK", data=data)
    finally:
        db.close()


@router.post("/conversations", response_model=BaseResponse)
def create_conversation(req: ConversationCreateRequest, current_user: User = Depends(set_user_context)):
    user_id = current_user.id
    db = SessionLocal()
    try:
        conv = Conversation(
            title=req.title or "New Conversation",
            owner_id=user_id,
            tenant_id=req.tenant_id or "default"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return BaseResponse(
            status="success",
            message="Conversation created",
            data={
                "id": conv.id,
                "title": conv.title,
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "messages": []
            }
        )
    finally:
        db.close()


@router.get("/conversations/{conversation_id}", response_model=BaseResponse)
def get_conversation(conversation_id: str, current_user: User = Depends(set_user_context)):
    user_id = current_user.id
    db = SessionLocal()
    try:
        conv = db.query(Conversation).filter_by(id=conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.owner_id != user_id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to access this conversation.")
        
        messages = [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "model": m.model,
                "latency_ms": m.latency_ms,
                "tokens": m.tokens,
                "cached": m.cached,
                "guardrail_status": m.guardrail_status,
                "timestamp": m.created_at.strftime("%I:%M %p") if m.created_at else None,
            }
            for m in conv.messages
        ]
        return BaseResponse(
            status="success",
            message="OK",
            data={
                "id": conv.id,
                "title": conv.title,
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "messages": messages
            }
        )
    finally:
        db.close()


@router.put("/conversations/{conversation_id}", response_model=BaseResponse)
def rename_conversation(conversation_id: str, req: ConversationRenameRequest, current_user: User = Depends(set_user_context)):
    user_id = current_user.id
    db = SessionLocal()
    try:
        conv = db.query(Conversation).filter_by(id=conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.owner_id != user_id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to modify this conversation.")
        
        new_title = req.title.strip()
        if not new_title:
            raise HTTPException(status_code=400, detail="Conversation title cannot be empty")
        conv.title = new_title
        db.commit()
        db.refresh(conv)
        return BaseResponse(
            status="success",
            message="Conversation renamed",
            data={
                "id": conv.id,
                "title": conv.title,
                "updated_at": conv.updated_at.isoformat()
            }
        )
    finally:
        db.close()


@router.delete("/conversations/{conversation_id}", response_model=BaseResponse)
def delete_conversation(conversation_id: str, current_user: User = Depends(set_user_context)):
    user_id = current_user.id
    db = SessionLocal()
    try:
        conv = db.query(Conversation).filter_by(id=conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.owner_id != user_id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to delete this conversation.")
        
        # Deletion cascades to ChatMessage records via relationship cascade="all, delete-orphan"
        db.delete(conv)
        db.commit()
        return BaseResponse(
            status="success",
            message="Conversation deleted successfully",
            data={"id": conversation_id, "deleted": True}
        )
    finally:
        db.close()


# ---------------------------------------------------------------------------
# MCP Tool Governance Endpoints (Layer 4)
# ---------------------------------------------------------------------------

class MCPExecuteRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    user_permissions: Optional[List[str]] = None
    tenant_id: Optional[str] = "default"
    user_id: Optional[str] = "anonymous"


@router.get("/mcp/tools", response_model=BaseResponse)
async def list_mcp_tools():
    """Lists all tools exposed through the Model Context Protocol (MCP) interface."""
    tools = mcp_registry.list_tools()
    return BaseResponse(status="success", message="OK", data={"tools": tools, "count": len(tools)})


@router.post("/mcp/execute", response_model=BaseResponse)
async def execute_mcp_tool(req: MCPExecuteRequest):
    """Executes a governed MCP tool with schema validation and role authorization."""
    perms = req.user_permissions or ["DATASET_READ", "MODEL_EVALUATE"]
    try:
        result = mcp_registry.execute_tool(
            tool_name=req.tool_name,
            arguments=req.arguments,
            user_permissions=perms,
            tenant_id=req.tenant_id or "default",
            user_id=req.user_id or "anonymous",
        )
        return BaseResponse(status="success", message="Tool execution succeeded", data=result)
    except (PermissionError, ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tool execution failed: {str(e)}")


# ---------------------------------------------------------------------------
# AI Caching & Evaluation Metrics (Layers 7 & 8)
# ---------------------------------------------------------------------------

@router.get("/ai/cache/metrics", response_model=BaseResponse)
async def cache_metrics():
    """Retrieves real-time exact-match inference cache statistics and saved latency."""
    return BaseResponse(status="success", message="OK", data=llm_cache.get_metrics())


class EvalRunRequest(BaseModel):
    question: str
    answer: str
    context: str


@router.post("/ai/evaluations/run", response_model=BaseResponse)
async def run_ai_evaluation(req: EvalRunRequest):
    """Runs automated factual grounding, answer relevancy, and context recall evaluation."""
    report = ai_evaluator.evaluate(question=req.question, answer=req.answer, context=req.context)
    return BaseResponse(status="success", message="OK", data=report.evaluation_metadata)


class ConnectionTestRequest(BaseModel):
    provider: str
    base_url: Optional[str] = None
    api_key: Optional[str] = None


@router.get("/ai/status", response_model=BaseResponse)
async def ai_status_endpoint():
    """Retrieve full AI inference subsystem status, detected local models, and API-key cloud models."""
    from core.services.llm_service import test_provider_connection, get_masked_ai_config
    registry = ModelRegistry.get_registry()
    ollama_test = test_provider_connection("ollama")
    registry["ollama_connection"] = ollama_test
    registry["config"] = get_masked_ai_config()
    return BaseResponse(status="success", message="OK", data=registry)


@router.get("/ai/models", response_model=BaseResponse)
async def ai_models_endpoint(provider: Optional[str] = None, refresh: bool = False):
    """List available local & API-key cloud models, optionally refreshed live from provider APIs."""
    if provider:
        prov = provider.lower()
        if prov in ("gemini", "openai", "anthropic"):
            discovered = ModelRegistry.discover_cloud_models(prov, force_refresh=refresh)
            return BaseResponse(status="success", message="OK", data=discovered)
        elif prov == "ollama":
            live = [m["name"] for m in ModelRegistry.get_ollama_models()]
            disk = [m["name"] for m in ModelRegistry.get_installed_ollama_manifests()]
            merged = list(dict.fromkeys(live + disk))
            return BaseResponse(
                status="success",
                message="OK",
                data={"provider": "ollama", "models": merged, "live": len(live) > 0},
            )
        elif prov == "lm_studio":
            return BaseResponse(status="success", message="OK", data={"provider": "lm_studio", "models": [m["name"] for m in ModelRegistry.get_lm_studio_models()], "live": True})
    registry = ModelRegistry.get_registry()
    return BaseResponse(status="success", message="OK", data=registry)


@router.post("/ai/ollama/start", response_model=BaseResponse)
async def start_ollama_daemon_endpoint():
    """Attempt to start the local Ollama daemon cleanly if binary is installed on host."""
    import subprocess
    import time as _t

    if os.getenv("ENVIRONMENT", "development") == "production":
        raise HTTPException(
            status_code=400,
            detail="Local Ollama daemon cannot be started in cloud production mode. Configure a cloud API provider instead.",
        )

    if ModelRegistry.get_ollama_models():
        return BaseResponse(status="success", message="Ollama already running", data=ModelRegistry.get_registry())

    ollama_bin = shutil.which("ollama") or (
        "/opt/homebrew/bin/ollama" if os.path.exists("/opt/homebrew/bin/ollama") else None
    )
    if not ollama_bin:
        raise HTTPException(status_code=404, detail="Ollama binary not installed on host.")

    subprocess.Popen(
        [ollama_bin, "serve"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    for _ in range(10):
        _t.sleep(0.3)
        if ModelRegistry.get_ollama_models():
            break

    return BaseResponse(status="success", message="Ollama start triggered", data=ModelRegistry.get_registry())


@router.post("/ai/models/discover", response_model=BaseResponse)
async def ai_discover_models_endpoint(req: AIModelDiscoveryRequest):
    """Discover available models for a specific provider using a supplied or already-configured API key."""
    prov = req.provider.lower()
    if prov in ("gemini", "openai", "anthropic"):
        discovered = ModelRegistry.discover_cloud_models(
            prov,
            api_key=req.api_key,
            force_refresh=req.force_refresh,
        )
        return BaseResponse(status="success", message="OK", data=discovered)
    from core.services.llm_service import test_provider_connection
    res = test_provider_connection(prov, base_url=req.base_url)
    live_models = res.get("models", [])
    if prov == "ollama":
        disk_models = [m["name"] for m in ModelRegistry.get_installed_ollama_manifests()]
        models_out = list(dict.fromkeys(live_models + disk_models))
    else:
        models_out = live_models
    return BaseResponse(
        status="success",
        message="OK",
        data={
            "provider": prov,
            "models": models_out,
            "live": res.get("status") == "connected",
            "configured": len(models_out) > 0,
        },
    )


@router.post("/ai/config", response_model=BaseResponse)
async def ai_config_update_endpoint(req: AIConfigUpdateRequest):
    """Update active provider, selected model, inference policy, and server-side API keys."""
    from core.services.llm_service import save_runtime_ai_config
    payload = req.model_dump(exclude_none=True)
    masked = save_runtime_ai_config(payload)
    registry = ModelRegistry.get_registry()
    registry["config"] = masked
    return BaseResponse(status="success", message="AI configuration updated", data=registry)


@router.post("/ai/test-connection", response_model=BaseResponse)
async def ai_test_connection_endpoint(req: ConnectionTestRequest):
    """Test connectivity and model discovery for a local or cloud inference provider."""
    from core.services.llm_service import test_provider_connection
    result = test_provider_connection(req.provider, req.base_url, req.api_key)
    return BaseResponse(status="success", message="OK", data=result)


@router.get("/mlops", response_model=BaseResponse)
async def mlops_endpoint():
    # No real experiment-tracking/drift-detection/deployment system exists in
    # this codebase yet - returning fake "Healthy"/drift numbers here would be
    # exactly the fabricated-success pattern this audit is meant to remove.
    raise HTTPException(status_code=501, detail="MLOps monitoring (drift detection, deployment tracking) is not implemented yet.")


@router.post("/start-workflow", response_model=BaseResponse)
async def start_workflow_endpoint(req: DatasetRequest, background_tasks: BackgroundTasks):
    user_id = current_user_id.get() or "guest_user"
    try:
        run_id = orchestrator.start_pipeline(user_id=user_id)
        global_input = {"dataset_name": req.dataset_name}
        background_tasks.add_task(orchestrator.run_full_pipeline, run_id, global_input)
        return BaseResponse(status="success", message="Workflow started in background.", data={"run_id": run_id})
    except Exception as e:
        logger.error(f"Error starting workflow: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/workflow-status", response_model=BaseResponse)
async def workflow_status(run_id: str):
    db = SessionLocal()
    try:
        run = db.query(WorkflowRun).filter_by(id=run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

        # Tenant isolation & authorization check
        user_id = current_user_id.get() or "guest_user"
        if user_id not in ("guest_user", "default", "default-user") and run.owner_id != user_id:
            user = db.query(User).filter_by(id=user_id).first()
            if not user or user.role != "admin":
                raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to view this run.")

        stages = db.query(PipelineStage).filter_by(run_id=run_id).order_by(PipelineStage.step_order).all()
        stages_data = [
            {
                "agent_name": stage.agent_name,
                "status": stage.status,
                "execution_time_sec": stage.execution_time,
                "memory_usage_mb": stage.memory_usage_mb,
                "errors": stage.errors,
                "step_order": stage.step_order,
            }
            for stage in stages
        ]
        data = {
            "run_id": run.id,
            "overall_status": run.status,
            "execution_time_total": run.execution_time,
            "stages": stages_data,
        }
        return BaseResponse(status="success", message="OK", data=data)
    finally:
        db.close()


@router.get("/dashboard-metrics", response_model=BaseResponse)
async def dashboard_metrics_endpoint():
    db = SessionLocal()
    try:
        user_id = current_user_id.get() or "guest_user"
        query = db.query(WorkflowRun)
        if user_id not in ("guest_user", "default", "default-user"):
            latest_run = query.filter_by(owner_id=user_id).order_by(WorkflowRun.created_at.desc()).first()
        else:
            latest_run = query.order_by(WorkflowRun.created_at.desc()).first()
        active_dataset = None
        best_model = None
        model_accuracy = None
        workflow_state = "Idle"

        if latest_run:
            workflow_state = {
                "completed": "Completed",
                "failed": "Failed",
                "running": "Processing",
                "started": "Processing",
            }.get(latest_run.status, latest_run.status)

            if latest_run.dataset_id:
                dataset = db.query(Dataset).filter_by(id=latest_run.dataset_id).first()
                active_dataset = dataset.name if dataset else None

            training = _stage_result(db, latest_run.id, "TrainingAgent")
            evaluation = _stage_result(db, latest_run.id, "EvaluationAgent")
            if training:
                best_model = training.get("model_type") or training.get("model_id")
            if evaluation:
                model_accuracy = evaluation.get("accuracy", evaluation.get("r2"))

        registry = ModelRegistry.get_registry()

        # Real per-stage progress for the latest run, so the dashboard's
        # "Current Workflow Progress" bar reflects the actual pipeline instead
        # of the previously-hardcoded all-"Completed" fallback the frontend
        # fell back to on every load (the old /workflow-status call required a
        # run_id the frontend never had, so it 422'd and silently kept the
        # fake data every single time).
        stages_out = []
        if latest_run:
            stages = (
                db.query(PipelineStage)
                .filter_by(run_id=latest_run.id)
                .order_by(PipelineStage.step_order)
                .all()
            )
            stages_out = [
                {
                    "agent_name": stage.agent_name,
                    "status": stage.status,
                    "duration": stage.execution_time,
                }
                for stage in stages
            ]

        data = {
            "active_dataset": active_dataset,
            "best_model": best_model,
            "model_accuracy": model_accuracy,
            "workflow_state": workflow_state,
            "stages": stages_out,
            "ollama_status": "Online" if registry["has_local_llm"] else "Offline",
            "gemini_status": "Online" if registry["gemini_available"] else "Offline",
        }
        return BaseResponse(status="success", message="OK", data=data)
    finally:
        db.close()


@router.post("/demo/load", response_model=BaseResponse)
async def load_demo_endpoint(dataset_type: str):
    raise HTTPException(status_code=501, detail="No bundled demo dataset is available yet.")


@router.get("/system-health", response_model=BaseResponse)
async def system_health_endpoint():
    hardware = HardwareDetector.scan()
    registry = ModelRegistry.get_registry()
    data = {
        **hardware,
        "ollama": {
            "online": registry["has_local_llm"],
            "models": registry["local_ollama_models"],
        },
        "gemini_configured": registry["gemini_available"],
    }
    return BaseResponse(status="success", message="OK", data=data)


@router.get("/storage", response_model=BaseResponse)
async def storage_endpoint():
    """Real disk usage for the uploaded-dataset directory and the volume it
    lives on. Replaces a frontend call to an endpoint that never existed."""
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../data/temp")
    used_by_datasets_bytes = 0
    if os.path.isdir(upload_dir):
        for root, _dirs, files in os.walk(upload_dir):
            for name in files:
                try:
                    used_by_datasets_bytes += os.path.getsize(os.path.join(root, name))
                except OSError:
                    pass
    disk_total, _disk_used, disk_free = shutil.disk_usage(upload_dir if os.path.isdir(upload_dir) else ".")
    return BaseResponse(
        status="success",
        message="OK",
        data={
            "used_gb": round(used_by_datasets_bytes / (1024 ** 3), 2),
            "total_gb": round(disk_total / (1024 ** 3), 2),
            "free_gb": round(disk_free / (1024 ** 3), 2),
        },
    )


@router.get("/model-registry", response_model=BaseResponse)
async def model_registry_endpoint():
    return BaseResponse(status="success", message="OK", data=ModelRegistry.get_registry())


@router.get("/experiment-runs", response_model=BaseResponse)
async def experiment_runs_endpoint(dataset_name: Optional[str] = None):
    db = SessionLocal()
    try:
        user_id = current_user_id.get() or "guest_user"
        query = db.query(WorkflowRun)
        if user_id not in ("guest_user", "default", "default-user"):
            query = query.filter_by(owner_id=user_id)
        if dataset_name:
            dataset, _ = _latest_dataset_and_run(db, dataset_name)
            if not dataset:
                return BaseResponse(status="success", message="OK", data=[])
            query = query.filter_by(dataset_id=dataset.id)
        runs = query.order_by(WorkflowRun.created_at.desc()).limit(50).all()

        data = []
        for run in runs:
            evaluation = _stage_result(db, run.id, "EvaluationAgent")
            data.append({
                "run_id": run.id,
                "status": run.status,
                "created_at": run.created_at.isoformat(),
                "execution_time": run.execution_time,
                "metrics": evaluation,
            })
        return BaseResponse(status="success", message="OK", data=data)
    finally:
        db.close()


@router.get("/dataset-versions", response_model=BaseResponse)
async def dataset_versions_endpoint(dataset_name: str):
    # There is no dataset-versioning system in this codebase - each pipeline
    # run overwrites the same parquet path rather than keeping history, so
    # there is nothing real to report here yet.
    raise HTTPException(status_code=501, detail="Dataset versioning is not implemented yet.")


@router.post("/dataset-versions/rollback", response_model=BaseResponse)
async def rollback_dataset_version_endpoint(req: DatasetRequest, version: int):
    raise HTTPException(status_code=501, detail="Dataset versioning is not implemented yet.")


@router.get("/benchmark-stats", response_model=BaseResponse)
async def benchmark_stats_endpoint():
    # Real counts from the database - the frontend previously showed a
    # hardcoded 142/4890/892 whenever this call failed (it always failed:
    # the route didn't exist here at all, and the frontend proxy pointed at
    # the wrong port). "strategy_reasonings" has no dedicated concept in
    # this codebase yet, so it's mapped to completed pipeline stages (each
    # one is a real executed processing/reasoning step) rather than invented.
    db = SessionLocal()
    try:
        total_datasets = db.query(Dataset).count()
        total_experiments = db.query(WorkflowRun).count()
        total_strategy_reasonings = db.query(PipelineStage).filter_by(status="completed").count()

        top_runs = (
            db.query(WorkflowRun)
            .filter(WorkflowRun.status == "completed")
            .order_by(WorkflowRun.created_at.desc())
            .limit(20)
            .all()
        )
        scored = []
        for run in top_runs:
            training = _stage_result(db, run.id, "TrainingAgent")
            evaluation = _stage_result(db, run.id, "EvaluationAgent")
            if not training or not evaluation:
                continue
            score = evaluation.get("accuracy", evaluation.get("r2"))
            if score is None:
                continue
            dataset = db.query(Dataset).filter_by(id=run.dataset_id).first() if run.dataset_id else None
            scored.append({
                "dataset": dataset.name if dataset else "dataset",
                "model": training.get("model_type", "Model"),
                "cv_score": score,
            })
        top_experiments = sorted(scored, key=lambda e: e["cv_score"], reverse=True)[:4]

        data = {
            "total_benchmark_datasets": total_datasets,
            "total_experiments": total_experiments,
            "total_strategy_reasonings": total_strategy_reasonings,
            "top_experiments": top_experiments,
        }
        return BaseResponse(status="success", message="OK", data=data)
    finally:
        db.close()


@router.get("/recent-activity", response_model=BaseResponse)
async def recent_activity_endpoint():
    db = SessionLocal()
    try:
        user_id = current_user_id.get() or "guest_user"
        query = db.query(WorkflowRun)
        if user_id not in ("guest_user", "default", "default-user"):
            query = query.filter_by(owner_id=user_id)
        runs = query.order_by(WorkflowRun.created_at.desc()).limit(10).all()
        data = []
        for run in runs:
            dataset = db.query(Dataset).filter_by(id=run.dataset_id).first() if run.dataset_id else None
            name = dataset.name if dataset else "dataset"
            if run.status == "completed":
                action = f"Finished processing '{name}'"
            elif run.status == "failed":
                action = f"Failed while processing '{name}'"
            else:
                action = f"Started processing '{name}'"
            data.append({"id": run.id, "action": action, "createdAt": run.created_at.isoformat()})
        return BaseResponse(status="success", message="OK", data=data)
    finally:
        db.close()
