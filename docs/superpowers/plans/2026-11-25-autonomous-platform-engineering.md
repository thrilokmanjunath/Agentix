# Agentix Autonomous ML & Generative AI Platform Engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Agentix into a production-grade Autonomous ML and Generative AI platform featuring a robust 8-stage deliberation engine, resilient multi-agent orchestration, dynamic model routing, and unified test coverage.

**Architecture:** 
Agentix combines a deterministic Python AutoML and data science engine with a cognitive System-2 Deliberation loop (Perception, Understanding, Hypothesis Generation, Evidence Collection, Alternative Analysis, Confidence Evaluation, Rationale Building, and Decision Verdict). The architecture unifies decoupled asynchronous agents via an event bus with Dead-Letter Queues (DLQ), managed through an adaptive model routing layer with exact-match caching and multi-provider fallbacks.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Presentation & API Gateway"
        UI[Next.js 15 UI / Tauri Desktop] -->|REST / SSE| API[FastAPI Gateway]
        API --> Auth[RBAC & Security Middleware]
    end

    subgraph "Cognitive Deliberation Subsystem (System 2)"
        API --> DelibController[Deliberation Controller]
        DelibController --> S1[1. Perception Stage]
        S1 --> S2[2. Understanding Stage]
        S2 --> S3[3. Hypothesis Generator]
        S3 --> S4[4. Evidence Collector]
        S4 --> S5[5. Alternative Analyzer]
        S5 --> S6[6. Confidence Engine]
        S6 --> S7[7. Rationale Builder]
        S7 --> S8[8. Decision Verdict]
    end

    subgraph "Multi-Agent Orchestration & Bus"
        S8 --> Orch[Pipeline Orchestrator]
        Orch --> MBus[Agent Communication Bus]
        MBus --> Agents[Specialized Pipeline Agents]
        MBus --> DLQ[(Dead Letter Queue)]
        Agents --> AutoML[AutoML Engine (32 Algorithms)]
    end

    subgraph "Model Intelligence & Safety"
        S3 -.-> Router[Dynamic Model Router]
        S7 -.-> Router
        Router --> Cache[(Exact-Match LLM Cache)]
        Router --> Guard[Enterprise Guardrail Engine]
        Router --> Providers[Local Ollama / Gemini / OpenAI / Anthropic]
    end
```

**Tech Stack:** Python 3.12+, FastAPI, Pydantic V2, SQLAlchemy, Scikit-learn, Pytest, LangSmith / OpenTelemetry, Next.js 15, Tauri v2.

**Spec:** `docs/Brain.md`, `docs/Architecture.md`, `docs/StrategyIntelligence.md`, and master directive specifications.

## Global Constraints

- Preserve Agentix's core product identity: Autonomous Data Science & ML Operating System.
- Zero mock replacements for working application code; test external LLMs via deterministic mock adapters only.
- Strict Pydantic V2 compliance and Python 3.12 compatibility.
- Ensure complete tenant isolation and IDOR prevention on all job and data routes.
- Retain local execution isolation (Port 8001 for Agentix Backend, JobPilot on 8000 untouched).
- All tests in `backend/tests/` must collect and pass with 0 errors.

## Review Focus

1. **Deliberation Timeout / Partial Failure:** If an external LLM fails during hypothesis or rationale generation, the deliberation engine must gracefully fall back to deterministic statistical rules without crashing the pipeline.
2. **Cross-Tenant IDOR Infiltration:** Access to job runs, datasets, and execution traces must verify ownership (`owner_id == user_id`) unless the requesting user possesses the `admin` role.
3. **Agent Communication Bus Poison Pills:** Malformed event payloads or throwing handlers must route to the Dead-Letter Queue (DLQ) after 3 retries without blocking other subscribers.
4. **AutoML Feature Drift & Leakage:** Preprocessing pipelines must fit strictly on train splits; held-out test splits must remain untouched until final evaluation.
5. **Exact-Match Cache Eviction & Invalidation:** LLM cache entries must respect TTL and tenant partitioning, preventing cross-tenant prompt leakage.

---

### Task 1: Fix Security Remediation Regression & Modernize Core API Route Handlers

**Files:**
- Modify: `backend/core/api/v1/routes_jobs.py:10-25`
- Test: `backend/tests/test_security_remediation.py`

**Interfaces:**
- Consumes: `core.context.current_user_id`, `core.auth.get_current_user`
- Produces: Safe `routes_jobs.get_job_status` that correctly inspects `current_user` and context variables.

- [ ] **Step 1: Write failing test / verify existing failure**
Run: `backend/.venv/bin/pytest backend/tests/test_security_remediation.py::test_jobs_idor_and_tenant_isolation -v`
Expected: FAIL with `AttributeError: 'Depends' object has no attribute 'id'`

- [ ] **Step 2: Update `get_job_status` in `backend/core/api/v1/routes_jobs.py`**
Inspect whether `current_user` has `id` attribute; fall back to `current_user_id.get()`:
```python
user_id = current_user.id if hasattr(current_user, "id") else (current_user_id.get() or "anonymous")
role = getattr(current_user, "role", "user")
if run.owner_id != user_id and role != "admin":
    raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to access this job.")
