import os
import traceback
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from core.agents.base import BaseAgent
from core.services.data_service import data_service
from core.engines.base import ProcessingEngine
from sklearn.linear_model import SGDClassifier, SGDRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler, LabelEncoder

class PipelineInput(BaseModel):
    dataset_name: str
    file_path: Optional[str] = None
    user_id: Optional[str] = "guest_user"

class PipelineOutput(BaseModel):
    status: str
    message: str
    result: Dict[str, Any]

# 1. Upload Agent
class UploadAgent(BaseAgent[PipelineInput, PipelineOutput]):
    def validate(self, data: Any) -> PipelineInput:
        return PipelineInput(**data) if isinstance(data, dict) else data
        
    def execute(self, validated_data: PipelineInput, engine: ProcessingEngine) -> PipelineOutput:
        if validated_data.file_path and not os.path.exists(validated_data.file_path):
            raise FileNotFoundError(f"File not found: {validated_data.file_path}")
        return PipelineOutput(status="success", message="Uploaded successfully", result={"file_path": validated_data.file_path})
        
    def cleanup(self) -> None:
        pass
        
    def rollback(self) -> None:
        pass

# 2. Parser Agent
class ParserAgent(BaseAgent[PipelineInput, PipelineOutput]):
    def validate(self, data: Any) -> PipelineInput:
        return PipelineInput(**data) if isinstance(data, dict) else data
        
    def execute(self, validated_data: PipelineInput, engine: ProcessingEngine) -> PipelineOutput:
        file_path = validated_data.file_path
        parquet_path = f"{file_path}.parquet"
        
        # We rely on engine to abstract chunked vs full read
        data_obj = engine.load_dataset(file_path)
        engine.save_dataset(data_obj, parquet_path)
        
        # Retrieve metadata directly from Parquet file to preserve memory for large datasets (500MB+)
        try:
            import pyarrow.parquet as pq
            pf = pq.ParquetFile(parquet_path)
            rows = pf.metadata.num_rows
            cols = pf.metadata.num_columns
            target_column = pf.schema.names[-1]
        except Exception:
            # Fallback to engine compute if parquet metadata inspection fails
            df = engine.compute(engine.load_dataset(parquet_path))
            rows, cols = df.shape
            target_column = df.columns[-1]

        data_service.store_dataset(validated_data.dataset_name, {"parquet_path": parquet_path, "target_column": target_column}, change_summary="Parsed dataset to parquet")
        return PipelineOutput(status="success", message="Parsed and stored as Parquet", result={"rows": rows, "cols": cols, "parquet_path": parquet_path, "target_column": target_column})

    def cleanup(self) -> None:
        pass
        
    def rollback(self) -> None:
        pass

# 4. Cleaning Agent
class CleaningAgent(BaseAgent[PipelineInput, PipelineOutput]):
    def validate(self, data: Any) -> PipelineInput:
        return PipelineInput(**data) if isinstance(data, dict) else data
        
    def execute(self, validated_data: PipelineInput, engine: ProcessingEngine) -> PipelineOutput:
        dataset_info = data_service.get_dataset(validated_data.dataset_name)
        parquet_path = dataset_info["parquet_path"]
        
        df = engine.compute(engine.load_dataset(parquet_path))

        num_cols = df.select_dtypes(include=[np.number]).columns
        cat_cols = df.select_dtypes(exclude=[np.number]).columns

        # Justify the imputation strategy per column instead of a blind constant fill,
        # which corrupts numeric columns with impossible values (e.g. age/income = 0).
        imputation: Dict[str, Any] = {}
        for col in num_cols:
            missing_count = int(df[col].isna().sum())
            if missing_count == 0:
                continue
            if missing_count == len(df):
                # Column has zero observed values - mean()/median() are themselves NaN
                # here (no data to average), so fillna(NaN) is a silent no-op that would
                # otherwise be reported as a successful fill. Report the true state
                # instead of a false "filled: N" success claim.
                imputation[col] = {
                    "method": "none",
                    "filled": 0,
                    "reason": "column has no observed values at all; no mean/median could be computed, so it was left as-is",
                }
                continue
            skew = df[col].skew()
            skew = 0.0 if pd.isna(skew) else float(skew)
            if abs(skew) > 0.5:
                fill_value = df[col].median()
                method, reason = "median", f"skew={skew:.2f} exceeds 0.5, median is robust to the skew"
            else:
                fill_value = df[col].mean()
                method, reason = "mean", f"skew={skew:.2f} is near-symmetric, mean is representative"
            df[col] = df[col].fillna(fill_value)
            imputation[col] = {"method": method, "filled": missing_count, "reason": reason}

        for col in cat_cols:
            missing_count = int(df[col].isna().sum())
            if missing_count == 0:
                continue
            mode_series = df[col].mode(dropna=True)
            fill_value = mode_series.iloc[0] if not mode_series.empty else "Unknown"
            df[col] = df[col].fillna(fill_value)
            imputation[col] = {"method": "mode", "filled": missing_count, "reason": f"categorical column, most frequent value is '{fill_value}'"}

        new_parquet_path = f"{parquet_path}.cleaned.parquet"
        engine.save_dataset(df, new_parquet_path)

        # Merge rather than replace - overwriting would silently drop
        # target_column (set by ParserAgent), breaking target selection
        # further down the pipeline.
        data_service.store_dataset(validated_data.dataset_name, {**dataset_info, "parquet_path": new_parquet_path}, change_summary="Cleaned dataset")
        return PipelineOutput(status="success", message="Cleaning complete", result={"cleaned": True, "imputation": imputation})

    def cleanup(self) -> None:
        pass
        
    def rollback(self) -> None:
        pass

