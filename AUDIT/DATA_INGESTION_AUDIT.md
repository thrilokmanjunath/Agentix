# Agentix — Data Ingestion Engine Forensic Audit

**Audit Identifier:** `AUDIT-DATA-INGESTION-2026-V1`  
**Security Classification:** Highly Confidential / Institutional Audit  
**Author:** Principal Data Engineering Architect & DevSecOps Lead  
**Target Platform:** Agentix Autonomous Institutional SaaS Platform  
**Date of Audit:** November 4, 2026  
**Status:** COMPLETED & REMEDIATED  

---

## 1. Executive Summary

A critical operational defect was reported on the Agentix platform where dataset ingestion failed immediately upon uploading non-CSV files, specifically JSON and Microsoft Excel (`.xlsx`) datasets. The failure was exemplified by dataset `aa574443-44c9-4950-a430-5bf4d3f1bd7a_movies_entertainment_analytics.json` and production Excel file `1a4e04f3-ed7c-4736-b51f-dc20c076ec23_Online_Retail.xlsx`.

This audit documents the forensic investigation, root causes, architectural bottlenecks, and the multi-layered remediation implemented to provide enterprise-grade, memory-bounded dataset ingestion capable of scaling to 500 MB across CSV, TSV, JSON, JSON Lines, and modern OpenXML Excel formats.

---

## 2. Forensic Investigation & Incident Reproduction

### 2.1 Problem Statement & Stack Trace
When users uploaded JSON or XLSX files via the web interface or chunked upload endpoint (`/api/v1/dataset/upload/complete`), the background execution dispatcher initiated the pipeline. The first processing stage, `ParserAgent`, immediately aborted with the following recorded error:

```python
ValueError: Unsupported file format for PandasEngine: /Users/thrilokm/Downloads/agentix-recovery-backup-2026/backend/data/temp/aa574443-44c9-4950-a430-5bf4d3f1bd7a_movies_entertainment_analytics.json
```

**Forensic Execution Chain:**
1. `backend/core/agents/base.py:71` (`BaseAgent.run` -> `self.execute(validated_input, engine)`)
2. `backend/core/agents/pipeline_agents.py:51` (`ParserAgent.execute` -> `data_obj = engine.load_dataset(file_path)`)
3. `backend/core/engines/base.py:33` (`PandasEngine.load_dataset` -> `raise ValueError(f"Unsupported file format for PandasEngine: {source_path}")`)

### 2.2 Database Audit Logs
Inspection of the SQLite backend database (`backend/agentix.db`) confirmed consecutive hard failures across all non-CSV jobs:

| Run ID | Dataset Name | Stage | Error Code | Root Cause |
| :--- | :--- | :--- | :--- | :--- |
| `a89cc3a4-b877-4a26-afe0-d3a213a01888` | `1a4e04f3-..._Online_Retail.xlsx` | `ParserAgent` | `ValueError` | `Unsupported file format for PandasEngine` |
| `75d12b3d-838f-46df-b1a7-1427fc20d831` | `dfe70521-..._global_supply_chain_logistics.xlsx` | `ParserAgent` | `ValueError` | `Unsupported file format for PandasEngine` |
| `85805aa8-da6f-4629-8326-2fc367b33d0b` | `aa574443-..._movies_entertainment_analytics.json` | `ParserAgent` | `ValueError` | `Unsupported file format for PandasEngine` |

---

## 3. Root Cause Analysis (RCA)

Our forensic investigation revealed four interconnected design defects:

### Defect 1: Hardcoded Format Exclusions in Ingestion Engines
In `backend/core/engines/base.py`, `PandasEngine.load_dataset` was initially implemented with a rigid format dispatch that only permitted `.csv` and `.parquet`. Any upload carrying `.json` or `.xlsx` triggered an unhandled `ValueError`. Furthermore, `ChunkedPandasEngine` only implemented CSV reading and explicitly crashed if given any other format:
```python
if source_path.endswith('.csv'):
    return pd.read_csv(source_path, chunksize=self.chunksize)
raise ValueError(f"Chunked loading only supported for CSV in this engine: {source_path}")
```

### Defect 2: Stale Daemon Runtime Bytecode
A persistent Uvicorn worker (PID 70569) had been running in the background since 12:30 AM without code reloading enabled (`--reload`). Consequently, early iterative changes to `base.py` were never loaded by the active worker, causing API requests to execute stale compiled bytecode from memory.

### Defect 3: Lack of Centralized Format & Security Validation
At the HTTP upload layer (`routes_data.py`), validation was completely asymmetrical:
- Only files ending in `.csv` had content validation (`validate_csv_content`).
- `.json` and `.xlsx` bypassed all structural checks during chunk reassembly.
- There was no magic byte inspection, leaving the system vulnerable to file-spoofing, zip bombs in spreadsheet containers, and corrupted archives.

### Defect 4: Memory Inflation During Parser Metadata Extraction
In `ParserAgent.execute`, the workflow parsed raw data into Parquet and then immediately called:
```python
df = engine.compute(engine.load_dataset(parquet_path))
rows, cols = df.shape
target_column = df.columns[-1]
```
For a 500 MB dataset, materializing the entire DataFrame into memory via `engine.compute()` consumed 2–4 GB of system RAM solely to extract row and column dimensions.

---

## 4. Remediation Architecture

The engineering remediation was deployed across five core layers:

```
[Uploaded File] 
       │
       ▼
[1. FormatDetector Subsystem]
  ├── Magic Byte Verification (MZ, ELF, PDF, PAR1, PK0304)
  ├── Zip Bomb Protection (<1GB uncompressed, <100:1 ratio)
  ├── Legacy BIFF8 (.xls) Rejection
  └── Delimiter & JSON Subtype Sniffing
       │
       ▼
[2. Processing Engine Dispatch]
  ├── PandasEngine (<200MB): In-memory vectorized normalization
  ├── ChunkedPandasEngine (200MB-2GB): Streaming batch generators
  └── DaskEngine (>2GB): Out-of-core distributed execution
       │
       ▼
[3. Tabular Sanitization Layer]
  ├── Column Name Deduplication & Whitespace Normalization
  ├── Nested Dict/List JSON String Serialization
  └── Mixed-Type Column Harmonization (Integer/String co-existence)
       │
       ▼
[4. Streaming ParquetWriter]
  └── Incremental Row Group appending (snappy compression)
       │
       ▼
[5. Zero-Memory Parquet Metadata Extractor]
  └── Reads file footer in <1ms without materializing DataFrame
```

---

## 5. Verification Summary

| Format | Test Dataset | Size | Rows | Columns | Pipeline Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **JSON** | `movies_entertainment_analytics.json` | 1.53 MB | 3,201 | 16 | **COMPLETED (100%)** |
| **XLSX** | `Online_Retail.xlsx` | 22.62 MB | 541,909 | 8 | **COMPLETED (100%)** |
| **XLSX** | `hospital_clinical_operations.xlsx` | 0.18 MB | 3,000 | 10 | **COMPLETED (100%)** |
| **CSV** | `enterprise_saas_churn.csv` | 0.95 MB | 7,043 | 21 | **COMPLETED (100%)** |
| **CSV** | `california_asset_valuation.csv` | 1.40 MB | 20,640 | 10 | **COMPLETED (100%)** |

All 14 test datasets in `test_data/` and all 49 backend regression tests passed with zero failures.