```

- [ ] **Step 3: Run test to verify it passes**
Run: `backend/.venv/bin/pytest backend/tests/test_security_remediation.py -v`
Expected: 9 passed in < 1s

- [ ] **Step 4: Commit**
```bash
git add backend/core/api/v1/routes_jobs.py
git commit -m "fix(security): resolve IDOR handler user context evaluation in routes_jobs"
```

---

### Task 2: Implement Multi-Agent Message Bus & Service Registry

**Files:**
- Create: `backend/core/services/agent_communication_bus.py`
- Create: `backend/core/services/agent_registry.py`
- Create: `backend/core/api/v1/routes_agents.py`
- Modify: `backend/core/api/v1/api.py`
- Test: `backend/tests/test_agent_bus.py`, `backend/tests/test_agent_registry.py`

**Interfaces:**
- Consumes: None (independent foundational subsystem)
- Produces: 
  - `MessageBus.subscribe(topic: str, handler: Callable)`
  - `MessageBus.publish(topic: str, payload: dict, source: str) -> None`
  - `MessageBus.get_metrics() -> dict`
  - `AgentRegistry.get_all() -> list[dict]`
  - `AgentRegistry.get_by_id(agent_id: str) -> dict`
  - `AgentRegistry.register(agent_data: dict) -> dict`

- [ ] **Step 1: Verify test failures for missing modules**
Run: `backend/.venv/bin/pytest backend/tests/test_agent_bus.py backend/tests/test_agent_registry.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 2: Implement `MessageBus` with retries & Dead-Letter Queue**
Create `backend/core/services/agent_communication_bus.py`:
- `Event` dataclass (`topic`, `payload`, `source`, `timestamp`)
- `DeadLetterQueue` with `failed_events: list[tuple[Event, Exception]]`
- `MessageBus` with retry counter (max 3), exception handling, and metrics tracking (`success_events`, `failed_events`, `unrouted_events`, `retried_events`).

- [ ] **Step 3: Implement `AgentRegistry` and router `routes_agents.py`**
Create `backend/core/services/agent_registry.py` and seed 11 core agents:
- `Metadata Agent`, `EDA Agent`, `Cleaning Agent`, `Feature Engineering Agent`, `AutoML Agent`, `Model Evaluation Agent`, `Inference Agent`, `Explanation Agent`, `Reporting Agent`, `Privacy Agent`, `Orchestrator Agent`.
Wire `/api/v1/agents/` into `backend/core/api/v1/api.py`.

