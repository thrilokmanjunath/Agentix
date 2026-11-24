import os
import sys
import time
import json
import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)

TEST_DATA_DIR = Path("test_data")
EXAMPLES_DIR = Path("examples/datasets")
TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)
EXAMPLES_DIR.mkdir(parents=True, exist_ok=True)


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def generate_ecommerce_dataset(target_mb: int = 20):
    """Generates a realistic e-commerce transactions dataset (~20MB)."""
    filename = f"global_e_commerce_transactions_{target_mb}MB.csv"
    out_path = TEST_DATA_DIR / filename
    log(f"Generating {filename} (~{target_mb} MB)...")

    # Approx 130 bytes per row -> ~160,000 rows for 20MB
    n_rows = int(target_mb * 1024 * 1024 / 130)

    categories = ["Consumer Electronics", "Apparel & Footwear", "Home & Kitchen", "Office Supplies", "Health & Beauty", "Cloud Software"]
    regions = ["North America", "EMEA", "Asia-Pacific", "Latin America", "Middle East"]
    payment_methods = ["Credit Card", "PayPal", "Bank Wire", "Apple Pay", "Debit Card"]
    customer_segments = ["Enterprise", "Mid-Market", "SMB", "Consumer Direct"]

    cat_choice = np.random.choice(categories, size=n_rows)
    reg_choice = np.random.choice(regions, size=n_rows)
    pay_choice = np.random.choice(payment_methods, size=n_rows)
    seg_choice = np.random.choice(customer_segments, size=n_rows)

    quantities = np.random.randint(1, 15, size=n_rows)
    base_prices = np.random.uniform(15.0, 850.0, size=n_rows).round(2)
    discounts = np.random.choice([0.0, 0.05, 0.10, 0.15, 0.20, 0.30], size=n_rows)
    shipping_days = np.random.poisson(lam=3.5, size=n_rows) + 1
    satisfaction = np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.08, 0.22, 0.40, 0.25], size=n_rows)

    total_amount = (quantities * base_prices * (1.0 - discounts)).round(2)
    # Target: High-value repeat order
    is_high_value = ((total_amount > 250) & (satisfaction >= 4)).astype(int)

    df = pd.DataFrame({
        "transaction_id": [f"TRX-{i:08d}" for i in range(1, n_rows + 1)],
        "customer_id": [f"CUST-{np.random.randint(10000, 99999)}" for _ in range(n_rows)],
        "customer_segment": seg_choice,
        "region": reg_choice,
        "product_category": cat_choice,
        "quantity": quantities,
        "unit_price_usd": base_prices,
        "discount_applied": discounts,
        "total_amount_usd": total_amount,
        "payment_method": pay_choice,
        "shipping_duration_days": shipping_days,
        "customer_satisfaction": satisfaction,
        "is_return_requested": np.random.choice([0, 1], p=[0.93, 0.07], size=n_rows),
        "is_high_value_order": is_high_value
    })

    df.to_csv(out_path, index=False)
    actual_mb = out_path.stat().st_size / (1024 * 1024)
    log(f"-> Created {out_path} ({actual_mb:.2f} MB, {n_rows:,} rows)")
    return out_path


def generate_healthcare_dataset(target_mb: int = 30):
    """Generates a clinical outcomes and hospital readmission dataset (~30MB)."""
    filename = f"healthcare_patient_outcomes_{target_mb}MB.csv"
    out_path = TEST_DATA_DIR / filename
    log(f"Generating {filename} (~{target_mb} MB)...")

    # Approx 125 bytes per row -> ~250,000 rows for 30MB
    n_rows = int(target_mb * 1024 * 1024 / 125)

    age = np.random.normal(58, 16, size=n_rows).clip(18, 95).astype(int)
    gender = np.random.choice(["Male", "Female"], size=n_rows)
    admission_types = ["Emergency", "Elective", "Urgent", "Trauma"]
    departments = ["Cardiology", "Neurology", "Oncology", "Orthopedics", "Pulmonology", "General Surgery"]

    bmi = np.random.normal(27.8, 5.2, size=n_rows).clip(15.0, 52.0).round(1)
    systolic_bp = np.random.normal(132, 18, size=n_rows).clip(85, 210).astype(int)
    diastolic_bp = (systolic_bp * 0.65 + np.random.normal(0, 5, size=n_rows)).clip(50, 120).astype(int)
    glucose_mg_dl = np.random.lognormal(4.7, 0.35, size=n_rows).clip(60, 450).round(1)
    cholesterol_mg_dl = np.random.normal(205, 38, size=n_rows).clip(110, 390).astype(int)
    length_of_stay_days = np.random.poisson(lam=4.2, size=n_rows).clip(1, 45)
    num_procedures = np.random.poisson(lam=1.8, size=n_rows).clip(0, 8)
    num_medications = np.random.poisson(lam=6.5, size=n_rows).clip(1, 24)

    # 30-day readmission probability influenced by age, length of stay, and glucose
    risk_score = (0.015 * age + 0.04 * length_of_stay_days + 0.003 * glucose_mg_dl + 0.05 * num_procedures - 2.8)
    readmit_prob = 1.0 / (1.0 + np.exp(-risk_score))
    readmitted = (np.random.uniform(0, 1, size=n_rows) < readmit_prob).astype(int)

    df = pd.DataFrame({
        "patient_id": [f"PAT-{i:07d}" for i in range(1, n_rows + 1)],
        "age": age,
        "gender": gender,
        "admission_type": np.random.choice(admission_types, size=n_rows),
        "department": np.random.choice(departments, size=n_rows),
        "body_mass_index": bmi,
        "systolic_bp": systolic_bp,
        "diastolic_bp": diastolic_bp,
        "blood_glucose": glucose_mg_dl,
        "serum_cholesterol": cholesterol_mg_dl,
        "length_of_stay_days": length_of_stay_days,
        "procedures_performed": num_procedures,
        "prescribed_medications": num_medications,
        "insurance_provider": np.random.choice(["Medicare", "Medicaid", "BlueCross", "UnitedHealth", "Aetna"], size=n_rows),
        "emergency_admission": np.random.choice([0, 1], p=[0.42, 0.58], size=n_rows),
        "readmitted_30_days": readmitted
    })

    df.to_csv(out_path, index=False)
    actual_mb = out_path.stat().st_size / (1024 * 1024)
    log(f"-> Created {out_path} ({actual_mb:.2f} MB, {n_rows:,} rows)")
    return out_path


