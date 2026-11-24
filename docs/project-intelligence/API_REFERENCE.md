# Agentix — API Reference & Endpoint Specification

**Document Version: 2.4.0**  
**Classification: Verified REST & JSON-RPC Specification**  
**Base URL:** `http://localhost:8000/api/v1` (Local) / `/api/v1` (Cloud)

---

## 1. System & Health Probes (`/system`)

### `GET /system/health`
- **Description:** General liveness and readiness probe for container orchestrators (Kubernetes / Docker).
- **Authentication:** Public (No authentication required).
- **Required Role:** Any.
- **Response Schema:**
  ```json
  {
    "status": "ok",
    "message": "Agentix API is healthy"
  }
  ```
- **Error Codes:** None.
- **Source File:** `backend/core/api/v1/routes_system.py`
- **Status:** **Verified**.

### `GET /system/liveness`
- **Description:** Kubernetes liveness probe checking basic process responsiveness.
- **Authentication:** Public.
- **Response Schema:** `{"status": "alive"}`
- **Source File:** `backend/core/api/v1/routes_system.py`
- **Status:** **Verified**.

### `GET /system/readiness`
- **Description:** Kubernetes readiness probe verifying database connectivity and filesystem accessibility.
- **Authentication:** Public.
- **Response Schema:** `{"status": "ready"}`
- **Source File:** `backend/core/api/v1/routes_system.py`
- **Status:** **Verified**.

---

## 2. Authentication & Authorization (`/auth`)

### `POST /auth/register`
- **Description:** Registers a new user account with hashed password storage (BCrypt cost-factor 12).
- **Authentication:** Public.
- **Security Control:** Mass-assignment protection: forces `role = "user"` regardless of request payload.
- **Request Schema:**
  ```json
  {
    "email": "analyst@institution.edu",
    "password": "StrongPassword123!"
  }
  ```
- **Response Schema:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": "usr-123",
    "role": "user"
  }
  ```
- **Error Codes:** `400 Bad Request` (Email already registered).
- **Source File:** `backend/core/api/v1/routes_auth.py`
- **Status:** **Verified**.

### `POST /auth/login`
- **Description:** Authenticates user credentials and returns a signed HMAC SHA-256 JWT access token.
- **Authentication:** Public.
- **Request Schema:** `OAuth2PasswordRequestForm` (`username` = email, `password`).
- **Response Schema:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": "usr-123",
    "role": "admin"
  }
  ```
- **Error Codes:** `401 Unauthorized` (Invalid email or password).
- **Source File:** `backend/core/api/v1/routes_auth.py`
- **Status:** **Verified**.

### `POST /auth/oauth/introspect`
- **Description:** RFC 7662-compliant token introspection endpoint for downstream microservices and gateways.
- **Authentication:** Public / Internal Gateway.
- **Request Schema:** `{"token": "string"}`
- **Response Schema:**
  ```json
  {
    "active": true,
    "sub": "usr-123",
    "role": "data_scientist",
    "tenant_id": "default",
    "scope": "DATASET_READ DATASET_WRITE MODEL_TRAIN",
    "permissions": ["DATASET_READ", "DATASET_WRITE", "MODEL_TRAIN"],
    "exp": 1735689600
  }
  ```
- **Error Codes:** None (`active: false` on invalid/expired tokens).
- **Source File:** `backend/core/api/v1/routes_auth.py`
- **Status:** **Verified**.

---

## 3. Dataset Management (`/dataset`)

### `POST /dataset/upload/init`
- **Description:** Initializes a chunked dataset upload session.
- **Authentication:** Bearer JWT required.
- **Required Permission:** `DATASET_WRITE`
- **Request Schema:**
  ```json
  {
    "filename": "sales_q3.csv",
    "total_size": 15482000,
    "total_chunks": 8
  }
  ```
- **Response Schema:**
  ```json
  {
    "session_id": "upl-98a72b",
    "chunk_size": 2097152
  }
  ```
- **Source File:** `backend/core/api/v1/routes_data.py`
- **Status:** **Verified**.

### `POST /dataset/upload/chunk`
- **Description:** Receives binary chunk and verifies integrity.
- **Authentication:** Bearer JWT required.
- **Required Permission:** `DATASET_WRITE`
- **Source File:** `backend/core/api/v1/routes_data.py`
- **Status:** **Verified**.

### `POST /dataset/upload/complete`
- **Description:** Merges uploaded chunks, runs `ParserAgent` to convert CSV to Parquet, locks the target variable, and indexes metadata.
- **Authentication:** Bearer JWT required.
- **Required Permission:** `DATASET_WRITE`
- **Source File:** `backend/core/api/v1/routes_data.py`
- **Status:** **Verified**.

---

## 4. Analytical Platform Capabilities (`/platform`)

### `POST /platform/chat`
- **Description:** Master conversational AI assistant endpoint executing through the 8-layer AI security enclave.
- **Authentication:** Bearer JWT required.
- **Required Permission:** `DATASET_READ`
- **Request Schema:**
  ```json
  {
    "query": "Explain why customer churn increased in Q3",
    "dataset_name": "sales_q3.csv"
  }
  ```
- **Response Schema:**
  ```json
  {
    "status": "success",
    "response": "Analysis of sales_q3.csv shows churn concentrated in contract tiers < 6 months...",
    "telemetry": {
      "model": "researcher-m4:latest",
      "latency_ms": 1420.5,
      "exact_cache_hit": false,
      "faithfulness_score": 0.948,
      "guardrails": {
        "is_safe": true,
        "pii_redacted": 0,
        "jailbreak_detected": false
      }
    }
  }
  ```
- **Source File:** `backend/core/api/v1/routes_platform.py`
- **Status:** **Verified**.

### `POST /platform/start-workflow`
- **Description:** Triggers asynchronous execution of the 9-stage reversible analytical pipeline.
- **Authentication:** Bearer JWT required.
- **Required Permission:** `MODEL_TRAIN`
- **Source File:** `backend/core/api/v1/routes_platform.py`
- **Status:** **Verified**.

### `GET /platform/workflow-status`
- **Description:** Streams live execution progress and stage outcomes across all 9 agents.
- **Authentication:** Bearer JWT required.
- **Source File:** `backend/core/api/v1/routes_platform.py`
- **Status:** **Verified**.

### `GET /platform/mcp/tools`
- **Description:** Lists all available governed Model Context Protocol tools, their risk tiers, and JSON-RPC input schemas.
- **Authentication:** Bearer JWT required.
- **Source File:** `backend/core/api/v1/routes_platform.py`
- **Status:** **Verified**.

### `POST /platform/mcp/execute`
- **Description:** Executes a governed MCP tool after enforcing input schema validation and caller RBAC permissions.
- **Authentication:** Bearer JWT required.
- **Request Schema:**
  ```json
  {
    "tool_name": "get_dataset_profile",
    "arguments": {
      "dataset_name": "sales_q3.csv"
    }
  }
  ```
- **Source File:** `backend/core/api/v1/routes_platform.py`
- **Status:** **Verified**.

### `GET /platform/ai/cache/metrics`
- **Description:** Retrieves real-time cache telemetry: total hits, misses, hit ratio, and estimated GPU compute latency saved.
- **Authentication:** Bearer JWT required.
- **Source File:** `backend/core/api/v1/routes_platform.py`
- **Status:** **Verified**.

### `POST /platform/ai/evaluations/run`
- **Description:** Computes factual faithfulness, relevancy, and context recall scores for a model response against reference context.
- **Authentication:** Bearer JWT required.
- **Source File:** `backend/core/api/v1/routes_platform.py`
- **Status:** **Verified**.