- [ ] **Step 4: Run tests to verify they pass**
Run: `backend/.venv/bin/pytest backend/tests/test_agent_bus.py backend/tests/test_agent_registry.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**
```bash
git add backend/core/services/agent_communication_bus.py backend/core/services/agent_registry.py backend/core/api/v1/routes_agents.py backend/core/api/v1/api.py
git commit -m "feat(orchestration): implement multi-agent communication bus and agent registry"
```

---

### Task 3: Implement Cognitive Intelligence Services & Harmonize Legacy Suite

**Files:**
- Create: `backend/core/services/domain_detection.py`
- Create: `backend/core/services/intent_router.py`
- Create: `backend/core/services/context_builder.py`
- Create: `backend/core/services/dataset_understanding.py`
- Create: `backend/core/services/data_quality.py`
- Create: `backend/core/services/dataset_processor.py`
- Create: `backend/core/services/decision_engine.py`
- Create: `backend/core/services/reasoning_engine.py`
- Create: `backend/core/services/recommendation_engine.py`
- Create: `backend/core/services/knowledge_memory.py`
- Create: `backend/core/services/semantic_search.py`
- Create: `backend/core/services/privacy_agent.py`
- Create: `backend/core/services/real_ai_analyst.py`
- Create: `backend/core/agents/workflow_planner.py`
- Create: `backend/core/api/v1/routes_approval.py`
- Modify: `backend/core/api/v1/api.py`
- Test: All 18 previously failing test files in `backend/tests/`

**Interfaces:**
- Consumes: Pandas, Scikit-learn, SQLite/SessionLocal
- Produces: Concrete, production-grade intelligence services implementing the specifications in `docs/Brain.md` and legacy contracts.

- [ ] **Step 1: Check baseline failing tests**
Run: `backend/.venv/bin/pytest backend/tests/test_domain_detection.py backend/tests/test_intent_router.py backend/tests/test_context_builder.py -v`
Expected: FAIL (missing modules)

- [ ] **Step 2: Implement cognitive domain, intent, context, and quality services**
Implement:
- `DomainDetectionService`: Detects Finance, Healthcare, E-commerce, Retail, and General domains via column semantics.
- `IntentRouter`: Routes queries to ML training, EDA, data cleaning, or Q&A.
- `ContextBuilder`: Assembles dataset metadata, schema, and sample rows for LLM context.
- `DatasetUnderstandingService` & `DataQualityService`: Computes missingness, skewness, outliers, and data health scores.
- `DatasetProcessor`: Handles chunked transformation and safe data type casting.

- [ ] **Step 3: Implement decision, reasoning, memory, and approval workflows**
Implement:
- `DecisionEngine` & `ReasoningEngine`: Formulates structured analytical action plans.
- `RecommendationEngine`: Recommends optimal modeling and feature engineering strategies.
- `KnowledgeMemory` & `SemanticSearchService`: In-memory episodic/procedural memory store and keyword/vector similarity lookup.
- `PrivacyAgent`: Redacts sensitive identifiers and PII from analytical outputs.
- `RealAIAnalyst`: End-to-end analytical query interpreter.
- `WorkflowPlanner`: Compiles execution graphs.
- `routes_approval.py`: Human-in-the-loop workflow approvals (`/api/v1/approvals/`).

- [ ] **Step 4: Run all previously failing tests**
Run: `backend/.venv/bin/pytest backend/tests/test_domain_detection.py backend/tests/test_intent_router.py backend/tests/test_context_builder.py backend/tests/test_data_quality.py backend/tests/test_decision_engine.py backend/tests/test_dataset_processor.py backend/tests/test_dataset_understanding.py backend/tests/test_reasoning_engine.py backend/tests/test_recommendation_engine.py backend/tests/test_knowledge_memory.py backend/tests/test_semantic_search.py backend/tests/test_privacy_agent.py backend/tests/test_real_ai_analyst.py backend/tests/test_approval_api.py backend/tests/test_workflow_planner.py backend/tests/test_multi_agent_collaboration.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**
```bash
git add backend/core/services/ backend/core/agents/ backend/core/api/v1/
git commit -m "feat(intelligence): implement cognitive services, domain detection, and human-in-the-loop approvals"
```

---

### Task 4: Design & Implement the 8-Stage Deliberation Engine

**Files:**
- Create: `backend/core/brain/__init__.py`
- Create: `backend/core/brain/deliberation/__init__.py`
- Create: `backend/core/brain/deliberation/types.py`
- Create: `backend/core/brain/deliberation/interfaces.py`
- Create: `backend/core/brain/deliberation/stages/perception.py`
- Create: `backend/core/brain/deliberation/stages/understanding.py`
- Create: `backend/core/brain/deliberation/stages/hypothesis_generator.py`
- Create: `backend/core/brain/deliberation/stages/evidence_collector.py`
- Create: `backend/core/brain/deliberation/stages/alternative_analyzer.py`
- Create: `backend/core/brain/deliberation/stages/confidence_engine.py`
- Create: `backend/core/brain/deliberation/stages/rationale_builder.py`
- Create: `backend/core/brain/deliberation/stages/decision_verdict.py`
- Create: `backend/core/brain/deliberation/controller.py`
- Test: `backend/tests/test_deliberation_engine.py`

**Interfaces:**
- Consumes: `core.services.model_router.ModelRouter`, `core.guardrails.engine.GuardrailEngine`, dataset summaries
- Produces: 
  - `DeliberationController.deliberate(request: DeliberationRequest) -> DeliberationResult`
  - Structured audit trail with 8 typed stage outputs:
    - Stage 1: `PerceptionContext`
    - Stage 2: `ProblemUnderstanding`
    - Stage 3: `List[Hypothesis]`
    - Stage 4: `List[EvidenceItem]`
    - Stage 5: `AlternativeComparison`
    - Stage 6: `ConfidenceEvaluation`
    - Stage 7: `DeliberationRationale`
    - Stage 8: `DecisionVerdict`

