import os
import sys
import time
import json
import psutil
import pandas as pd
import openpyxl
from pathlib import Path
from typing import Dict, Any, List

# Ensure backend is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from core.engines.base import ChunkedPandasEngine, PandasEngine
from core.engines.format_detector import FormatDetector
from core.agents.pipeline_agents import ParserAgent, PipelineInput

BENCH_DIR = Path("/tmp/agentix_benchmark_500mb")
BENCH_DIR.mkdir(parents=True, exist_ok=True)


def generate_benchmark_csv(path: Path, target_mb: float) -> int:
    target_bytes = int(target_mb * 1024 * 1024)
    header = "id,customer_id,transaction_date,amount,merchant_category,status,score,country\n"
    path.write_text(header, encoding="utf-8")
    written = len(header.encode("utf-8"))
    
    # Pre-generate 1000 rows block
    block_rows = []
    for i in range(1000):
        block_rows.append(f"{i},CUST_{i%500:05d},2026-11-04,149.50,FINTECH_SAAS,COMPLETED,0.9542,US\n")
    block_bytes = "".join(block_rows).encode("utf-8")
    
    with open(path, "ab") as f:
        while written < target_bytes:
            f.write(block_bytes)
            written += len(block_bytes)
    return path.stat().st_size


def generate_benchmark_jsonl(path: Path, target_mb: float) -> int:
    target_bytes = int(target_mb * 1024 * 1024)
    # Pre-generate 1000 lines
    block_lines = []
    for i in range(1000):
        obj = {
            "event_id": f"evt_{i:06d}",
            "device": "mac-m3-arm64",
            "cpu_usage": 42.5,
            "memory_rss_mb": 182.4,
            "network_egress_kb": 1024,
            "threat_flag": False,
            "region": "us-east-1"
        }
        block_lines.append(json.dumps(obj) + "\n")
    block_bytes = "".join(block_lines).encode("utf-8")
    
    written = 0
    with open(path, "wb") as f:
        while written < target_bytes:
            f.write(block_bytes)
            written += len(block_bytes)
    return path.stat().st_size


def generate_benchmark_xlsx(path: Path, target_rows: int) -> int:
    wb = openpyxl.Workbook(write_only=True)
    ws = wb.create_sheet(title="FinancialTransactions")
    ws.append(["trans_id", "client_name", "portfolio_value", "return_pct", "risk_rating", "active_flag"])
    
    for i in range(target_rows):
        ws.append([f"TX_{i:07d}", f"Client_{i%1000}", 1250000.50, 0.142, "MODERATE", "YES"])
    
    wb.save(str(path))
    wb.close()
    return path.stat().st_size


def run_single_benchmark(file_path: Path, engine_cls=ChunkedPandasEngine, chunksize: int = 50000) -> Dict[str, Any]:
    process = psutil.Process()
    file_size_bytes = file_path.stat().st_size
    file_size_mb = file_size_bytes / (1024 * 1024)
    
    # Record starting RSS memory
    mem_before = process.memory_info().rss / (1024 * 1024)
    
    engine = engine_cls(chunksize=chunksize) if engine_cls == ChunkedPandasEngine else engine_cls()
    agent = ParserAgent()
    
    t0 = time.time()
    result = agent.execute(PipelineInput(dataset_name=file_path.stem, file_path=str(file_path)), engine)
    duration = time.time() - t0
    
    mem_after = process.memory_info().rss / (1024 * 1024)
    peak_mem_delta = max(0.0, mem_after - mem_before)
    
    throughput_mb_s = file_size_mb / duration if duration > 0 else 0.0
    
    parquet_path = Path(result.result.get("parquet_path"))
    parquet_size_mb = parquet_path.stat().st_size / (1024 * 1024) if parquet_path.exists() else 0.0
    
    return {
        "file_name": file_path.name,
        "format": file_path.suffix.lstrip(".").upper(),
        "input_size_mb": round(file_size_mb, 2),
        "parquet_size_mb": round(parquet_size_mb, 2),
        "duration_sec": round(duration, 3),
        "throughput_mb_s": round(throughput_mb_s, 2),
        "peak_mem_delta_mb": round(peak_mem_delta, 2),
        "rows": result.result.get("rows"),
        "cols": result.result.get("cols"),
        "target_column": result.result.get("target_column"),
        "engine": engine_cls.__name__
    }


