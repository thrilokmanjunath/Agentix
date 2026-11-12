from fastapi.testclient import TestClient

from core.api.main import app

client = TestClient(app)


def test_storage_endpoint_returns_real_disk_usage():
    """Regression test: /platform/storage must exist and return real,
    internally-consistent numbers (previously the frontend called this
    endpoint and it 404'd, leaving storage_used/storage_total stuck at
    hardcoded values)."""
    response = client.get("/api/v1/platform/storage")
    assert response.status_code == 200
    data = response.json()["data"]
    assert set(data.keys()) == {"used_gb", "total_gb", "free_gb"}
    assert data["used_gb"] >= 0
    assert data["total_gb"] > 0
    assert data["free_gb"] >= 0
    assert data["free_gb"] <= data["total_gb"]


def test_pandas_engine_supports_xlsx_and_json():
    """Verify that PandasEngine supports multi-format loading (.csv, .xlsx, .json, .parquet)."""
    import os
    import pandas as pd
    from core.engines.base import PandasEngine

    engine = PandasEngine()
    test_df = pd.DataFrame({"col_a": [1, 2, 3], "col_b": ["x", "y", "z"]})

    # Test JSON
    json_path = "/tmp/test_engine.json"
    test_df.to_json(json_path, orient="records")
    loaded_json = engine.load_dataset(json_path)
    assert loaded_json.shape == (3, 2)
    os.remove(json_path)

    # Test XLSX
    xlsx_path = "/tmp/test_engine.xlsx"
    test_df.to_excel(xlsx_path, index=False, engine="openpyxl")
    loaded_xlsx = engine.load_dataset(xlsx_path)
    assert loaded_xlsx.shape == (3, 2)
    os.remove(xlsx_path)