- [ ] **Step 1: Write test for the 8-Stage Deliberation Engine**
Create `backend/tests/test_deliberation_engine.py` testing:
- Execution of all 8 sequential stages.
- Calibrated confidence calculation.
- Timeout and fallback execution when LLM call times out.
- Rationale and verdict generation validity.

- [ ] **Step 2: Run test to verify it fails**
Run: `backend/.venv/bin/pytest backend/tests/test_deliberation_engine.py -v`
Expected: FAIL (missing module)

- [ ] **Step 3: Implement Pydantic V2 types and stage interfaces**
In `backend/core/brain/deliberation/types.py` and `interfaces.py`, define schemas and abstract base class `BaseDeliberationStage`.

- [ ] **Step 4: Implement each of the 8 deliberation stages**
1. `PerceptionStage`: Observes shape, dtypes, missing values, hardware bounds.
2. `UnderstandingStage`: Deduces intent, target variable, task type (classification/regression/clustering/anomaly).
3. `HypothesisGeneratorStage`: Hypothesizes algorithm suitability (linear vs tree vs ensemble) and data transformations.
4. `EvidenceCollectorStage`: Collects statistical proof (skewness, variance, cardinality, correlation).
5. `AlternativeAnalyzerStage`: Ranks candidates (e.g. Random Forest vs LightGBM vs Logistic Regression).
6. `ConfidenceEngineStage`: Computes calibrated score taking into account sample size, class balance, and feature noise.
7. `RationaleBuilderStage`: Synthesizes transparent explanations.
8. `DecisionVerdictStage`: Produces executable configuration for downstream pipeline execution.

- [ ] **Step 5: Implement `DeliberationController`**
Manages execution order, stage-level telemetry, timing, error recovery, and LLM router invocation.

- [ ] **Step 6: Run test to verify it passes**
Run: `backend/.venv/bin/pytest backend/tests/test_deliberation_engine.py -v`
Expected: PASS

- [ ] **Step 7: Commit**
```bash
git add backend/core/brain/ backend/tests/test_deliberation_engine.py
git commit -m "feat(deliberation): implement production 8-stage deliberation engine"
```

---

### Task 5: Integrate 8-Stage Deliberation into Pipeline Orchestrator & API

**Files:**
- Modify: `backend/core/orchestrator.py`
- Modify: `backend/core/api/v1/routes_jobs.py`
- Modify: `backend/core/api/v1/routes_platform.py`
- Test: `backend/tests/test_orchestrator_deliberation.py`

**Interfaces:**
- Consumes: `core.brain.deliberation.DeliberationController`
- Produces: Automated cognitive deliberation preceding pipeline stage execution, exposing `/api/v1/jobs/{job_id}/deliberation` to the frontend.

- [ ] **Step 1: Write integration test**
Create `backend/tests/test_orchestrator_deliberation.py` testing that pipeline runs execute deliberation and persist the verdict and confidence scores in the run record.

- [ ] **Step 2: Run test to verify failure**
Run: `backend/.venv/bin/pytest backend/tests/test_orchestrator_deliberation.py -v`
Expected: FAIL

- [ ] **Step 3: Wire DeliberationController into PipelineOrchestrator**
In `backend/core/orchestrator.py`:
- Run deliberation prior to feature engineering and AutoML training.
- Save deliberation result to `WorkflowRun` or stage metadata.
- Expose `/api/v1/jobs/{job_id}/deliberation` endpoint for frontend UI visualization.

- [ ] **Step 4: Run test to verify pass**
Run: `backend/.venv/bin/pytest backend/tests/test_orchestrator_deliberation.py -v`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/core/orchestrator.py backend/core/api/v1/ backend/tests/test_orchestrator_deliberation.py
git commit -m "feat(orchestrator): integrate 8-stage deliberation into pipeline execution lifecycle"
```

---

### Task 6: Model Infrastructure, Telemetry, and Guardrails Hardening

**Files:**
- Modify: `backend/core/services/model_router.py`
- Modify: `backend/core/services/llm_service.py`
- Modify: `backend/core/cache/llm_cache.py`
- Test: `backend/tests/test_model_routing_resilience.py`

**Interfaces:**
- Consumes: Provider APIs (Ollama, Gemini, OpenAI, Claude)
- Produces: Dynamic fallback chain with token tracking, latency metrics, and cache TTL eviction.

- [ ] **Step 1: Write test for model fallback and telemetry**
Create `backend/tests/test_model_routing_resilience.py` verifying:
- Automatic fallback from primary model to secondary when primary errors or times out.
- Token and latency tracking metadata included in all LLM outputs.
- Cache TTL expiration and purge.

- [ ] **Step 2: Run test to verify failure**
Run: `backend/.venv/bin/pytest backend/tests/test_model_routing_resilience.py -v`
Expected: FAIL

- [ ] **Step 3: Implement resilient routing and telemetry**
In `model_router.py` and `llm_service.py`:
- Implement structured fallback chain: Local Ollama -> Gemini -> OpenAI -> Anthropic -> Local Rule Engine.
- Capture tokens generated, prompt tokens, and duration in milliseconds.
- Add cache cleanup / eviction method in `llm_cache.py`.

- [ ] **Step 4: Run test to verify pass**
Run: `backend/.venv/bin/pytest backend/tests/test_model_routing_resilience.py -v`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/core/services/model_router.py backend/core/services/llm_service.py backend/core/cache/llm_cache.py backend/tests/test_model_routing_resilience.py
git commit -m "feat(model-infra): add resilient provider fallback chain, telemetry, and cache eviction"
```