def main():
    print("=" * 80)
    print("  AGENTIX 500 MB DATA INGESTION SCALABILITY BENCHMARK SUITE")
    print("=" * 80)
    
    results: List[Dict[str, Any]] = []
    
    # 1. Existing Production Datasets Benchmark
    prod_files = [
        Path("backend/data/temp/aa574443-44c9-4950-a430-5bf4d3f1bd7a_movies_entertainment_analytics.json"),
        Path("backend/data/temp/1a4e04f3-ed7c-4736-b51f-dc20c076ec23_Online_Retail.xlsx"),
    ]
    for pf in prod_files:
        if pf.exists():
            print(f"\n[Benchmarking Production Dataset] {pf.name} ({pf.stat().st_size / (1024*1024):.2f} MB)...")
            res = run_single_benchmark(pf, engine_cls=ChunkedPandasEngine)
            results.append(res)
            print(f"  -> Duration: {res['duration_sec']}s | Throughput: {res['throughput_mb_s']} MB/s | Peak RAM delta: {res['peak_mem_delta_mb']} MB")

    # 2. Scaled CSV Benchmarks: 10MB, 50MB, 100MB, 250MB, 500MB
    csv_sizes = [10, 50, 100, 250, 500]
    for size_mb in csv_sizes:
        csv_file = BENCH_DIR / f"synthetic_bench_{size_mb}MB.csv"
        print(f"\n[Generating Synthetic CSV] {size_mb} MB...")
        generate_benchmark_csv(csv_file, size_mb)
        print(f"[Benchmarking CSV] {size_mb} MB...")
        res = run_single_benchmark(csv_file, engine_cls=ChunkedPandasEngine)
        results.append(res)
        print(f"  -> Rows: {res['rows']:,} | Duration: {res['duration_sec']}s | Throughput: {res['throughput_mb_s']} MB/s | Peak RAM delta: {res['peak_mem_delta_mb']} MB | Parquet: {res['parquet_size_mb']} MB")
        # Cleanup input and output
        csv_file.unlink(missing_ok=True)
        Path(f"{csv_file}.parquet").unlink(missing_ok=True)

    # 3. Scaled JSON Lines Benchmarks: 10MB, 50MB, 100MB, 250MB, 500MB
    json_sizes = [10, 50, 100, 250, 500]
    for size_mb in json_sizes:
        json_file = BENCH_DIR / f"synthetic_bench_{size_mb}MB.jsonl"
        print(f"\n[Generating Synthetic JSONL] {size_mb} MB...")
        generate_benchmark_jsonl(json_file, size_mb)
        print(f"[Benchmarking JSONL] {size_mb} MB...")
        res = run_single_benchmark(json_file, engine_cls=ChunkedPandasEngine)
        results.append(res)
        print(f"  -> Rows: {res['rows']:,} | Duration: {res['duration_sec']}s | Throughput: {res['throughput_mb_s']} MB/s | Peak RAM delta: {res['peak_mem_delta_mb']} MB | Parquet: {res['parquet_size_mb']} MB")
        json_file.unlink(missing_ok=True)
        Path(f"{json_file}.parquet").unlink(missing_ok=True)

    # 4. Scaled XLSX Benchmarks: 10,000 rows, 50,000 rows, 250,000 rows
    xlsx_row_counts = [25000, 100000]
    for rows in xlsx_row_counts:
        xlsx_file = BENCH_DIR / f"synthetic_bench_{rows}_rows.xlsx"
        print(f"\n[Generating Synthetic XLSX] {rows:,} rows...")
        generate_benchmark_xlsx(xlsx_file, rows)
        print(f"[Benchmarking XLSX] {xlsx_file.stat().st_size / (1024*1024):.2f} MB ({rows:,} rows)...")
        res = run_single_benchmark(xlsx_file, engine_cls=ChunkedPandasEngine)
        results.append(res)
        print(f"  -> Rows: {res['rows']:,} | Duration: {res['duration_sec']}s | Throughput: {res['throughput_mb_s']} MB/s | Peak RAM delta: {res['peak_mem_delta_mb']} MB")
        xlsx_file.unlink(missing_ok=True)
        Path(f"{xlsx_file}.parquet").unlink(missing_ok=True)

    # Save summary report JSON
    summary_path = Path("AUDIT/benchmark_results.json")
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(results, indent=2))
    print(f"\nBenchmark results saved to {summary_path}")


if __name__ == "__main__":
    main()