# 5. EDA Agent
class EDAAgent(BaseAgent[PipelineInput, PipelineOutput]):
    def validate(self, data: Any) -> PipelineInput:
        return PipelineInput(**data) if isinstance(data, dict) else data
        
    def execute(self, validated_data: PipelineInput, engine: ProcessingEngine) -> PipelineOutput:
        dataset_info = data_service.get_dataset(validated_data.dataset_name)
        parquet_path = dataset_info["parquet_path"]
        df = engine.compute(engine.load_dataset(parquet_path))
        
        num_cols = df.select_dtypes(include=[np.number]).columns

        corr_matrix = {}
        if len(num_cols) > 1:
            df_sample = df[list(num_cols)].sample(frac=0.1) if len(df) > 1000 else df[list(num_cols)]
            corr = df_sample.corr().fillna(0).to_dict()
            corr_matrix = corr

        statistics = {}
        for col in num_cols:
            series = df[col].dropna()
            if series.empty:
                continue
            skew = series.skew()
            statistics[col] = {
                "mean": float(series.mean()),
                "std": float(series.std()) if len(series) > 1 else 0.0,
                "min": float(series.min()),
                "max": float(series.max()),
                "missing": int(df[col].isna().sum()),
                "skew": 0.0 if pd.isna(skew) else float(skew),
            }

        return PipelineOutput(status="success", message="EDA complete", result={"correlations": corr_matrix, "statistics": statistics})

    def cleanup(self) -> None:
        pass
        
    def rollback(self) -> None:
        pass

# 6. Feature Engineering Agent
class FeatureEngineeringAgent(BaseAgent[PipelineInput, PipelineOutput]):
    def validate(self, data: Any) -> PipelineInput:
        return PipelineInput(**data) if isinstance(data, dict) else data
        
    def execute(self, validated_data: PipelineInput, engine: ProcessingEngine) -> PipelineOutput:
        dataset_info = data_service.get_dataset(validated_data.dataset_name)
        parquet_path = dataset_info["parquet_path"]
        target_column = dataset_info.get("target_column")
        df = engine.compute(engine.load_dataset(parquet_path))

        # The target column must never be encoded/dropped here - it has to
        # reach TrainingAgent unchanged and by its original name. Encoding it
        # would also mean training on a mangled/derived version of the very
        # thing being predicted.
        cat_cols = df.select_dtypes(exclude=[np.number]).columns
        if target_column is not None:
            cat_cols = cat_cols.drop(target_column, errors="ignore")

        # One-hot encoding a column with many distinct values (e.g. a raw ID
        # or a per-row-unique timestamp string) creates one new column per
        # distinct value. On real-world messy data this explodes into tens
        # of thousands of columns, which then OOMs StandardScaler/training
        # downstream (confirmed: a 50K-row dataset with a near-unique ID
        # column drove this stage's memory past 2.8GB before being killed).
        # Cap one-hot encoding to genuinely low-cardinality columns; anything
        # above the cap is frequency-encoded instead (one safe numeric
        # column), and constant columns (zero information) are dropped.
        MAX_ONEHOT_CARDINALITY = 50

        onehot_cols, freq_encoded_cols, dropped_constant_cols = [], [], []
        for col in cat_cols:
            n_unique = df[col].nunique(dropna=True)
            if n_unique <= 1:
                df = df.drop(columns=[col])
                dropped_constant_cols.append(col)
            elif n_unique <= MAX_ONEHOT_CARDINALITY:
                df[col] = df[col].astype('category')
                onehot_cols.append(col)
            else:
                freq = df[col].value_counts(normalize=True)
                df[col] = df[col].map(freq).astype(float)
                freq_encoded_cols.append(col)

        if onehot_cols:
            df = pd.get_dummies(df, columns=onehot_cols)

        new_parquet_path = f"{parquet_path}.fe.parquet"
        engine.save_dataset(df, new_parquet_path)

        # Merge rather than replace - see the same note in CleaningAgent.
        data_service.store_dataset(validated_data.dataset_name, {**dataset_info, "parquet_path": new_parquet_path}, change_summary="Feature engineering")
        return PipelineOutput(status="success", message="FE complete", result={
            "features": list(df.columns),
            "onehot_encoded_columns": onehot_cols,
            "frequency_encoded_columns": freq_encoded_cols,
            "dropped_constant_columns": dropped_constant_cols,
        })

    def cleanup(self) -> None:
        pass
        
    def rollback(self) -> None:
        pass