---

### Task 7: Full Test Suite Execution & Coverage Verification

**Files:**
- Modify: `backend/pytest.ini`
- Test: `backend/tests/` (all 38+ test files)

**Interfaces:**
- Consumes: Pytest test runner
- Produces: 100% test pass rate with coverage report (`coverage.xml` / `htmlcov`).

- [ ] **Step 1: Execute entire Pytest suite**
Run: `backend/.venv/bin/pytest backend/tests/ --cov=core --cov-report=term-missing`
Expected: 100% of collected tests PASS with 0 collection errors.

- [ ] **Step 2: Verify frontend compilation and linting**
Run: `npm --prefix frontend run build`
Expected: Successful Next.js 15 build with 0 TypeScript/ESLint errors.

- [ ] **Step 3: Commit**
```bash
git add backend/pytest.ini
git commit -m "test(coverage): enforce 100% pass rate across entire test suite"
```

---

### Task 8: Production CI/CD Pipeline & Benchmark Validation

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `backend/benchmarks/benchmark_platform.py`
- Test: Run benchmark locally

**Interfaces:**
- Consumes: Python benchmark script
- Produces: Live benchmarks for Deliberation latency, AutoML throughput, and memory footprint.

- [ ] **Step 1: Create automated benchmark script**
Create `backend/benchmarks/benchmark_platform.py` measuring:
- 8-stage deliberation latency (ms).
- Cache hit vs miss latency speedup factor.
- AutoML training throughput on standard synthetic and real tabular data.
- Peak RSS memory footprint during pipeline run.

- [ ] **Step 2: Run benchmark script locally**
Run: `backend/.venv/bin/python backend/benchmarks/benchmark_platform.py`
Expected: Benchmark results successfully printed and saved to `docs/project-intelligence/BENCHMARK_REPORT.md`.

- [ ] **Step 3: Update `.github/workflows/ci.yml`**
Ensure multi-OS CI matrix runs backend pytest with coverage and frontend build checks.

- [ ] **Step 4: Commit**
```bash
git add .github/workflows/ci.yml backend/benchmarks/
git commit -m "ci(matrix): enhance CI/CD workflow and add automated platform benchmarks"
```

---

### Task 9: Independent Audits, Reviews & Production Readiness Deliverables

**Files:**
- Create: `docs/project-intelligence/ARCHITECTURE_AUDIT.md`
- Create: `docs/project-intelligence/TECHNICAL_DEBT_REPORT.md`
- Create: `docs/project-intelligence/SECURITY_AUDIT.md`
- Create: `docs/project-intelligence/PRODUCTION_READINESS_ASSESSMENT.md`

**Interfaces:**
- Consumes: System audit logs, test execution results, benchmark outputs
- Produces: Complete, exhaustive documentation deliverables required by the master execution prompt.

- [ ] **Step 1: Synthesize Architecture Audit & Technical Debt Report**
Document findings from Phase A, module boundaries, cognitive loop architecture, and resolved debts.

- [ ] **Step 2: Synthesize Security Audit & Hardening Report**
Document 8-layer security defense, OWASP LLM vulnerabilities assessment, IDOR remediation, and RBAC policies.

- [ ] **Step 3: Synthesize Production Readiness Assessment & Roadmap**
Evaluate readiness against SLA, reliability, scalability, and document future roadmap.

- [ ] **Step 4: Commit documentation deliverables**
```bash
git add docs/project-intelligence/
git commit -m "docs(audit): generate complete architecture, security, and production readiness reports"
```
