# Agentix — Institutional Test Data Suite (.CSV, .XLSX, .JSON)

**Directory:** `test_data/` (also mirrored in `examples/datasets/`)  
**Supported Formats:** `.csv`, `.xlsx` (Excel OpenXML Multi-Sheet), `.json` (Structured JSON Arrays)  
**Purpose:** Versatile, authentic benchmark datasets covering Financial Services, Healthcare & Clinical Research, Enterprise SaaS Operations, Supply Chain Logistics, Higher Education, Cybersecurity, and Media Analytics.

---

## Complete Multi-Format Portfolio (14 Datasets)

---

## High-Volume Showcase Portfolio (High-MB Datasets)

Engineered specifically for stress-testing and showcasing Agentix's high-throughput chunked ingestion (`ChunkedPandasEngine`), zero-RAM streaming profiling (`ProfilingAgent`), leak-free AutoML cross-validation, and Apache Parquet compression:

| Dataset File | Format | File Size | Records | Attributes | Domain & Target Variable | Recommended Showcase Scenario |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`global_supply_chain_logistics_5MB.xlsx`** | `.xlsx` | **4.61 MB** | 95,000 | 10 cols | Global Logistics • Target: `delivery_status` | Multi-MB Excel parsing stress-test; multi-class delivery delay modeling. |
| **`global_e_commerce_transactions_20MB.csv`** | `.csv` | **15.72 MB** | 161,319 | 14 cols | Retail E-Commerce • Target: `is_high_value_order` | High-speed tabular ingestion; customer purchasing & discount EDA. |
| **`healthcare_patient_outcomes_30MB.csv`** | `.csv` | **19.72 MB** | 251,658 | 16 cols | Clinical Inpatient Care • Target: `readmitted_30_days` | Binary readmission risk classification; feature importance & TreeSHAP XAI. |
| **`nyc_yellow_taxi_sample_25MB.csv`** | `.csv` | **20.11 MB** | 200,000 | 19 cols | Urban Mobility (Real NYC TLC) • Target: `total_amount` | Real-world continuous regression; passenger count & fare correlation. |
| **`enterprise_cloud_telemetry_15MB.json`** | `.json` | **24.12 MB** | 60,494 | 12 keys | Distributed Systems Observability • `health_status` | High-volume JSON array parsing; system anomaly classification. |
| **`financial_fraud_detection_50MB.csv`** | `.csv` | **39.28 MB** | 436,906 | 13 cols | Banking & FinTech Fraud • Target: `is_fraudulent` | Class imbalance handling; credit card fraud probability modeling. |
| **`nyc_yellow_taxi_2024_48MB.parquet`** | `.parquet` | **47.65 MB** | 2,964,624 | 19 cols | NYC TLC Production Lake • Target: `fare_amount` | Sub-second ingestion of ~3M rows via native Apache Parquet engine. |
| **`telecom_customer_churn_100MB.csv`** | `.csv` | **71.99 MB** | 748,982 | 16 cols | Telecom Enterprise Subscriptions • Target: `churn_label` | Large-scale (~750K rows) churn prediction, 5-fold CV & report generation. |


