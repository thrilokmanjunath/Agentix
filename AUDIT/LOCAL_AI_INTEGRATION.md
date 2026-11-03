# Local LLM and Cloud Inference Integration Report

**Integration Date:** November 3, 2026  
**Branch:** `product-transformation`  
**Engineer:** Principal AI Infrastructure & Product Engineer  
**Status:** Operational (Local Inference Verified)  

---

## 1. Executive Summary

The Agentix AI inference subsystem has been transformed into a flexible, multi-provider, privacy-first inference engine. The platform operates independently of mandatory cloud dependencies, prioritizing zero-data-leakage local execution while offering secure server-side cloud fallback when explicitly permitted by institutional policy.

---

## 2. Local Machine Provider Discovery

A live diagnostic scan was performed on the local host environment:

| Provider | Status | Endpoint | Models Detected | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Ollama** | **ACTIVE & RUNNING** | `http://127.0.0.1:11434` | `qwen2.5:3b` (1.9 GB)<br>`researcher-m4:latest` (1.9 GB) | REST API `/api/tags` returned 200 OK; test generation completed in 2.3s. |
| **LM Studio** | Supported (Configured) | `http://127.0.0.1:1234/v1` | Standby | Tested connection timeout handler gracefully handles offline state. |
| **Google Gemini** | Configurable | Server-side REST API | Configurable | Requires `GEMINI_API_KEY` in environment. |
| **OpenAI** | Configurable | Server-side REST API | `gpt-4o-mini` | Requires `OPENAI_API_KEY` in environment. |

---

## 3. Architecture & Operating Modes

The inference engine in `backend/core/services/llm_service.py` implements three distinct operating modes controlled via `AI_INFERENCE_MODE`:

1. **`local` (Default):**
   - Strictly enforces institutional privacy.
   - All external cloud calls are rejected with `LLMUnavailableError("External cloud provider is blocked by institutional local-only policy.")`.
   - Never transmits prompts, tabular data, or conversation turns outside the local machine.
2. **`cloud`:**
   - Routes requests directly to configured cloud providers (Gemini, OpenAI, Anthropic) using server-side keys.
3. **`auto` (Hybrid Fallback):**
   - Attempts local inference first.
   - Only routes to cloud providers if local inference is unavailable **AND** `AI_ALLOW_CLOUD_FALLBACK=true` has been explicitly enabled by the administrator.

---

## 4. Hardware Awareness & Memory Guidance

`ModelRegistry.get_memory_recommendation()` inspects host RAM via `psutil` and provides automatic sizing advisory:
- **Available RAM < 6 GB:** Recommends `<= 3B` quantized parameters (`Qwen2.5-3B`, `Phi-3 Mini`).
- **Available RAM 6–14 GB:** Recommends `7B–8B` parameters (`Qwen2.5-7B`, `Llama 3.1 8B Q4_K_M`).
- **Available RAM > 14 GB:** Recommends `14B–32B` parameters (`Qwen2.5-14B`, `Command-R`).

---

## 5. Security & Defensive Controls

1. **SSRF Prevention:** Local endpoint configuration in `_validate_local_endpoint()` validates hostnames against loopback (`localhost`, `127.0.0.1`, `::1`) and standard private RFC1918 subnets. Prohibits cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).
2. **Credential Isolation:** API keys remain strictly server-side in backend environment configurations. No API key is ever rendered in HTML or returned to client JavaScript in unmasked form.
3. **Prompt Injection Defense:** Queries submitted to `/api/v1/platform/chat` are filtered for override patterns, truncated to 1,000 characters, and dataset context is isolated in `<dataset_context>` XML tags.

---

## 6. Verification Results

Five automated unit and integration tests were executed in `backend/tests/test_ai_integration.py`:
- `test_validate_local_endpoint_blocks_ssrf` (SSRF prevention): **PASS**
- `test_local_only_mode_blocks_cloud_providers` (Policy enforcement): **PASS**
- `test_hardware_memory_recommendations` (Memory guidance): **PASS**
- `test_ollama_discovery_and_generation` (Live local execution): **PASS**
- `test_test_provider_connection_reporting` (Diagnostics): **PASS**