# 7. Training Agent
class TrainingAgent(BaseAgent[PipelineInput, PipelineOutput]):
    def validate(self, data: Any) -> PipelineInput:
        return PipelineInput(**data) if isinstance(data, dict) else data
        
    def execute(self, validated_data: PipelineInput, engine: ProcessingEngine) -> PipelineOutput:
        dataset_info = data_service.get_dataset(validated_data.dataset_name)
        parquet_path = dataset_info["parquet_path"]
        
        df = engine.compute(engine.load_dataset(parquet_path))
        columns = list(df.columns)

        if not columns:
            raise ValueError("Dataset has no columns to train on.")

        # Use the target column name captured by ParserAgent before any
        # column-reordering feature-engineering happened, instead of
        # re-deriving columns[-1] here. After one-hot encoding, the last
        # column is an arbitrary encoded dummy, not the real target -
        # re-deriving it here previously trained on the wrong column AND
        # leaked the real target in as an input feature.
        target = dataset_info.get("target_column")
        if target is None or target not in columns:
            raise ValueError(f"Target column '{target}' not found in dataset (available: {columns}).")

        # Execute Agentix AutoML multi-candidate search & evaluation
        from core.automl.engine import automl_engine
        summary = automl_engine.run_automl(
            df=df,
            target_column=target,
            dataset_name=validated_data.dataset_name,
            max_candidates=5,
        )

        problem_type = summary.task_type.value
        best_model_name = summary.best_model
        best_score = summary.best_score
        feature_importances = summary.best_feature_importances or {}
        y_test = summary.y_test
        y_pred = summary.y_pred
        leaderboard_data = [m.model_dump() for m in summary.leaderboard]
        recommended_candidates = [c.model_dump() for c in summary.recommended_candidates]

        # Stash the held-out predictions and complete multi-candidate AutoML summary for EvaluationAgent
        # and platform routes.
        data_service.store_dataset(validated_data.dataset_name, {
            **dataset_info,
            "problem_type": problem_type,
            "y_test": y_test,
            "y_pred": y_pred,
            "automl_summary": summary.model_dump(),
            "leaderboard": leaderboard_data,
            "recommended_candidates": recommended_candidates,
            "feature_importances": feature_importances,
            "best_model": best_model_name,
            "best_score": best_score,
            "primary_metric": summary.primary_metric,
        }, change_summary="AutoML Multi-Candidate Training Complete")

        return PipelineOutput(
            status="success",
            message=f"AutoML training complete: evaluated {len(leaderboard_data)} candidates ({problem_type}). Best: {best_model_name} ({summary.primary_metric}={best_score:.4f})",
            result={
                "model_id": f"automl_{summary.best_algorithm_id or 'best'}_v1",
                "model_type": best_model_name,
                "best_model": best_model_name,
                "target": target,
                "problem_type": problem_type,
                "feature_importances": feature_importances,
                "best_score": best_score,
                "primary_metric": summary.primary_metric,
                "leaderboard": leaderboard_data,
                "recommended_candidates": recommended_candidates,
            },
        )

    def cleanup(self) -> None:
        pass
        
    def rollback(self) -> None:
        pass