| Dataset File | Format | Institutional Domain | Records | Dimensions / Sheets | Target Variable | Problem Type |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`institutional_financial_portfolio.xlsx`** | `.xlsx` | Banking & Investment Asset Management | 2,660 | 3 Sheets (Holdings, Financials, Risk) | `risk_tier` / `default_prob` | Multi-Class / Regression |
| **`hospital_clinical_operations.xlsx`** | `.xlsx` | Hospital Inpatient & Emergency Flow | 4,000 | 2 Sheets (Inpatients, ED Shifts) | `readmitted_30d` | Binary Classification |
| **`global_supply_chain_logistics.xlsx`** | `.xlsx` | Global Supply Chain & Freight Logistics | 3,500 | 1 Sheet (Shipments) | `delivery_status` | Binary Classification |
| **`enterprise_cloud_telemetry.json`** | `.json` | Cloud Microservices & Observability | 1,500 | 11 attributes | `anomaly_detected` | Binary Classification |
| **`cybersecurity_threat_incidents.json`** | `.json` | Security Operations Center (SOC) Logs | 1,200 | 8 attributes | `incident_contained` | Binary Classification |
| **`higher_ed_admissions_decisions.json`** | `.json` | University Admissions Selection Pool | 2,000 | 8 attributes | `admitted` | Binary Classification |
| **`movies_entertainment_analytics.json`** | `.json` | Media Entertainment & Box Office ROI | 3,201 | 16 attributes | `Worldwide_Gross` | Continuous Regression |
| **`enterprise_saas_churn.csv`** | `.csv` | Enterprise SaaS & Telecom Retention | 7,043 | 21 attributes | `Churn` | Binary Classification |
| **`financial_credit_risk.csv`** | `.csv` | Banking & Credit Risk Underwriting | 4,446 | 27 attributes | `Status` | Binary Classification |
| **`healthcare_insurance_costs.csv`** | `.csv` | Healthcare Actuarial & Medical Costs | 1,338 | 7 attributes | `charges` | Continuous Regression |
| **`higher_ed_student_retention.csv`** | `.csv` | Higher Education Academic Retention | 395 | 33 attributes | `G3` | Regression / Performance |
| **`california_asset_valuation.csv`** | `.csv` | Real Estate Asset Valuation | 20,640 | 10 attributes | `median_house_value` | Continuous Regression |
| **`clinical_oncology_biomarkers.csv`** | `.csv` | Clinical Diagnostics & Biopsy Biomarkers | 569 | 31 attributes | `target` (0/1) | Binary Classification |
| **`clinical_diabetes_progression.csv`**| `.csv` | Metabolic Disorders & Clinical Research | 442 | 11 attributes | `target` | Continuous Regression |

---

## 1. Excel Workbook Datasets (`.xlsx`)

### `institutional_financial_portfolio.xlsx`
- **Format:** Microsoft Excel OpenXML (`.xlsx`) with multiple sheets.
- **Sheets Included:**
  1. `Portfolio_Holdings` (2,500 rows): Individual equity, debt, bond, and commodity holdings with `market_value_usd`, `purchase_cost_usd`, `unrealized_gain_loss`, `duration_years`, `beta`, `credit_rating`, and `risk_tier`.
  2. `Quarterly_Financials` (40 rows): Historical quarterly corporate performance (`revenue_usd_m`, `ebitda_usd_m`, `free_cash_flow_usd_m`, `debt_to_equity_ratio`).
  3. `Counterparty_Credit_Risk` (120 rows): Financial counterparty credit exposure, jurisdiction, default probabilities, and stress-test results.
- **Sample Conversational Prompts for Agent Console (`/agent-console`):**
  - *"Analyze the credit rating distribution across our portfolio holdings and identify high-duration exposure."*
  - *"Which counterparty institutions failed the 1-year default stress test?"*
  - *"Summarize the quarterly EBITDA margin trajectory from 2015 to 2024."*

### `hospital_clinical_operations.xlsx`
- **Format:** Multi-sheet Excel workbook.
- **Sheets Included:**
  1. `Inpatient_Admissions` (3,000 rows): Patient demographics, admission type (Emergency, Elective, Urgent), department, Charlson comorbidity index, length of stay, total hospital cost, and 30-day readmission status.
  2. `Emergency_Department_Flow` (1,000 rows): Daily hospital shift metrics, mean triage acuity, wait time minutes, bed occupancy %, and ambulance diversion hours.
- **Sample Conversational Prompts:**
  - *"What are the primary predictors of 30-day patient readmissions across departments?"*
  - *"How does Emergency Department bed occupancy correlate with ambulance diversion hours?"*

### `global_supply_chain_logistics.xlsx`
- **Format:** Single-sheet Excel workbook with 3,500 global freight records.
- **Features:** Origin country, destination market, shipping mode (Air Express, Ocean Container, Rail, Road), freight cost, transit days, customs clearance delay hours, carrier rating, carbon emissions, and delivery status ("On-Time" vs "Delayed").
- **Sample Conversational Prompts:**
  - *"Which shipping modes and origin countries experience the longest customs clearance delays?"*
  - *"Evaluate the cost-versus-speed tradeoff between Air Express and Ocean freight."*

---

## 2. Structured JSON Datasets (`.json`)

