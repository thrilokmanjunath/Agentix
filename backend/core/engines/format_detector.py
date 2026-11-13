import os
import zipfile
import json
import csv
from enum import Enum
from pathlib import Path
from typing import Optional, List, Dict, Any


class DatasetFormat(str, Enum):
    CSV = "csv"
    TSV = "tsv"
    JSON = "json"
    JSONL = "jsonl"
    XLSX = "xlsx"
    PARQUET = "parquet"


class DatasetIngestionError(Exception):
    """Base exception for all dataset ingestion and parsing failures."""
    def __init__(self, message: str, code: str = "INGESTION_ERROR", details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class UnsupportedFormatError(DatasetIngestionError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, code="UNSUPPORTED_FORMAT", details=details)


class EmptyDatasetError(DatasetIngestionError):
    def __init__(self, message: str = "Dataset file is empty (0 bytes).", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, code="EMPTY_DATASET", details=details)


class LegacyExcelFormatError(DatasetIngestionError):
    def __init__(self, message: str = "Legacy Excel format (.xls / BIFF8) is deprecated and unsupported. Please convert your file to modern Excel (.xlsx) or CSV.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, code="LEGACY_EXCEL_FORMAT", details=details)


class InvalidJSONStructureError(DatasetIngestionError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, code="INVALID_JSON_STRUCTURE", details=details)


class CorruptWorkbookError(DatasetIngestionError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, code="CORRUPT_WORKBOOK", details=details)


class SecurityValidationError(DatasetIngestionError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, code="SECURITY_VIOLATION", details=details)


class ZipBombError(SecurityValidationError):
    def __init__(self, message: str = "Potential decompression bomb detected in spreadsheet archive.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details=details)


class FormatMetadata:
    def __init__(
        self,
        format: DatasetFormat,
        file_path: str,
        file_size_bytes: int,
        encoding: str = "utf-8",
        delimiter: Optional[str] = None,
        json_subtype: Optional[str] = None,
        sheets: Optional[List[str]] = None,
        is_chunked_eligible: bool = True
    ):
        self.format = format
        self.file_path = file_path
        self.file_size_bytes = file_size_bytes
        self.file_size_mb = file_size_bytes / (1024 * 1024)
        self.encoding = encoding
        self.delimiter = delimiter
        self.json_subtype = json_subtype  # "array", "wrapped", "lines"
        self.sheets = sheets or []
        self.is_chunked_eligible = is_chunked_eligible

    def to_dict(self) -> Dict[str, Any]:
        return {
            "format": self.format.value,
            "file_path": self.file_path,
            "file_size_bytes": self.file_size_bytes,
            "file_size_mb": round(self.file_size_mb, 2),
            "encoding": self.encoding,
            "delimiter": self.delimiter,
            "json_subtype": self.json_subtype,
            "sheets": self.sheets,
            "is_chunked_eligible": self.is_chunked_eligible,
        }


class FormatDetector:
    """
    Centralized, deterministic format detection and security validation.
    Inspects magic bytes, file extensions, and structural headers to prevent
    file-spoofing, zip bombs, and format mismatch crashes.
    """
    
    # Signatures for rejected binaries
    DISALLOWED_SIGNATURES = [
        (b"MZ", "DOS/Windows Executable (MZ)"),
        (b"\x7fELF", "Linux Executable (ELF)"),
        (b"%PDF", "Adobe PDF document"),
        (b"\xca\xfe\xba\xbe", "Java Class / Mach-O Fat Binary"),
        (b"\xfe\xed\xfa\xce", "Mach-O 32-bit Binary"),
        (b"\xfe\xed\xfa\xcf", "Mach-O 64-bit Binary"),
        (b"\xcf\xfa\xed\xfe", "Mach-O 64-bit Little Endian"),
    ]

    # Legacy Excel BIFF8 / OLE2 signature
    LEGACY_EXCEL_SIGNATURE = b"\xd0\xcf\x11\xe0"

    # ZIP / OOXML signature (starts .xlsx, .docx, .zip)
    ZIP_SIGNATURE = b"PK\x03\x04"

    # Parquet signature
    PARQUET_SIGNATURE = b"PAR1"

    MAX_UNCOMPRESSED_XLSX_BYTES = 1024 * 1024 * 1024  # 1 GB
    MAX_XLSX_COMPRESSION_RATIO = 100.0  # 100:1 ratio alert

    @classmethod
    def validate_and_detect(cls, file_path: str) -> FormatMetadata:
        """
        Validates file existence, non-emptiness, safety signatures, and
        returns normalized format metadata.
        """
        path = Path(file_path).resolve()
        
        # 1. Existence and readability
        if not path.exists():
            raise FileNotFoundError(f"Dataset file not found at: {path}")
        if not path.is_file():
            raise UnsupportedFormatError(f"Specified path is not a regular file: {path}")

        # 2. Non-empty check
        file_size = path.stat().st_size
        if file_size == 0:
            raise EmptyDatasetError(f"Dataset file '{path.name}' is empty (0 bytes).")

        # 3. Magic bytes inspection
        with open(path, "rb") as f:
            header_16 = f.read(16)

        # Check disallowed binary executions
        for sig, desc in cls.DISALLOWED_SIGNATURES:
            if header_16.startswith(sig):
                raise SecurityValidationError(f"Prohibited binary file format detected: {desc}.")

        # Check legacy Excel BIFF8
        suffix = path.suffix.lower()
        if header_16.startswith(cls.LEGACY_EXCEL_SIGNATURE) or suffix == ".xls":
            raise LegacyExcelFormatError(
                f"File '{path.name}' is in legacy Excel (.xls / BIFF8) format. "
                "Agentix requires modern Excel (.xlsx / OpenXML) or CSV for institutional reliability."
            )

        # 4. Parquet format
        if header_16.startswith(cls.PARQUET_SIGNATURE) or suffix in [".parquet", ".pq"]:
            if not header_16.startswith(cls.PARQUET_SIGNATURE):
                raise UnsupportedFormatError(f"File '{path.name}' has .parquet extension but missing PAR1 magic header.")
            return FormatMetadata(
                format=DatasetFormat.PARQUET,
                file_path=str(path),
                file_size_bytes=file_size,
            )

        # 5. Modern XLSX format
        if suffix == ".xlsx" or header_16.startswith(cls.ZIP_SIGNATURE):
            return cls._validate_xlsx(path, file_size)

        # 6. JSON or JSONL format
        if suffix in [".json", ".jsonl", ".ndjson"]:
            return cls._validate_json(path, file_size, suffix)

        # 7. Delimited Text (CSV, TSV)
        if suffix in [".csv", ".tsv", ".txt"]:
            return cls._validate_delimited(path, file_size, suffix)

        # 8. Suffix-less or unknown fallback
        # Try inspecting content text
        try:
            return cls._inspect_text_fallback(path, file_size)
        except Exception:
            raise UnsupportedFormatError(
                f"Unsupported dataset file format for '{path.name}'. "
                "Supported formats: CSV (.csv), TSV (.tsv), JSON (.json), JSON Lines (.jsonl, .ndjson), Excel (.xlsx), Parquet (.parquet)."
            )

    @classmethod
    def _validate_xlsx(cls, path: Path, file_size: int) -> FormatMetadata:
        """Validates XLSX zip container integrity, checks zip bomb, extracts sheet names."""
        if not zipfile.is_zipfile(path):
            raise CorruptWorkbookError(f"File '{path.name}' is not a valid OpenXML spreadsheet archive.")

        sheets: List[str] = []
        try:
            with zipfile.ZipFile(path, "r") as z:
                total_uncompressed = 0
                has_workbook_xml = False
                for zinfo in z.infolist():
                    total_uncompressed += zinfo.file_size
                    if total_uncompressed > cls.MAX_UNCOMPRESSED_XLSX_BYTES:
                        raise ZipBombError(
                            f"Excel archive exceeds maximum safe uncompressed limit of {cls.MAX_UNCOMPRESSED_XLSX_BYTES // (1024*1024)}MB."
                        )
                    if "xl/workbook.xml" in zinfo.filename:
                        has_workbook_xml = True

                if file_size > 0:
                    ratio = total_uncompressed / file_size
                    if ratio > cls.MAX_XLSX_COMPRESSION_RATIO and total_uncompressed > 50 * 1024 * 1024:
                        raise ZipBombError(f"Excessive compression ratio ({ratio:.1f}:1) detected in spreadsheet archive.")

                if not has_workbook_xml:
                    raise CorruptWorkbookError(f"Archive '{path.name}' is a ZIP container but does not contain valid Excel workbook XML.")
        except zipfile.BadZipFile as e:
            raise CorruptWorkbookError(f"Corrupted Excel archive in '{path.name}': {str(e)}")

        # Read sheet names using openpyxl in read_only mode without full DOM load
        try:
            import openpyxl
            wb = openpyxl.load_workbook(filename=str(path), read_only=True, keep_links=False)
            sheets = wb.sheetnames
            wb.close()
        except Exception as e:
            # If openpyxl cannot read sheetnames, fallback to empty list or raise
            sheets = []

        return FormatMetadata(
            format=DatasetFormat.XLSX,
            file_path=str(path),
            file_size_bytes=file_size,
            sheets=sheets,
            is_chunked_eligible=True
        )

    @classmethod
    def _validate_json(cls, path: Path, file_size: int, suffix: str) -> FormatMetadata:
        """Validates JSON structure: detects array of objects, wrapped data, or JSON lines."""
        # Read initial sample
        sample_size = min(file_size, 65536)
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            sample = f.read(sample_size).strip()

        if not sample:
            raise EmptyDatasetError(f"JSON file '{path.name}' contains only whitespace.")

        if suffix in [".jsonl", ".ndjson"]:
            # Check first line is valid JSON object
            first_line = sample.splitlines()[0].strip()
            try:
                parsed_first = json.loads(first_line)
                if not isinstance(parsed_first, dict):
                    raise InvalidJSONStructureError(f"JSON Lines in '{path.name}' must contain JSON objects per line, got {type(parsed_first).__name__}.")
            except json.JSONDecodeError as e:
                raise InvalidJSONStructureError(f"Invalid JSON Lines format in '{path.name}' at line 1: {str(e)}")
            return FormatMetadata(
                format=DatasetFormat.JSONL,
                file_path=str(path),
                file_size_bytes=file_size,
                json_subtype="lines",
                is_chunked_eligible=True
            )

        # Standard .json file
        first_char = sample[0]
        if first_char == "[":
            # Array of objects
            # Validate complete or partial JSON
            return FormatMetadata(
                format=DatasetFormat.JSON,
                file_path=str(path),
                file_size_bytes=file_size,
                json_subtype="array",
                is_chunked_eligible=True
            )
        elif first_char == "{":
            # Either wrapped records ({"data": [...]}) or JSONL saved as .json
            # Try to test if it's JSONL first if sample has multiple lines
            lines = sample.splitlines()
            if len(lines) > 1 and lines[0].strip().endswith("}") and lines[1].strip().startswith("{"):
                try:
                    json.loads(lines[0])
                    json.loads(lines[1])
                    return FormatMetadata(
                        format=DatasetFormat.JSONL,
                        file_path=str(path),
                        file_size_bytes=file_size,
                        json_subtype="lines",
                        is_chunked_eligible=True
                    )
                except Exception:
                    pass

            # Check if it has a records/data key
            # For small files, we can parse the keys
            if file_size <= 20 * 1024 * 1024:
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if isinstance(data, list):
                        return FormatMetadata(
                            format=DatasetFormat.JSON,
                            file_path=str(path),
                            file_size_bytes=file_size,
                            json_subtype="array",
                            is_chunked_eligible=True
                        )
                    elif isinstance(data, dict):
                        # Find record array key
                        record_keys = ["data", "records", "items", "rows", "results", "features"]
                        found_key = None
                        for k in record_keys:
                            if k in data and isinstance(data[k], list):
                                found_key = k
                                break
                        if not found_key:
                            for k, v in data.items():
                                if isinstance(v, list) and (len(v) == 0 or isinstance(v[0], dict)):
                                    found_key = k
                                    break
                        if found_key:
                            return FormatMetadata(
                                format=DatasetFormat.JSON,
                                file_path=str(path),
                                file_size_bytes=file_size,
                                json_subtype=f"wrapped:{found_key}",
                                is_chunked_eligible=True
                            )
                        else:
                            # Check if all values are lists of same length (columnar JSON: {"col1": [1, 2], "col2": [3, 4]})
                            if all(isinstance(v, list) for v in data.values()):
                                return FormatMetadata(
                                    format=DatasetFormat.JSON,
                                    file_path=str(path),
                                    file_size_bytes=file_size,
                                    json_subtype="columnar",
                                    is_chunked_eligible=True
                                )
                            raise InvalidJSONStructureError(
                                f"JSON object in '{path.name}' does not contain a recognizable tabular records array. "
                                f"Expected a top-level list of objects or a dict with one of {record_keys}."
                            )
                except json.JSONDecodeError as je:
                    raise InvalidJSONStructureError(f"Malformed JSON in '{path.name}': {str(je)}")

            return FormatMetadata(
                format=DatasetFormat.JSON,
                file_path=str(path),
                file_size_bytes=file_size,
                json_subtype="wrapped",
                is_chunked_eligible=True
            )
        else:
            raise InvalidJSONStructureError(f"File '{path.name}' starts with unexpected character '{first_char}'. Expected '[' or '{{'.")

    @classmethod
    def _validate_delimited(cls, path: Path, file_size: int, suffix: str) -> FormatMetadata:
        """Validates CSV/TSV headers, encoding, delimiter."""
        # Read text sample for delimiter sniffing and UTF-8 verification
        try:
            with open(path, "r", encoding="utf-8") as f:
                header_line = f.readline()
                second_line = f.readline()
        except UnicodeDecodeError:
            try:
                # Try latin1 or cp1252 fallback
                with open(path, "r", encoding="latin-1") as f:
                    header_line = f.readline()
                    second_line = f.readline()
                encoding = "latin-1"
            except Exception as e:
                raise UnsupportedFormatError(f"Unable to decode text file '{path.name}'. File must be UTF-8 or Latin-1 encoded.")
        else:
            encoding = "utf-8"

        if not header_line.strip():
            raise EmptyDatasetError(f"Delimited file '{path.name}' is empty or contains only blank lines.")

        delimiter = "\t" if suffix == ".tsv" else ","
        try:
            sniffer = csv.Sniffer()
            sample_text = header_line + (second_line or "")
            dialect = sniffer.sniff(sample_text, delimiters=[",", "\t", ";", "|"])
            delimiter = dialect.delimiter
        except Exception:
            # Fallback based on extension or presence of tab/comma
            if "\t" in header_line and "," not in header_line:
                delimiter = "\t"
            elif ";" in header_line and "," not in header_line:
                delimiter = ";"
            else:
                delimiter = ","

        fmt = DatasetFormat.TSV if delimiter == "\t" else DatasetFormat.CSV
        return FormatMetadata(
            format=fmt,
            file_path=str(path),
            file_size_bytes=file_size,
            encoding=encoding,
            delimiter=delimiter,
            is_chunked_eligible=True
        )

    @classmethod
    def _inspect_text_fallback(cls, path: Path, file_size: int) -> FormatMetadata:
        """Inspects extensionless files by reading initial bytes."""
        with open(path, "rb") as f:
            chunk = f.read(1024)
        if chunk.startswith(cls.ZIP_SIGNATURE):
            return cls._validate_xlsx(path, file_size)
        if chunk.startswith(cls.PARQUET_SIGNATURE):
            return FormatMetadata(format=DatasetFormat.PARQUET, file_path=str(path), file_size_bytes=file_size)
        
        text = chunk.decode("utf-8", errors="ignore").strip()
        if text.startswith("[") or text.startswith("{"):
            return cls._validate_json(path, file_size, ".json")
        return cls._validate_delimited(path, file_size, ".csv")