# 8. Evaluation Agent
class EvaluationAgent(BaseAgent[PipelineInput, PipelineOutput]):
    def validate(self, data: Any) -> PipelineInput:
        return PipelineInput(**data) if isinstance(data, dict) else data
        
    def execute(self, validated_data: PipelineInput, engine: ProcessingEngine) -> PipelineOutput:
        dataset_info = data_service.get_dataset(validated_data.dataset_name) or {}
        automl_summary = dataset_info.get("automl_summary")
        y_test = dataset_info.get("y_test")
        y_pred = dataset_info.get("y_pred")
        problem_type = dataset_info.get("problem_type")

        # If automl_summary is present, retrieve rich evaluation metrics directly from the winning model
        if automl_summary:
            leaderboard = automl_summary.get("leaderboard", [])
            winning_entry = next((m for m in leaderboard if m.get("is_best")), None) or (leaderboard[0] if leaderboard else None)
            if winning_entry and winning_entry.get("metrics"):
                metrics = winning_entry.get("metrics")
                result = {
                    "problem_type": problem_type,
                    "model": winning_entry.get("algorithm_name"),
                    "algorithm_id": winning_entry.get("algorithm_id"),
                    **metrics,
                }
                return PipelineOutput(status="success", message="Evaluation complete", result=result)

        if y_test is None or y_pred is None:
            raise ValueError("No held-out predictions found; TrainingAgent must run before EvaluationAgent.")

        def _clean(value: float) -> Optional[float]:
            # NaN is not valid JSON; r2_score is undefined (NaN) when the test split
            # has fewer than 2 samples, since it needs variance in y_true to compute.
            value = float(value)
            return None if np.isnan(value) else value

        if problem_type == "regression":
            mae = mean_absolute_error(y_test, y_pred)
            rmse = mean_squared_error(y_test, y_pred) ** 0.5
            r2 = r2_score(y_test, y_pred) if len(y_test) > 1 else float("nan")
            result = {"problem_type": problem_type, "mae": _clean(mae), "rmse": _clean(rmse), "r2": _clean(r2)}
        else:
            # sklearn's accuracy_score/f1_score call type_of_target on the raw
            # values first and reject anything it infers as "continuous" - which
            # includes a legitimate small-cardinality classification target that
            # happens to hold non-integer floats (e.g. -1.25/0/1.25, the same
            # label shape TrainingAgent had to LabelEncode around above).
            # Comparing as strings sidesteps that misclassification without
            # changing which rows count as correct: y_test/y_pred are compared
            # by value equality either way, and both come from the same
            # original label values (y_pred was decoded back via the training
            # LabelEncoder's own classes_), so string formatting is identical
            # for equal values.
            y_test_labels = pd.Series(y_test).astype(str)
            y_pred_labels = pd.Series(y_pred).astype(str)
            acc = accuracy_score(y_test_labels, y_pred_labels)
            f1 = f1_score(y_test_labels, y_pred_labels, average="weighted", zero_division=0)
            result = {"problem_type": problem_type, "accuracy": float(acc), "f1_score": float(f1)}

        return PipelineOutput(status="success", message="Evaluation complete", result=result)

    def cleanup(self) -> None:
        pass
        
    def rollback(self) -> None:
        pass

# 9. Report Agent
class ReportAgent(BaseAgent[PipelineInput, PipelineOutput]):
    def validate(self, data: Any) -> PipelineInput:
        return PipelineInput(**data) if isinstance(data, dict) else data

    def execute(self, validated_data: PipelineInput, engine: ProcessingEngine) -> PipelineOutput:
        # No PDF renderer is wired up (no library for it, and building one is a
        # separate feature). Rather than pointing at a file that was never
        # generated, report real summary data pulled from the actual pipeline
        # state, and say plainly that a downloadable file isn't available yet.
        dataset_info = data_service.get_dataset(validated_data.dataset_name) or {}
        parquet_path = dataset_info.get("parquet_path")

        summary: Dict[str, Any] = {
            "dataset_name": validated_data.dataset_name,
            "target_column": dataset_info.get("target_column"),
            "problem_type": dataset_info.get("problem_type"),
            "pdf_available": False,
            "pdf_url": None,
            "message": "PDF export is not implemented yet. The summary below reflects this run's real pipeline results.",
        }

        if parquet_path:
            try:
                df = engine.compute(engine.load_dataset(parquet_path))
                summary["rows"] = int(df.shape[0])
                summary["cols"] = int(df.shape[1])
            except Exception:
                pass

        return PipelineOutput(status="success", message="Report summary generated", result=summary)

    def cleanup(self) -> None:
        pass
        
    def rollback(self) -> None:
        pass
