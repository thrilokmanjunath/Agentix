# Agentix Signature — Luxury UI/UX Architecture & Redesign Report

**Audit Identifier:** `AUDIT-UX-SIGNATURE-2026-V1`  
**Standard:** WCAG 2.1 AA Compliant, Enterprise Institutional SaaS  
**Design Direction:** Agentix Signature (Deep Midnight Charcoal & Champagne Gold)  
**Date:** November 2026  
**Status:** Completed & Integrated  

---

## 1. Executive Summary

The previous user interface presented a disjointed mix of light-mode surfaces, generic white cards, inconsistent icon weights, and lack of visual hierarchy suitable for an institutional, multi-tenant intelligence platform. 

The **Agentix Signature** transformation completely overhauled the visual identity, design tokens, typography, component system, and application shell to project:
1. **Institutional Trust & Discretion:** Premium dark aesthetic resembling an executive intelligence console.
2. **Mathematical & Engineering Precision:** Monospaced data readouts, real-time hardware telemetry, and clear audit badges.
3. **Calm Focus & Refinement:** Subdued contrast ratios exceeding WCAG 2.1 AA, restrained champagne gold accents, and zero jarring animations.

---

## 2. Visual Identity & Design System Tokens

### 2.1 Color Palette

| Token Role | Hex Code | Purpose & Application |
|---|---|---|
| **Base Canvas** | `#0B0F17` | Root application background; deep midnight foundation. |
| **Surface Elev-1** | `#111827` (slate-900) | Sidebar, top navigation bar, card surfaces (`backdrop-blur-md`). |
| **Surface Elev-2** | `#0F172A` (slate-950) | Inset panels, input fields, code blocks, and data tables. |
| **Border Subtle** | `rgba(51, 65, 85, 0.7)` | 1px hairline card borders, dividers, and structural grids. |
| **Champagne Accent**| `#D4AF37` / `#E5C158` | Primary luxury accent: active navigation pills, optimal model badges, focus rings. |
| **Emerald Verification**| `#10B981` / `#34D399` | Air-gapped verification badges, validated score KPIs, healthy service pills. |
| **Amber Advisory** | `#F59E0B` | Model hardware sizing notices, fallback advisories. |
| **Rose Safeguard** | `#F43F5E` | Critical alerts, SSRF blocks, and validation failures. |

### 2.2 Typography Hierarchy

- **Interface Primary:** `Inter`, `-apple-system`, `BlinkMacSystemFont` for crisp UI labels, navigation links, and operational controls.
- **Editorial Headings:** `Playfair Display`, `Newsreader`, `Georgia`, `serif` for executive page titles and dossier headings ("Executive Intelligence Dossier").
- **Telemetry & Technical:** `Geist Mono`, `JetBrains Mono`, `ui-monospace` for dataset dimensions, model parameters, socket latencies, and memory footprints.

---

## 3. Core Component Library

The UI has been modularized with five foundational atomic components under `frontend/src/components/ui/`:

### 3.1 `Card.tsx`
- **Variants:** `default` (`bg-slate-900/70 border-slate-800/80`), `gold` (subtle champagne gold border & glow), `glass` (`backdrop-blur-md bg-slate-900/40`), `sunken` (`bg-slate-950/80`).
- Provides semantic subcomponents: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

### 3.2 `Badge.tsx`
- **Variants:** `default`, `gold` (`bg-amber-400/10 text-amber-400 border-amber-400/30`), `emerald`, `rose`, `outline`.
- Used for tenant confidentiality badges, model status indicators, and candidate rankings.

### 3.3 `Button.tsx`
- **Variants:** `primary`, `gold` (`bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold shadow-md shadow-amber-500/20`), `outline`, `ghost`, `danger`.
- Full loading state support with animated spinners and disabled states.

### 3.4 `EmptyState.tsx`
- Standardized luxury empty state with central icon enclosure, descriptive context, and institutional action trigger.

### 3.5 `Skeleton.tsx`
- Pulse-animated skeleton loaders matching the dark charcoal color tokens for seamless async transitions.

---

## 4. Application Shell Architecture (`layout.tsx`)

### 4.1 Top Executive Navigation Bar
- **Institutional Branding:** Agentix monogram in gold shield.
- **Global Search & Command Bar:** Instant dataset & model quick-search with keyboard shortcut pill (`⌘K`).
- **Active Model Status Pill:** Live indicator showing `Local LLM Active: qwen2.5:3b (Ollama)` or `Cloud Fallback`.
- **System Telemetry Badges:** Live memory usage (`RAM: 8.2 GB / 64 GB`) and active tenant enclave badge.

### 4.2 Left Command Sidebar
- Clean vertical grouping:
  - **Executive Core:** Executive Dashboard, Data Dock (Ingestion), Autonomous Agent Console.
  - **Neural Insights:** Explainable AI & XAI, Executive Dossiers, Topological Knowledge Graph.
  - **Governance & Configuration:** Institutional Settings, Execution History, Admin Console.
