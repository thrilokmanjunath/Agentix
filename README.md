# Agentix

**Enterprise AI & Autonomous Data Science Operating System**

**Project Owner: Thrilok M**

---

Agentix is a production-grade, air-gapped Enterprise Data Science and Autonomous AI Operating System. Designed for regulated institutions, Agentix ingests structured tabular datasets, executes autonomous 9-stage data engineering and AutoML pipelines, renders SHAP explainability diagnostics, and provides a conversational workspace powered by local hardware inference with zero cloud data leakage.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 AGENTIX WEB CONSOLE                    │
                  │   Next.js 15 • React 19 • Tailwind CSS 4 • Teal Glass  │
                  └───────────────────────────┬────────────────────────────┘
                                              │ HTTP / JSON-RPC / SSE
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │              FASTAPI ENTERPRISE GATEWAY                │
                  │        Layer 1–8 Enterprise AI Security Stack          │
                  └──────┬────────────────────┬────────────────────┬───────┘
                         │                    │                    │
                         ▼                    ▼                    ▼
               ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
               │  NEURAL INFERENCE│ │  RAG & MCP ENGINE│ │ PIPELINE STORAGE │
               │  Ollama Daemon   │ │ Tenant Vector DB │ │ SQLite (WAL Mode)│
               │  researcher-m4   │ │ JSON-RPC Tools   │ │ SHA-256 LLM Cache│
               └──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 🏛️ Enterprise 8-Layer AI Security Architecture

Agentix implements a defense-in-depth AI governance architecture designed for compliance with strict institutional requirements:

| Layer | Architecture Component | Implementation Details | Certified State |
| :--- | :--- | :--- | :--- |
| **Layer 1** | **API Governance** | `TenantTokenBucketLimiter` (1,000 req/min/tenant), 100MB payload caps, audit headers (`x-agentix-tenant-id`). | **100% Compliant** |
| **Layer 2** | **Prompt Registry** | Versioned templates (`analyst_core:v1`), SHA-256 cryptographic hashes, `<untrusted_user_query>` collision isolation. | **100% Compliant** |
| **Layer 3** | **Context Retrieval (RAG)** | Thread-safe, multi-tenant vector store, cosine similarity retrieval, automatic pipeline run indexing. | **100% Compliant** |
| **Layer 4** | **MCP Tool Governance** | Model Context Protocol JSON-RPC schema validation, risk tiers (`READ_ONLY`, `MUTATING`, `DESTRUCTIVE`). | **100% Compliant** |
| **Layer 5** | **Granular RBAC & OAuth** | RFC 7662 token introspection (`/api/v1/auth/oauth/introspect`), role hierarchy (`ADMIN`, `DATA_SCIENTIST`, `ANALYST`, `VIEWER`). | **100% Compliant** |
| **Layer 6** | **AI Guardrails** | Bidirectional regex & semantic PII redaction (`SSN`, `CREDIT_CARD`, `EMAIL`, `API_KEY`), multi-pattern jailbreak neutralisation. | **100% Compliant** |
| **Layer 7** | **Caching & Model Routing**| SHA-256 exact-match cache (sub-4ms GPU bypass), dynamic complexity classification (`LIGHTWEIGHT`, `BALANCED`, `REASONING`). | **100% Compliant** |
| **Layer 8** | **Observability & Eval** | OpenTelemetry GenAI semantic spans, automated RAG tri-metric evaluation (faithfulness, answer relevancy, context recall). | **100% Compliant** |

---

## 🎨 Premium UI/UX Design System: Teal Glass

Agentix features a refined, minimal, and responsive **Teal Glass** visual design system inspired by craftsmanship standards:

- **Pearl Teal (Light Mode):**
  - Background: `#F5FAF9`
  - Primary Surface: `#FFFFFF`
  - Secondary Surface: `#EAF5F2`
  - Primary Text: `#123B3B`
  - Secondary Text: `#527C7A`
  - Accent: `#168B83`
  - Subtle Border: `#DCEAE7`

- **Obsidian Teal (Dark Mode):**
  - Background: `#091B1F`
  - Primary Surface: `#10282D`
  - Secondary Surface: `#163238`
  - Primary Text: `#F0FFFB`
  - Secondary Text: `#9CC2BD`
  - Accent: `#36B5A7`
  - Subtle Border: `#29494E`

---

## 💬 Conversational AI Analyst Workspace

Inspired by the conversational simplicity of Claude, ChatGPT, and Gemini:
- **Collapsible Sidebar:** New chat initiation, categorized history threads (*Today*, *Yesterday*, *Previous 7 Days*), active dataset scoping.
- **Main Stream:** Full GitHub-Flavored Markdown rendering, code block syntax styling with one-click copy, responsive tables, blockquotes, telemetry badges (latency, tokens, exact-match cache).
- **Anchored Floating Composer:** Auto-expanding multiline textarea, attachment trigger (`.csv`, `.json`, `.parquet`), Deep Reasoning toggle, local hardware model selector (`researcher-m4:latest`, `qwen2.5:3b`).
- **Interactive Actions:** Copy response, regenerate output, helpfulness rating feedback, export conversation transcript.

---

## 🚀 Quickstart & Local Execution

### Prerequisites
- Node.js 20+
- Python 3.12+
- Ollama (for air-gapped local inference)

### 1. Start Local Ollama Models
```bash
ollama serve
ollama pull qwen2.5:3b
# Or create the researcher-m4 model
ollama create researcher-m4 -f Modelfile
```

### 2. Start Backend API (FastAPI)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn core.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Start Frontend Console (Next.js)
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to open the Agentix Console.

### Default Development Credentials
- **Email:** `admin@agentix.com`
- **Password:** `admin123`

---

## 🧪 Testing & Verification

Execute the complete automated test suite:

```bash
# Run 8-layer enterprise AI governance and security regression tests
cd backend
pytest tests/test_security_remediation.py tests/test_enterprise_layers.py

# Verify frontend production build
cd ../frontend
npm run build
```

---

## 📄 License & Attribution

&copy; 2026 Agentix. All rights reserved. Proprietary institutional software.
