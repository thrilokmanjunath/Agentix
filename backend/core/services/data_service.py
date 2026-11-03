import json
import logging
from typing import Any, Dict, Optional

import pandas as pd
from core.context import current_user_id

logger = logging.getLogger("agentix_v2")


def _series_to_json(value: Any) -> str:
    tolist = getattr(value, "tolist", None)
    if callable(tolist):
        return json.dumps(tolist())
    return json.dumps(list(value))


class DataService:
    """
    Pipeline intermediate state (parquet path, target column, problem type,
    held-out test predictions), keyed by tenant/user_id and dataset_name.
    """

    def __init__(self):
        self._datasets: Dict[str, Dict[str, Any]] = {}

    def _resolve_user_id(self, user_id: Optional[str] = None) -> str:
        if user_id:
            return user_id
        try:
            return current_user_id.get() or "guest_user"
        except LookupError:
            return "guest_user"

    def store_dataset(self, name: str, data: Dict[str, Any], change_summary: str = "", user_id: Optional[str] = None):
        uid = self._resolve_user_id(user_id)
        scoped_key = f"{uid}:{name}"
        stored = dict(data)
        self._datasets[scoped_key] = stored
        # Also store bare name as fallback for legacy tests
        self._datasets[name] = stored
        self._persist(name, data, user_id=uid)

    def get_dataset(self, name: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        uid = self._resolve_user_id(user_id)
        scoped_key = f"{uid}:{name}"
        if scoped_key in self._datasets:
            return self._datasets[scoped_key]
        if name in self._datasets:
            return self._datasets[name]
            
        hydrated = self._hydrate(name, user_id=uid)
        if hydrated is not None:
            self._datasets[scoped_key] = hydrated
            self._datasets[name] = hydrated
        return hydrated

    def _persist(self, name: str, data: Dict[str, Any], user_id: Optional[str] = None) -> None:
        from core.repositories.database import SessionLocal
        from core.models.models import Dataset

        uid = self._resolve_user_id(user_id)
        db = SessionLocal()
        try:
            # Query scoped to owner_id if possible
            query = db.query(Dataset).filter_by(name=name)
            if uid and uid != "guest_user":
                scoped = query.filter_by(owner_id=uid).order_by(Dataset.created_at.desc()).first()
                dataset = scoped if scoped else query.order_by(Dataset.created_at.desc()).first()
            else:
                dataset = query.order_by(Dataset.created_at.desc()).first()

            if not dataset:
                return
            if "parquet_path" in data:
                dataset.parquet_path = data["parquet_path"]
            if "target_column" in data:
                dataset.target_column = data["target_column"]
            if "problem_type" in data:
                dataset.problem_type = data["problem_type"]
            if "y_test" in data:
                dataset.y_test_json = _series_to_json(data["y_test"])
            if "y_pred" in data:
                dataset.y_pred_json = _series_to_json(data["y_pred"])
            db.commit()
        except Exception:
            logger.warning(f"Failed to persist pipeline state for dataset '{name}'", exc_info=True)
            db.rollback()
        finally:
            db.close()

    def _hydrate(self, name: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        from core.repositories.database import SessionLocal
        from core.models.models import Dataset

        uid = self._resolve_user_id(user_id)
        db = SessionLocal()
        try:
            query = db.query(Dataset).filter_by(name=name).filter(Dataset.parquet_path.isnot(None))
            if uid and uid != "guest_user":
                scoped = query.filter_by(owner_id=uid).order_by(Dataset.created_at.desc()).first()
                dataset = scoped if scoped else query.order_by(Dataset.created_at.desc()).first()
            else:
                dataset = query.order_by(Dataset.created_at.desc()).first()

            if not dataset:
                return None
            result: Dict[str, Any] = {"parquet_path": dataset.parquet_path}
            if dataset.target_column:
                result["target_column"] = dataset.target_column
            if dataset.problem_type:
                result["problem_type"] = dataset.problem_type
            if dataset.y_test_json:
                result["y_test"] = pd.Series(json.loads(dataset.y_test_json))
            if dataset.y_pred_json:
                result["y_pred"] = pd.Series(json.loads(dataset.y_pred_json))
            return result
        except Exception:
            logger.warning(f"Failed to hydrate pipeline state for dataset '{name}'", exc_info=True)
            return None
        finally:
            db.close()


data_service = DataService()