### `enterprise_cloud_telemetry.json`
- **Format:** JSON array containing 1,500 microservice request telemetry objects.
- **Attributes:** `request_id`, `timestamp`, `service_name`, `endpoint`, `http_status`, `latency_ms`, `cpu_utilization_pct`, `memory_mb`, `tenant_id`, `geo_region`, `anomaly_detected`.
- **Institutional Use Case:** DevOps & Site Reliability Engineering (SRE) root-cause analysis and infrastructure anomaly detection.
- **Sample Conversational Prompts:**
  - *"Which microservice generates the highest rate of 500-series server errors?"*
  - *"What are the CPU and memory thresholds where latency spikes above 800ms?"*

### `cybersecurity_threat_incidents.json`
- **Format:** JSON array of 1,200 Security Operations Center (SOC) incident records.
- **Attributes:** `incident_id`, `timestamp`, `attack_vector` (Brute Force, SQL Injection, Privilege Escalation, ChatML Delimiter Injection), `severity_level`, `source_reputation_score`, `failed_auth_attempts`, `destination_port`, `payload_entropy`, `incident_contained`.
- **Sample Conversational Prompts:**
  - *"Summarize the frequency of ChatML delimiter injection attempts compared to traditional SQL injection."*
  - *"What correlation exists between payload entropy, failed auth attempts, and breach containment?"*

### `higher_ed_admissions_decisions.json`
- **Format:** JSON array containing 2,000 undergraduate university applicant records.
- **Attributes:** `applicant_id`, `gpa_unweighted`, `sat_composite`, `ap_courses_count`, `first_generation`, `extracurricular_score`, `intended_major`, `admitted`.
- **Sample Conversational Prompts:**
  - *"What is the admission probability curve across SAT composite and unweighted GPA bands?"*
  - *"Analyze the acceptance rate of first-generation college applicants across academic majors."*

### `movies_entertainment_analytics.json`
- **Format:** Authentic download from Vega datasets repository (3,201 records).
- **Attributes:** `Title`, `US_Gross`, `Worldwide_Gross`, `Production_Budget`, `Release_Date`, `MPAA_Rating`, `Major_Genre`, `Creative_Type`, `Rotten_Tomatoes_Rating`, `IMDB_Rating`, `IMDB_Votes`.
- **Sample Conversational Prompts:**
  - *"What is the statistical correlation between production budget and worldwide gross revenue?"*
  - *"Which movie genres achieve the highest return on investment (Worldwide Gross / Production Budget)?"*

---

## 3. Delimited CSV Datasets (`.csv`)

- **`enterprise_saas_churn.csv`** (7,043 rows): Subscription SaaS customer churn prediction with tenure, monthly fees, and contract tiers.
- **`financial_credit_risk.csv`** (4,446 rows): Commercial banking loan default risk modeling.
- **`healthcare_insurance_costs.csv`** (1,338 rows): Medical expenditure regression modeling with strong positive skewness.
- **`higher_ed_student_retention.csv`** (395 rows): Student academic performance and dropout warning indicators.
- **`california_asset_valuation.csv`** (20,640 rows): 1990 US Census housing value continuous regression.
- **`clinical_oncology_biomarkers.csv`** (569 rows): Wisconsin Breast Cancer FNA biopsy diagnostic classification.
- **`clinical_diabetes_progression.csv`** (442 rows): Endocrinology quantitative disease progression scores.

---

## Loading Any Dataset into Agentix

### Via Web Interface (Data Dock)
1. Open [http://localhost:3000](http://localhost:3000) and sign in.
2. Navigate to **Data Dock** (`/data-dock`).
3. Drag and drop any `.csv`, `.xlsx`, or `.json` file from `test_data/` into the upload container.
4. Click **Start Workflow** to execute the autonomous 9-stage pipeline.
5. Query the findings in the **Agent Console** (`/agent-console`).

### Via Direct Python / Backend Engine
```python
from core.engines.base import PandasEngine

engine = PandasEngine()

# Automatically handles CSV, XLSX, or JSON
df_excel = engine.load_dataset("test_data/institutional_financial_portfolio.xlsx")
df_json  = engine.load_dataset("test_data/enterprise_cloud_telemetry.json")
df_csv   = engine.load_dataset("test_data/enterprise_saas_churn.csv")
```
