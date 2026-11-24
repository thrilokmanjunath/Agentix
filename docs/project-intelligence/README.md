# Agentix — Master Project Intelligence & Engineering Documentation

**Project Owner: Thrilok M**  
**Exclusive Product Name: Agentix**  
**Documentation Version: 2.4.0 (Enterprise Edition)**  
**Classification: Evidence-Based Architectural & Engineering Intelligence Package**

---

## Executive Summary

**Agentix** is an enterprise-grade, air-gapped, AI-driven institutional intelligence and autonomous data science SaaS platform. Designed specifically for high-stakes operational environments—including financial institutions, healthcare providers, clinical research organizations, and academic universities—Agentix replaces manual, multi-week data engineering and modeling lifecycles with a deterministic, reversible **9-Stage Analytical Pipeline** paired with an **8-Layer Enterprise AI Security Architecture**.

The platform is designed around strict data sovereignty: sensitive organizational datasets (e.g. financial transactions, patient health records, internal enterprise telemetry) never leave institutional hardware or transit untrusted public AI cloud endpoints. All neural inference, feature attribution, and data parsing are executed locally via optimized inference runtimes (supporting Apple Silicon M-series unified memory via MLX/Metal, CUDA-accelerated GPUs, and containerized Ollama daemons) backed by thread-safe, sub-5ms exact-match caching.

---

## Interactive Deliverables Index

This documentation package contains both standalone interactive applications and modular deep-dive technical dossiers:

1. **[Primary Interactive HTML Dossier](../../AGENTIX_PROJECT_DOSSIER.html):**  
   A completely self-contained, interactive single-page application located at the repository root. Features interactive Mermaid architecture diagrams, a searchable technology matrix, filterable feature and security matrices, collapsible deep-dive drawers, code copy controls, and dual-theme (**Pearl Teal** light / **Obsidian Teal** dark) support.
2. **[Architecture Diagrams Directory](diagrams/):**  
   Raw Mermaid (`.mmd`) definitions for all 10 system, frontend, backend, security, and data flow architectures.
3. **[Application Screenshots Directory](screenshots/):**  
   High-resolution browser captures verifying real application states, UI responsiveness, and zero-overflow rendering across Desktop (1440×900), Laptop (1280×800), Tablet (768×1024), and Mobile (390×844) viewports.

---

## Modular Documentation Directory Map

| Document | Primary Focus | Key Evidence Files & Modules |
| :--- | :--- | :--- |
| **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** | Product Vision & Value Proposition | Business case, institutional workflows, SaaS vs multi-tenancy vs fine-tuning. |
| **[TECH_STACK.md](TECH_STACK.md)** | Technology Inventory & Matrix | Verified versions, dependencies, justification, and implementation status. |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System & Subsystem Architecture | High-level system, Next.js 15 frontend, FastAPI backend, and component interactions. |
| **[DATA_FLOW.md](DATA_FLOW.md)** | End-to-End Data Lifecycle | Chunked ingestion, Parquet conversion, target locking, reversible cleaning, and AutoML. |
| **[AI_ML_ARCHITECTURE.md](AI_ML_ARCHITECTURE.md)** | AI, ML, & Local Inference | Model complexity router, prompt enclaves, vector store, and faithfulness evaluator. |
| **[SECURITY_AUDIT.md](SECURITY_AUDIT.md)** | 8-Layer Enterprise AI Security | Layer-by-layer audit: API quotas, prompt registry, RAG, MCP, RBAC, guardrails, cache, evals. |
| **[API_REFERENCE.md](API_REFERENCE.md)** | FastAPI Endpoint Reference | Complete specification of all 34 REST & JSON-RPC routes, schemas, and permissions. |
| **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** | Relational & Analytical Models | Prisma Postgres schema and SQLAlchemy SQLite/Postgres models, relationships, and ERD. |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | DevOps & Infrastructure | Local air-gapped setup, Docker, Vercel edge deployment, health probes, and recovery. |
| **[TESTING_REPORT.md](TESTING_REPORT.md)** | Verified Test Suite Results | 41 passing backend tests, Next.js build metrics (34/34 routes), and browser verification. |
| **[ROADMAP.md](ROADMAP.md)** | Engineering Roadmap | P0 (Critical), P1 (Important), P2 (Enhancements), P3 (Future capabilities). |
| **[LIMITATIONS.md](LIMITATIONS.md)** | Architectural Limitations & Debt | Air-gapped boundaries, memory constraints, PDF generation status, and legacy tests. |
| **[GLOSSARY.md](GLOSSARY.md)** | Technical & Domain Terminology | Standardized definitions of architectural, ML, and cybersecurity terms. |
| **[CHANGELOG.md](CHANGELOG.md)** | Evolution & Version History | Chronological log of security remediations, design transformations, and feature releases. |

---

## Verified Implementation Status At A Glance

- **Backend Test Suite:** 41 passed, 0 failed in 3.23s (`pytest backend/tests/test_*.py`)
- **Frontend Compilation:** 34/34 Next.js routes compiled with zero build errors (`npm run build`)
- **Multi-Viewport Responsiveness:** 40/40 routes verified across 4 viewports with **zero horizontal overflow**
- **Security Compliance:** 8/8 Enterprise AI Governance Layers implemented and verified with automated test suites
- **Local Inference:** Fully operational via Ollama (`researcher-m4:latest`, `qwen2.5:3b`) with sub-5ms exact-match cache hits