def generate_fraud_dataset(target_mb: int = 50):
    """Generates an institutional financial fraud detection dataset (~50MB)."""
    filename = f"financial_fraud_detection_{target_mb}MB.csv"
    out_path = TEST_DATA_DIR / filename
    log(f"Generating {filename} (~{target_mb} MB)...")

    # Approx 120 bytes per row -> ~430,000 rows for 50MB
    n_rows = int(target_mb * 1024 * 1024 / 120)

    amounts = np.random.exponential(scale=75.0, size=n_rows).clip(1.0, 15000.0).round(2)
    card_types = ["Visa Signature", "Mastercard Platinum", "Amex Corporate", "Discover Cash"]
    merchant_categories = ["E-Commerce", "Grocery", "Airlines & Travel", "Cryptocurrency Exchange", "Gas Station", "Luxury Goods", "Streaming Services"]
    device_types = ["iOS App", "Android App", "Web Desktop", "Web Mobile", "POS Terminal"]

    merchant_choice = np.random.choice(merchant_categories, size=n_rows)
    card_choice = np.random.choice(card_types, size=n_rows)
    device_choice = np.random.choice(device_types, size=n_rows)

    distance_from_home_km = np.random.exponential(scale=18.0, size=n_rows).round(1)
    velocity_24h = np.random.poisson(lam=2.8, size=n_rows)
    is_international = np.random.choice([0, 1], p=[0.92, 0.08], size=n_rows)
    cvv_matched = np.random.choice([1, 0], p=[0.97, 0.03], size=n_rows)
    risk_score = np.random.beta(a=2, b=12, size=n_rows).round(4)

    # Fraud label condition: high amount, international, or high risk score
    fraud_prob = 0.02 + 0.15 * is_international + 0.35 * (amounts > 1500) + 0.40 * (1 - cvv_matched)
    fraud_prob = fraud_prob.clip(0.005, 0.95)
    is_fraud = (np.random.uniform(0, 1, size=n_rows) < fraud_prob).astype(int)

    df = pd.DataFrame({
        "transaction_uuid": [f"TX-{i:09d}" for i in range(1, n_rows + 1)],
        "account_id": [f"ACC-{np.random.randint(100000, 999999)}" for _ in range(n_rows)],
        "card_type": card_choice,
        "merchant_category": merchant_choice,
        "transaction_amount_usd": amounts,
        "distance_from_home_km": distance_from_home_km,
        "transactions_last_24h": velocity_24h,
        "device_channel": device_choice,
        "is_international_charge": is_international,
        "cvv_matched": cvv_matched,
        "ml_risk_rating": risk_score,
        "hour_of_day": np.random.randint(0, 24, size=n_rows),
        "is_fraudulent": is_fraud
    })

    df.to_csv(out_path, index=False)
    actual_mb = out_path.stat().st_size / (1024 * 1024)
    log(f"-> Created {out_path} ({actual_mb:.2f} MB, {n_rows:,} rows)")
    return out_path