- Collapsible responsive drawer for mobile/tablet viewports with backdrop blur.

---

## 5. Screen-by-Screen Transformation Details

### 5.1 Executive Intelligence Console (`/dashboard`)
- **Metric Cards:** Four real-time KPI cards displaying Total Datasets, Trained Neural Models, Inference Latency, and Active Tenant Enclave.
- **9-Stage Workflow Stepper:** Visual tracking of end-to-end pipeline: Ingestion → Validation → Profiling → Cleaning → Feature Engineering → Model Search → Tuning → Explainability → Executive Report.
- **Dual Telemetry Deck:**
  - *Left Deck:* Neural Model Telemetry & Hardware status.
  - *Right Deck:* Real-time activity log with timestamps.

### 5.2 Data Dock & Ingestion Center (`/data-dock`)
- **Drag-and-Drop Enclave:** Gold-bordered drop zone with instant format detection (`.csv`, `.parquet`, `.xlsx`, `.json`).
- **File Validation Queue:** Instant scanning of row count, column dimensions, missing value ratios, and format compliance.
- **Ingestion Pipeline Stepper:** Step-by-step progress tracking for active datasets.

### 5.3 Autonomous Agent Console (`/agent-console`)
- **Model Selector Dropdown:** Instant toggle between discovered local models (`qwen2.5:3b`, `researcher-m4:latest`) and configured cloud endpoints.
- **Dataset Context Pill:** Visual confirmation that prompts are grounded strictly in the active dataset.
- **Luxury Message Thread:** Executive dark chat bubbles, monospaced code blocks, copy-to-clipboard buttons, and model attribution badges.
- **Suggested Executive Prompts:** Instant one-click queries for business users ("Summarize key churn drivers", "Perform anomaly audit").

### 5.4 Explainable AI & Neural Diagnostics (`/insights`)
- **Accordion Architecture:** 8 collapsible deep-dive sections covering Dataset Overview, Cleaning Hygiene, EDA, Model Planning, Evaluation Leaderboard, SHAP Explainability, Insights, and Recommendations.
- **SHAP Attribution Cards:** Clean feature-importance cards with ranking indicators and contributor weights.
- **Evaluation Leaderboard:** Sorted table with ranking badges and empirical cross-validation metrics.

### 5.5 Executive Intelligence Dossier (`/intelligence-reports`)
- **Confidential Document Layout:** Formatted as an official institutional audit dossier with unique Dossier ID (`AGX-REP-*`) and ISO timestamp.
- **Dark Mode Recharts:** Custom-styled Cartesian grids and champagne gold bars displaying cross-validation variances.
- **Print & PDF Export:** Integrated one-click PDF generation and print stylesheet support.

### 5.6 Institutional Settings (`/settings`)
- **Inference Routing Matrix:** Visual cards to select between Local Ollama, Local LM Studio, Google Gemini, and OpenAI.
- **Live Socket Diagnostic Prober:** Immediate test button executing backend `/api/v1/platform/ai/test-connection` with latency readout.
- **Hardware Capacity Advisory:** Dynamic hardware assessment based on system RAM with recommended model parameter sizes.
- **Masked Cloud Key Enclave:** Secure input fields with client-side masking.

### 5.7 Topological Knowledge Graph (`/knowledge-graph`)
- **Dark Topology Canvas:** Custom ReactFlow styled with `#090D14` background, slate grid points, and color-coded entity nodes (Dataset, Profile, AutoML, Candidates, Meta-Learning).
- **Responsive Controls:** Dark-mode minimap and viewport controls.

### 5.8 Execution History & Audit Trails (`/history`)
- **Provenance Journal:** Chronological list of experiment runs with accuracy/loss scores and timestamps.
- **System Event Ledger:** Real-time log of pipeline executions and user operations.

### 5.9 Operator Profile & Reasoning Persona (`/profile`)
- **Identity Credentials:** Tenant-scoped profile editor with avatar initials generator.
- **Reasoning Persona Selector:** Toggle between *Executive Analyst* (business-focused, jargon-free) and *Data Scientist Mode* (granular mathematical telemetry & loss curves).

### 5.10 Institutional Sign-In Portal (`/login`)
- **Refined Welcome Canvas:** Institutional security banner, credentials input with subtle gold focus states, and corporate SSO trigger.

---

## 6. Accessibility & Responsive Verification

1. **Color Contrast:** All text tokens meet or exceed WCAG 2.1 AA 4.5:1 contrast against `#0B0F17` and `#111827`.
2. **Keyboard Navigation:** All interactive elements (`Button`, accordion toggles, dropdowns) support standard `Tab`, `Enter`, and `Space` focus flows.
3. **Screen Readers:** Semantic HTML5 landmarks (`<nav>`, `<header>`, `<main>`, `<aside>`) and explicit ARIA labels on icon buttons.
4. **Responsive Breakpoints:** Fully responsive from 375px mobile displays to 4K ultra-wide monitors.
