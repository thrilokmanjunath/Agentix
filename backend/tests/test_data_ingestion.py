import os
import tempfile
import json
import pytest
import pandas as pd
import openpyxl
from pathlib import Path

from core.engines.format_detector import (
    FormatDetector,
    DatasetFormat,
    EmptyDatasetError,
    LegacyExcelFormatError,
    SecurityValidationError,
    InvalidJSONStructureError,
    CorruptWorkbookError
)
from core.engines.base import PandasEngine, ChunkedPandasEngine, sanitize_dataframe_columns
from core.agents.pipeline_agents import ParserAgent, PipelineInput


def test_format_detector_csv_and_tsv():
    with tempfile.NamedTemporaryFile(suffix=".csv", mode="w", delete=False) as f:
        f.write("col_a,col_b,target\n1,2,0\n3,4,1\n")
        csv_path = f.name

    with tempfile.NamedTemporaryFile(suffix=".tsv", mode="w", delete=False) as f:
        f.write("col_a\tcol_b\ttarget\n10\t20\t0\n30\t40\t1\n")
        tsv_path = f.name

    try:
        meta_csv = FormatDetector.validate_and_detect(csv_path)
        assert meta_csv.format == DatasetFormat.CSV
        assert meta_csv.delimiter == ","

        meta_tsv = FormatDetector.validate_and_detect(tsv_path)
        assert meta_tsv.format == DatasetFormat.TSV
        assert meta_tsv.delimiter == "\t"
    finally:
        os.unlink(csv_path)
        os.unlink(tsv_path)


def test_format_detector_legacy_xls_rejection():
    with tempfile.NamedTemporaryFile(suffix=".xls", mode="wb", delete=False) as f:
        f.write(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 100)
        xls_path = f.name

    try:
        with pytest.raises(LegacyExcelFormatError) as exc_info:
            FormatDetector.validate_and_detect(xls_path)
        assert "legacy Excel (.xls / BIFF8)" in str(exc_info.value)
    finally:
        os.unlink(xls_path)


def test_format_detector_binary_rejection():
    with tempfile.NamedTemporaryFile(suffix=".csv", mode="wb", delete=False) as f:
        f.write(b"MZ\x90\x00" + b"\x00" * 100)
        bin_path = f.name

    try:
        with pytest.raises(SecurityValidationError) as exc_info:
            FormatDetector.validate_and_detect(bin_path)
        assert "Prohibited binary file format" in str(exc_info.value)
    finally:
        os.unlink(bin_path)


def test_format_detector_empty_dataset_rejection():
    with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
        f.write("")
        empty_path = f.name

    try:
        with pytest.raises(EmptyDatasetError):
            FormatDetector.validate_and_detect(empty_path)
    finally:
        os.unlink(empty_path)


def test_json_ingestion_array_and_wrapped():
    # 1. Array of objects with nested dictionary
    array_data = [
        {"id": 1, "profile": {"name": "Alice", "city": "NYC"}, "score": 95},
        {"id": 2, "profile": {"name": "Bob", "city": "SF"}, "score": 88}
    ]
    with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
        json.dump(array_data, f)
        array_path = f.name

    # 2. Wrapped object
    wrapped_data = {
        "status": "success",
        "data": [
            {"txn_id": "T001", "amount": 150.0, "approved": True},
            {"txn_id": "T002", "amount": 320.5, "approved": False}
        ]
    }
    with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
        json.dump(wrapped_data, f)
        wrapped_path = f.name

    engine = PandasEngine()
    try:
        df_array = engine.load_dataset(array_path)
        assert df_array.shape == (2, 4)
        assert "profile.name" in df_array.columns
        assert "profile.city" in df_array.columns

        df_wrapped = engine.load_dataset(wrapped_path)
        assert df_wrapped.shape == (2, 3)
        assert "txn_id" in df_wrapped.columns
    finally:
        os.unlink(array_path)
        os.unlink(wrapped_path)


def test_xlsx_formula_and_mixed_type_ingestion():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Operations"
    # Header
    ws.append(["invoice_no", "description", "qty", "unit_price", "total"])
    # Row 1 with formula
    ws.append([536365, "Standard Widget", 10, 5.0, 50.0])
    # Row 2 with string invoice (mixed type)
    ws.append(["C536379", "Cancelled Return", -2, 5.0, -10.0])

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
        wb.save(f.name)
        xlsx_path = f.name

    engine = PandasEngine()
    agent = ParserAgent()
    try:
        df = engine.load_dataset(xlsx_path)
        assert df.shape == (2, 5)
        assert "invoice_no" in df.columns
        assert df["invoice_no"].iloc[0] == "536365"
        assert df["invoice_no"].iloc[1] == "C536379"

        # End-to-end parser agent parquet generation
        res = agent.execute(PipelineInput(dataset_name="test_xlsx", file_path=xlsx_path), engine)
        assert res.status == "success"
        parquet_path = res.result["parquet_path"]
        assert os.path.exists(parquet_path)
        os.unlink(parquet_path)
    finally:
        os.unlink(xlsx_path)


def test_chunked_streaming_engine():
    # Create 500 rows CSV
    rows = ["id,feature1,target\n"] + [f"{i},{i*1.5},{i%2}\n" for i in range(500)]
    with tempfile.NamedTemporaryFile(suffix=".csv", mode="w", delete=False) as f:
        f.writelines(rows)
        csv_path = f.name

    engine = ChunkedPandasEngine(chunksize=100)
    agent = ParserAgent()
    try:
        res = agent.execute(PipelineInput(dataset_name="test_chunked", file_path=csv_path), engine)
        assert res.status == "success"
        assert res.result["rows"] == 500
        assert res.result["cols"] == 3
        assert res.result["target_column"] == "target"
        
        parquet_path = res.result["parquet_path"]
        assert os.path.exists(parquet_path)
        os.unlink(parquet_path)
    finally:
        os.unlink(csv_path)