def generate_telecom_churn_dataset(target_mb: int = 100):
    """Generates an enterprise telecom subscriber churn dataset (~100MB)."""
    filename = f"telecom_customer_churn_{target_mb}MB.csv"
    out_path = TEST_DATA_DIR / filename
    log(f"Generating {filename} (~{target_mb} MB)...")

    # Approx 140 bytes per row -> ~750,000 rows for 100MB
    n_rows = int(target_mb * 1024 * 1024 / 140)

    plans = ["Unlimited 5G Max", "Standard Prepaid", "Family Shared 4G", "Business Fiber Pro", "Starter 10GB"]
    contracts = ["Month-to-month", "One year", "Two year"]
    payments = ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"]

    tenure_months = np.random.exponential(scale=24.0, size=n_rows).clip(1, 72).astype(int)
    monthly_data_gb = np.random.normal(32.5, 14.0, size=n_rows).clip(0.5, 120.0).round(1)
    call_duration_mins = np.random.normal(480, 180, size=n_rows).clip(15, 1800).astype(int)
    dropped_calls = np.random.poisson(lam=1.2, size=n_rows).clip(0, 15)
    cs_calls = np.random.poisson(lam=1.5, size=n_rows).clip(0, 12)
    monthly_charges = np.random.normal(68.5, 22.0, size=n_rows).clip(18.0, 160.0).round(2)
    total_charges = (monthly_charges * tenure_months + np.random.normal(0, 25, size=n_rows)).clip(20.0, 12000.0).round(2)

    # Churn probability calculation
    contract_choice = np.random.choice(contracts, p=[0.55, 0.25, 0.20], size=n_rows)
    churn_prob = (0.35 * (contract_choice == "Month-to-month") + 
                  0.08 * (cs_calls > 3) + 
                  0.05 * (monthly_charges > 85) - 
                  0.005 * tenure_months).clip(0.04, 0.88)
    churn = (np.random.uniform(0, 1, size=n_rows) < churn_prob).astype(int)

    df = pd.DataFrame({
        "subscriber_id": [f"SUB-{i:08d}" for i in range(1, n_rows + 1)],
        "subscription_plan": np.random.choice(plans, size=n_rows),
        "tenure_months": tenure_months,
        "contract_type": contract_choice,
        "paperless_billing": np.random.choice([1, 0], p=[0.60, 0.40], size=n_rows),
        "payment_method": np.random.choice(payments, size=n_rows),
        "monthly_data_usage_gb": monthly_data_gb,
        "voice_minutes_used": call_duration_mins,
        "dropped_calls_count": dropped_calls,
        "customer_service_calls": cs_calls,
        "streaming_tv_addon": np.random.choice([1, 0], size=n_rows),
        "device_protection_plan": np.random.choice([1, 0], size=n_rows),
        "monthly_charge_usd": monthly_charges,
        "total_lifetime_spend_usd": total_charges,
        "senior_citizen_discount": np.random.choice([1, 0], p=[0.16, 0.84], size=n_rows),
        "churn_label": churn
    })

    df.to_csv(out_path, index=False)
    actual_mb = out_path.stat().st_size / (1024 * 1024)
    log(f"-> Created {out_path} ({actual_mb:.2f} MB, {n_rows:,} rows)")
    return out_path


def generate_cloud_telemetry_json(target_mb: int = 15):
    """Generates enterprise distributed cloud telemetry JSON logs (~15MB)."""
    filename = f"enterprise_cloud_telemetry_{target_mb}MB.json"
    out_path = TEST_DATA_DIR / filename
    log(f"Generating {filename} (~{target_mb} MB)...")

    # Approx 260 bytes per JSON record -> ~60,000 records for 15MB
    n_records = int(target_mb * 1024 * 1024 / 260)

    clusters = ["us-east-prod-01", "us-west-compute-02", "eu-central-lake-01", "ap-southeast-api-03"]
    services = ["fastapi-gateway", "auth-session-manager", "ml-inference-worker", "parquet-ingestion-node", "redis-cache-tier"]

    records = []
    base_timestamp = int(time.time()) - (n_records * 2)

    for i in range(n_records):
        records.append({
            "trace_id": f"trc-{i:09d}",
            "timestamp_epoch": base_timestamp + (i * 2),
            "cluster_id": clusters[i % len(clusters)],
            "service_name": services[i % len(services)],
            "cpu_utilization_pct": round(float(np.random.normal(54, 16)), 2),
            "memory_usage_mb": int(np.random.uniform(512, 16384)),
            "disk_io_read_kbps": round(float(np.random.exponential(1200)), 1),
            "disk_io_write_kbps": round(float(np.random.exponential(850)), 1),
            "network_egress_mbps": round(float(np.random.uniform(5, 450)), 2),
            "http_response_time_ms": round(float(np.random.gamma(shape=2, scale=18)), 2),
            "error_rate_pct": round(float(np.random.exponential(0.35)), 3),
            "health_status": "CRITICAL" if i % 180 == 0 else ("WARNING" if i % 35 == 0 else "HEALTHY")
        })

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    actual_mb = out_path.stat().st_size / (1024 * 1024)
    log(f"-> Created {out_path} ({actual_mb:.2f} MB, {n_records:,} records)")
    return out_path


if __name__ == "__main__":
    t_start = time.time()
    log("Starting showcase dataset generation...")
    
    files = [
        generate_ecommerce_dataset(20),
        generate_healthcare_dataset(30),
        generate_fraud_dataset(50),
        generate_telecom_churn_dataset(100),
        generate_cloud_telemetry_json(15)
    ]

    # Also copy to examples/datasets/
    log("Syncing datasets to examples/datasets/...")
    import shutil
    for f in files:
        shutil.copy2(f, EXAMPLES_DIR / f.name)

    log(f"Showcase dataset suite completed in {time.time() - t_start:.2f} seconds!")
