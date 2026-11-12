from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Iterator, List
from pathlib import Path
import os
import json
import logging
import pandas as pd
import numpy as np

from .format_detector import (
    FormatDetector,
    DatasetFormat,
    FormatMetadata,
    DatasetIngestionError,
    UnsupportedFormatError,
    EmptyDatasetError,
    LegacyExcelFormatError,
    InvalidJSONStructureError,
    CorruptWorkbookError
)

logger = logging.getLogger("agentix_v2")


def sanitize_dataframe_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Sanitizes DataFrame columns:
    1. Ensures clean, non-null, string column headers.
    2. Serializes nested dictionaries and lists into JSON strings for tabular stability.
    3. Harmonizes mixed-type object columns to prevent PyArrow conversion failures.
    4. Guards against spreadsheet formula injection (=, +, -, @ prefix).
    """
    # 1. Clean headers
    cleaned_cols = []
    seen = set()
    for i, col in enumerate(df.columns):
        c_str = str(col).strip() if col is not None else f"col_{i}"
        if not c_str or c_str == "nan":
            c_str = f"col_{i}"
        base = c_str
        count = 1
        while c_str in seen:
            c_str = f"{base}_{count}"
            count += 1
        seen.add(c_str)
        cleaned_cols.append(c_str)
    df.columns = cleaned_cols

    def clean_cell(val):
        if val is None:
            return None
        if isinstance(val, (dict, list, tuple)):
            return json.dumps(val)
        if isinstance(val, (float, np.floating)) and np.isnan(val):
            return None
        return str(val)

    # 2. Sanitize cells and harmonize mixed types
    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = [clean_cell(v) for v in df[col]]

    return df


class ProcessingEngine(ABC):
    @abstractmethod
    def load_dataset(self, source_path: str) -> Any:
        pass

    @abstractmethod
    def save_dataset(self, data: Any, dest_path: str) -> None:
        pass

    @abstractmethod
    def compute(self, data: Any) -> Any:
        """Force evaluation/computation if the engine uses lazy evaluation."""
        pass

    @abstractmethod
    def get_memory_usage(self, data: Any) -> float:
        """Return memory usage of the dataset in MB"""
        pass


class PandasEngine(ProcessingEngine):
    """
    Standard in-memory processing engine for datasets that comfortably fit in RAM (<500MB).
    Supports CSV, TSV, JSON (array, wrapped, lines), XLSX, and Parquet.
    """
    def load_dataset(self, source_path: str) -> pd.DataFrame:
        meta = FormatDetector.validate_and_detect(source_path)
        logger.info(f"[PandasEngine] Loading dataset '{Path(source_path).name}' (Format: {meta.format.value}, Size: {meta.file_size_mb:.2f}MB)")

        if meta.format in (DatasetFormat.CSV, DatasetFormat.TSV):
            delimiter = meta.delimiter or ("," if meta.format == DatasetFormat.CSV else "\t")
            df = pd.read_csv(source_path, sep=delimiter, encoding=meta.encoding, low_memory=False)
            return sanitize_dataframe_columns(df)

        elif meta.format == DatasetFormat.PARQUET:
            try:
                return pd.read_parquet(source_path, engine="pyarrow")
            except Exception:
                return pd.read_parquet(source_path, engine="fastparquet")

        elif meta.format in (DatasetFormat.JSON, DatasetFormat.JSONL):
            return self._load_json(source_path, meta)

        elif meta.format == DatasetFormat.XLSX:
            return self._load_xlsx(source_path, meta)

        raise UnsupportedFormatError(f"Unsupported file format for PandasEngine: {source_path}")

    def _load_json(self, source_path: str, meta: FormatMetadata) -> pd.DataFrame:
        """Loads JSON files handling arrays, wrapped records, or lines."""
        if meta.format == DatasetFormat.JSONL or meta.json_subtype == "lines":
            df = pd.read_json(source_path, lines=True, encoding="utf-8")
            return sanitize_dataframe_columns(df)

        try:
            with open(source_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
        except Exception as e:
            raise InvalidJSONStructureError(f"Failed to parse JSON file '{Path(source_path).name}': {str(e)}")

        if isinstance(raw_data, list):
            df = pd.json_normalize(raw_data)
            return sanitize_dataframe_columns(df)

        elif isinstance(raw_data, dict):
            # Check for known wrapper keys
            wrapper_keys = ["data", "records", "items", "rows", "results", "features"]
            for key in wrapper_keys:
                if key in raw_data and isinstance(raw_data[key], list):
                    df = pd.json_normalize(raw_data[key])
                    return sanitize_dataframe_columns(df)

            # Check for columnar structure: {"col1": [1, 2], "col2": [3, 4]}
            if all(isinstance(v, list) for v in raw_data.values()):
                df = pd.DataFrame(raw_data)
                return sanitize_dataframe_columns(df)

            # Fallback: single record dictionary
            df = pd.json_normalize([raw_data])
            return sanitize_dataframe_columns(df)

        raise InvalidJSONStructureError(f"Unrecognized JSON structure in '{Path(source_path).name}'. Expected a list or dictionary.")

    def _load_xlsx(self, source_path: str, meta: FormatMetadata) -> pd.DataFrame:
        """
        Loads XLSX using openpyxl in read_only and data_only mode to prevent
        excessive memory DOM expansion and to extract calculated formula values.
        """
        import openpyxl

        wb = openpyxl.load_workbook(filename=source_path, read_only=True, data_only=True, keep_links=False)
        sheet = wb.active
        if sheet is None:
            wb.close()
            raise CorruptWorkbookError(f"Workbook '{Path(source_path).name}' contains no active worksheet.")

        rows_iter = sheet.iter_rows(values_only=True)
        try:
            header_row = next(rows_iter)
        except StopIteration:
            wb.close()
            raise EmptyDatasetError(f"Worksheet in '{Path(source_path).name}' is empty.")

        header = [str(col).strip() if col is not None else f"col_{i}" for i, col in enumerate(header_row)]
        
        rows = []
        for r in rows_iter:
            # Check if row is entirely empty
            if any(cell is not None for cell in r):
                rows.append(r)

        wb.close()
        df = pd.DataFrame(rows, columns=header)
        return sanitize_dataframe_columns(df)

    def save_dataset(self, df: pd.DataFrame, dest_path: str) -> None:
        dest = str(dest_path)
        if dest.endswith(".csv"):
            df.to_csv(dest, index=False)
        elif dest.endswith(".parquet"):
            clean_df = sanitize_dataframe_columns(df)
            try:
                clean_df.to_parquet(dest, engine="pyarrow", index=False)
            except Exception:
                clean_df.to_parquet(dest, engine="fastparquet", index=False)
        else:
            raise UnsupportedFormatError(f"Unsupported save format for PandasEngine: {dest}")

    def compute(self, data: pd.DataFrame) -> pd.DataFrame:
        return data

    def get_memory_usage(self, data: pd.DataFrame) -> float:
        return data.memory_usage(deep=True).sum() / (1024 * 1024)


class ChunkedPandasEngine(ProcessingEngine):
    """
    Memory-bounded chunked processing engine for large datasets (up to 500MB+).
    Streams CSV, TSV, JSONL, JSON arrays, and XLSX worksheets into incremental
    Parquet row groups using PyArrow ParquetWriter without exhausting process RAM.
    """
    def __init__(self, chunksize: int = 50000):
        self.chunksize = chunksize

    def load_dataset(self, source_path: str) -> Iterator[pd.DataFrame]:
        meta = FormatDetector.validate_and_detect(source_path)
        logger.info(f"[ChunkedPandasEngine] Streaming dataset '{Path(source_path).name}' in chunks of {self.chunksize} (Format: {meta.format.value}, Size: {meta.file_size_mb:.2f}MB)")

        if meta.format in (DatasetFormat.CSV, DatasetFormat.TSV):
            delimiter = meta.delimiter or ("," if meta.format == DatasetFormat.CSV else "\t")
            reader = pd.read_csv(source_path, chunksize=self.chunksize, sep=delimiter, encoding=meta.encoding, low_memory=False)
            for chunk in reader:
                yield sanitize_dataframe_columns(chunk)

        elif meta.format == DatasetFormat.JSONL or (meta.format == DatasetFormat.JSON and meta.json_subtype == "lines"):
            yield from self._stream_jsonl(source_path)

        elif meta.format == DatasetFormat.JSON:
            yield from self._stream_json_array(source_path, meta)

        elif meta.format == DatasetFormat.XLSX:
            yield from self._stream_xlsx(source_path, meta)

        elif meta.format == DatasetFormat.PARQUET:
            # Read parquet in row groups
            import pyarrow.parquet as pq
            pf = pq.ParquetFile(source_path)
            for rg_idx in range(pf.num_row_groups):
                rg_table = pf.read_row_group(rg_idx)
                yield sanitize_dataframe_columns(rg_table.to_pandas())
        else:
            raise UnsupportedFormatError(f"Chunked loading unsupported for format: {meta.format.value}")

    def _stream_jsonl(self, source_path: str) -> Iterator[pd.DataFrame]:
        batch = []
        with open(source_path, "r", encoding="utf-8") as f:
            for line in f:
                line_str = line.strip()
                if line_str:
                    try:
                        batch.append(json.loads(line_str))
                    except Exception:
                        continue
                if len(batch) >= self.chunksize:
                    df = pd.json_normalize(batch)
                    yield sanitize_dataframe_columns(df)
                    batch = []
        if batch:
            df = pd.json_normalize(batch)
            yield sanitize_dataframe_columns(df)

    def _stream_json_array(self, source_path: str, meta: FormatMetadata) -> Iterator[pd.DataFrame]:
        # For standard JSON, read and normalize records in chunk batches
        with open(source_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = data
        if isinstance(data, dict):
            wrapper_keys = ["data", "records", "items", "rows", "results", "features"]
            for key in wrapper_keys:
                if key in data and isinstance(data[key], list):
                    records = data[key]
                    break

        if not isinstance(records, list):
            records = [records]

        total = len(records)
        for i in range(0, total, self.chunksize):
            slice_data = records[i:i + self.chunksize]
            df = pd.json_normalize(slice_data)
            yield sanitize_dataframe_columns(df)

    def _stream_xlsx(self, source_path: str, meta: FormatMetadata) -> Iterator[pd.DataFrame]:
        import openpyxl

        wb = openpyxl.load_workbook(filename=source_path, read_only=True, data_only=True, keep_links=False)
        sheet = wb.active
        if sheet is None:
            wb.close()
            raise CorruptWorkbookError(f"Workbook '{Path(source_path).name}' contains no active worksheet.")

        row_gen = sheet.iter_rows(values_only=True)
        try:
            header_row = next(row_gen)
        except StopIteration:
            wb.close()
            raise EmptyDatasetError(f"Worksheet in '{Path(source_path).name}' is empty.")

        header = [str(col).strip() if col is not None else f"col_{i}" for i, col in enumerate(header_row)]

        batch = []
        for r in row_gen:
            if any(cell is not None for cell in r):
                batch.append(r)
            if len(batch) >= self.chunksize:
                df_batch = pd.DataFrame(batch, columns=header)
                yield sanitize_dataframe_columns(df_batch)
                batch = []

        if batch:
            df_batch = pd.DataFrame(batch, columns=header)
            yield sanitize_dataframe_columns(df_batch)

        wb.close()

    def save_dataset(self, data: Any, dest_path: str) -> None:
        """
        Streams chunks into a destination file.
        Uses PyArrow ParquetWriter for memory-bounded Parquet generation.
        """
        dest = str(dest_path)
        # If passed a single DataFrame, wrap in a list so logic remains identical
        chunks = [data] if isinstance(data, pd.DataFrame) else data

        if dest.endswith(".parquet"):
            self._save_parquet_stream(chunks, dest)
        elif dest.endswith(".csv"):
            self._save_csv_stream(chunks, dest)
        else:
            raise UnsupportedFormatError(f"Unsupported save format for ChunkedPandasEngine: {dest}")

    def _save_parquet_stream(self, chunks: Any, dest_path: str) -> None:
        import pyarrow as pa
        import pyarrow.parquet as pq

        writer = None
        schema = None
        string_cols_fixed = set()

        try:
            for chunk in chunks:
                if not isinstance(chunk, pd.DataFrame):
                    chunk = pd.DataFrame(chunk)
                if chunk.empty:
                    continue

                chunk = sanitize_dataframe_columns(chunk)

                # Ensure consistent string typing for object columns across batches
                for col in string_cols_fixed:
                    if col in chunk.columns:
                        chunk[col] = chunk[col].astype(str)

                table = pa.Table.from_pandas(chunk, preserve_index=False)

                if writer is None:
                    schema = table.schema
                    # Identify string columns in schema to lock them in subsequent chunks
                    for field in schema:
                        if pa.types.is_string(field.type) or pa.types.is_large_string(field.type):
                            string_cols_fixed.add(field.name)
                    writer = pq.ParquetWriter(dest_path, schema=schema, compression="snappy")

                # Cast table to locked schema if types drift across chunks
                if schema is not None:
                    try:
                        table = table.cast(schema)
                    except Exception:
                        # Fallback: re-coerce offending columns to string
                        for col in chunk.columns:
                            if col in string_cols_fixed:
                                chunk[col] = chunk[col].astype(str)
                        table = pa.Table.from_pandas(chunk, preserve_index=False).cast(schema)

                writer.write_table(table)

        finally:
            if writer is not None:
                writer.close()

    def _save_csv_stream(self, chunks: Any, dest_path: str) -> None:
        first = True
        for chunk in chunks:
            if not isinstance(chunk, pd.DataFrame):
                chunk = pd.DataFrame(chunk)
            chunk.to_csv(dest_path, mode="a" if not first else "w", header=first, index=False)
            first = False

    def compute(self, data: Any) -> pd.DataFrame:
        if isinstance(data, pd.DataFrame):
            return data
        return pd.concat(list(data), ignore_index=True)

    def get_memory_usage(self, data: Any) -> float:
        if isinstance(data, pd.DataFrame):
            return data.memory_usage(deep=True).sum() / (1024 * 1024)
        return 0.0


class DaskEngine(ProcessingEngine):
    """Distributed or out-of-core engine for massive datasets (>2GB)."""
    def load_dataset(self, source_path: str) -> Any:
        import dask.dataframe as dd
        meta = FormatDetector.validate_and_detect(source_path)

        if meta.format in (DatasetFormat.CSV, DatasetFormat.TSV):
            delimiter = meta.delimiter or ("," if meta.format == DatasetFormat.CSV else "\t")
            return dd.read_csv(source_path, sep=delimiter, encoding=meta.encoding)
        elif meta.format == DatasetFormat.PARQUET:
            return dd.read_parquet(source_path, engine="pyarrow")
        elif meta.format in (DatasetFormat.JSON, DatasetFormat.JSONL):
            return dd.read_json(source_path)
        raise UnsupportedFormatError(f"Unsupported format for DaskEngine: {source_path}")

    def save_dataset(self, data: Any, dest_path: str) -> None:
        if dest_path.endswith(".csv"):
            data.to_csv(dest_path, single_file=True, index=False)
        elif dest_path.endswith(".parquet"):
            data.to_parquet(dest_path, engine="pyarrow", write_index=False)
        else:
            raise UnsupportedFormatError(f"Unsupported save format for DaskEngine: {dest_path}")

    def compute(self, data: Any) -> pd.DataFrame:
        if isinstance(data, pd.DataFrame):
            return data
        return data.compute()

    def get_memory_usage(self, data: Any) -> float:
        if isinstance(data, pd.DataFrame):
            return data.memory_usage(deep=True).sum() / (1024 * 1024)
        return data.memory_usage(deep=True).sum().compute() / (1024 * 1024)


class EngineFactory:
    @staticmethod
    def get_engine(dataset_size_mb: float = 0.0, config_engine: Optional[str] = None) -> ProcessingEngine:
        if config_engine == "pandas":
            return PandasEngine()
        elif config_engine == "chunked":
            return ChunkedPandasEngine()
        elif config_engine == "dask":
            return DaskEngine()

        if dataset_size_mb < 200:
            return PandasEngine()
        elif dataset_size_mb < 2000:
            return ChunkedPandasEngine()
        else:
            return DaskEngine()
