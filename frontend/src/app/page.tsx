"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Cpu,
  Database,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Terminal,
  Activity,
  Layers,
  FileText,
  LineChart,
  BrainCircuit,
  Wand2,
  Check,
  Compass,
  Monitor,
  HardDrive
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/Badge';
import DownloadButton from '@/components/DownloadButton';
import AppleLogo from '@/components/AppleLogo';

export default function LandingPage() {
  const [activeConsoleTab, setActiveConsoleTab] = useState<'inference' | 'security' | 'pipeline'>('inference');

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-200 overflow-x-hidden">
      
      {/* 1. TOP NAVIGATION */}
      <header className="sticky top-0 z-50 w-full teal-glass transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-foreground)] shadow-sm transition-transform group-hover:scale-105">
                <Compass size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-tight text-lg text-[var(--text-primary)] flex items-center gap-2">
                  AGENTIX
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 uppercase">
                    Enterprise
                  </span>
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
              <a href="#platform" className="hover:text-[var(--accent-primary)] transition-colors">Platform</a>
              <a href="#models" className="hover:text-[var(--accent-primary)] transition-colors">Custom AI</a>
              <a href="#architecture" className="hover:text-[var(--accent-primary)] transition-colors">Architecture</a>
              <a href="#security" className="hover:text-[var(--accent-primary)] transition-colors">8-Layer Security</a>
              <a href="#solutions" className="hover:text-[var(--accent-primary)] transition-colors">Solutions</a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:inline-block text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="teal-button-primary px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase mb-6 teal-pill"
          >
            <Shield size={12} className="text-[var(--accent-primary)]" />
            Universal AI &amp; Data Science Platform &bull; Device-Independent Architecture
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[var(--text-primary)] max-w-4xl mx-auto leading-[1.1]"
          >
            Your Unified AI &amp;{' '}
            <span className="teal-gradient-text">Data Science Workspace.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mt-6 leading-relaxed font-normal"
          >
            Explore, prepare, analyze, model, and operationalize data with an integrated workspace for machine learning, generative AI, and intelligent automation across any device, cloud, or runtime.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          >
            <Link
              href="/dashboard"
              className="w-full sm:w-auto teal-button-primary px-7 py-3 rounded-xl text-base flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Explore Platform</span>
              <ArrowRight size={16} />
            </Link>
            <DownloadButton />
          </motion.div>

          {/* TEAL GLASS INTERACTIVE TELEMETRY HERO WIDGET */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-16 max-w-5xl mx-auto text-left rounded-2xl overflow-hidden teal-glass-card shadow-xl border border-[var(--border-subtle)]"
          >
            {/* Widget Bar */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="h-4 w-px bg-[var(--border-subtle)] mx-1" />
                <span className="text-xs font-mono font-medium text-[var(--text-secondary)] flex items-center gap-1.5 truncate">
                  <Terminal size={12} className="text-[var(--accent-primary)] shrink-0" />
                  agentix-telemetry://cluster.local
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
                <button
                  onClick={() => setActiveConsoleTab('inference')}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeConsoleTab === 'inference'
                      ? 'bg-[var(--surface-primary)] text-[var(--accent-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Neural Inference
                </button>
                <button
                  onClick={() => setActiveConsoleTab('security')}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeConsoleTab === 'security'
                      ? 'bg-[var(--surface-primary)] text-[var(--accent-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  8-Layer Security
                </button>
                <button
                  onClick={() => setActiveConsoleTab('pipeline')}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeConsoleTab === 'pipeline'
                      ? 'bg-[var(--surface-primary)] text-[var(--accent-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Pipeline Stages
                </button>
              </div>
            </div>

            {/* Widget Content */}
            <div className="p-6 font-mono text-xs leading-relaxed bg-[var(--surface-primary)]">
              {activeConsoleTab === 'inference' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">
                    <span className="flex items-center gap-1.5 text-[var(--accent-primary)] font-semibold">
                      <Cpu size={14} /> HYBRID INFERENCE RUNTIME
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">● ADAPTIVE CLOUD &amp; LOCAL</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]">
                      <div className="text-[var(--text-secondary)] text-[11px]">Active Provider</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] mt-1">Multi-Provider Router</div>
                      <div className="text-[10px] text-[var(--accent-primary)] mt-1 font-sans">Cloud APIs &bull; Local Runtimes</div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]">
                      <div className="text-[var(--text-secondary)] text-[11px]">Exact-Match Cache</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] mt-1">0.00 ms (SHA-256 Hit)</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-sans">100% Compute Elimination</div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]">
                      <div className="text-[var(--text-secondary)] text-[11px]">Factual Faithfulness</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] mt-1">95.4% Grounded</div>
                      <div className="text-[10px] text-[var(--accent-primary)] mt-1 font-sans">Zero Hallucination Gate</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] text-[var(--text-secondary)] mt-3">
                    <span className="text-[var(--accent-primary)] font-bold">&gt; Query:</span> &quot;Summarize Q3 variance against historical risk bounds.&quot;
                    <br />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">&lt; Response:</span> &quot;Grounded in sales_q3.csv EDA output: variance stayed within +2.1% bound, zero PII transmitted, prompt hash verified.&quot;
                  </div>
                </div>
              )}

              {activeConsoleTab === 'security' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">
                    <span className="flex items-center gap-1.5 text-[var(--accent-primary)] font-semibold">
                      <Shield size={14} /> ENTERPRISE 8-LAYER AI DEFENSE COMPLIANCE
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">8/8 LAYERS CERTIFIED</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {[
                      { layer: 'L1 API Quotas', status: 'Token Bucket', ok: true },
                      { layer: 'L2 Prompt Enclave', status: 'SHA-256 Validated', ok: true },
                      { layer: 'L3 Vector RAG', status: 'Tenant Partitioned', ok: true },
                      { layer: 'L4 MCP Gating', status: 'JSON-RPC Schemas', ok: true },
                      { layer: 'L5 RBAC / OIDC', status: 'RFC 7662 Introspect', ok: true },
                      { layer: 'L6 AI Guardrails', status: 'PII Redacted', ok: true },
                      { layer: 'L7 Exact Cache', status: 'Model Routed', ok: true },
                      { layer: 'L8 AI Evals', status: 'Faithfulness Scored', ok: true },
                    ].map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--text-primary)]">{item.layer}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">{item.status}</div>
                        </div>
                        <Check size={14} className="text-emerald-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeConsoleTab === 'pipeline' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">
                    <span className="flex items-center gap-1.5 text-[var(--accent-primary)] font-semibold">
                      <Layers size={14} /> 9-STAGE REVERSIBLE ANALYTICAL PIPELINE
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">PARQUET / POLARS HYDRATED</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      '1. ProfilingAgent',
                      '2. CleaningAgent',
                      '3. FeatureEngineering',
                      '4. EDAAgent',
                      '5. TrainingAgent',
                      '6. EvaluationAgent',
                      '7. PredictionAgent',
                      '8. XAIAgent',
                      '9. ReportAgent',
                    ].map((stage, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-primary)] flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-[var(--accent-primary)]" />
                        {stage}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] pt-1 font-sans">
                    All stages execute deterministically with complete data lineage, generating authentic executive PDF deliverables.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2.5 NATIVE DESKTOP ECOSYSTEM */}
      <section id="desktop" className="py-20 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 sm:p-12 shadow-sm relative overflow-hidden">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 mb-4 border border-amber-500/20">
                <Monitor className="w-3.5 h-3.5" />
                Native Desktop Ecosystem &bull; macOS &amp; Windows
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                Local Silicon Speed. <span className="text-amber-600 dark:text-amber-400">100% Data Sovereignty.</span>
              </h2>
              <p className="text-base text-[var(--text-secondary)] mt-4 leading-relaxed">
                Agentix Desktop transforms your workstation into an autonomous data intelligence powerhouse. Supervised by a high-performance Tauri shell, it pairs an isolated local Python sidecar with local Ollama inference—executing complex AutoML pipelines completely offline with zero cloud latency and zero data leakage.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-[var(--border-subtle)]">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-1">
                    <AppleLogo className="w-4 h-4 text-stone-900 dark:text-stone-100" />
                    Apple Silicon &amp; Windows
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Native universal binaries for macOS (M1-M4 &amp; Intel) and Windows x64 with full hardware acceleration.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-1">
                    <HardDrive className="w-4 h-4 text-amber-600" />
                    Isolated Local Storage
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Datasets, Parquet lakehouses, and SQLite databases remain strictly contained inside your OS AppData.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-1">
                    <Cpu className="w-4 h-4 text-amber-600" />
                    Zero-Config Ollama Link
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Automatic loopback discovery across ports 11434 and 1234 routes queries to your locally installed LLMs.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <DownloadButton />
                <Link
                  href="/settings"
                  className="px-5 py-3 rounded-xl border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition"
                >
                  Inspect Desktop Diagnostics
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PLATFORM CAPABILITIES */}
      <section id="platform" className="py-24 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium tracking-wide uppercase text-[var(--accent-primary)] mb-3">
              Platform Capabilities
            </h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Engineered for rigorous data intelligence.
            </p>
            <p className="text-base text-[var(--text-secondary)] mt-4">
              Autonomous analytical pipelines that replace weeks of manual triage with verifiable, transparent ML workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Wand2,
                title: 'Autonomous Data Profiling & Cleaning',
                description: 'Detects skew, missing values, and anomalies. Applies mathematically justified median or mode imputation with complete audit logs.',
              },
              {
                icon: BrainCircuit,
                title: 'Held-Out AutoML Training',
                description: 'Identifies problem structure (regression vs classification), executes rigorous cross-validation, and tracks authentic performance metrics.',
              },
              {
                icon: LineChart,
                title: 'Explainable AI & Feature Attribution',
                description: 'Interpretable SHAP and feature impact curves give stakeholders plain-English causal drivers behind every model prediction.',
              },
              {
                icon: FileText,
                title: 'Board-Ready Executive Reports',
                description: 'Compiles technical analytics, distribution charts, and business recommendations into professional PDF dossiers in seconds.',
              },
              {
                icon: Database,
                title: 'Tenant-Isolated Vector RAG',
                description: 'Semantically index dataset metadata and pipeline run outputs with strict tenant boundaries for grounded, hallucination-free QA.',
              },
              {
                icon: Shield,
                title: 'Governed MCP Tool Calling',
                description: 'JSON-RPC Model Context Protocol tools with strict risk tiers (READ_ONLY, MUTATING, DESTRUCTIVE) and granular RBAC authorization.',
              },
            ].map((cap, idx) => (
              <div
                key={idx}
                className="teal-glass-card p-7 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] flex items-center justify-center mb-5 border border-[var(--accent-primary)]/20">
                    <cap.icon size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
                    {cap.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center text-xs font-medium text-[var(--accent-primary)] gap-1">
                  <span>Explore feature</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. UNIVERSAL AI ENGINE & DEVICE-INDEPENDENT EXECUTION */}
      <section id="models" className="py-24 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase mb-4 teal-pill">
                <Cpu size={12} className="text-[var(--accent-primary)]" />
                Universal Execution Engine
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                Any device. Any model. Cloud intelligence or local privacy.
              </h2>
              <p className="text-base text-[var(--text-secondary)] mt-4 leading-relaxed">
                Agentix dynamically adapts to your compute environment: connect managed cloud providers (Google Gemini, OpenAI, Anthropic), run high-throughput local inference (Ollama, LM Studio), or utilize workstation hardware. From lightweight laptops to dedicated clusters, the platform operates seamlessly.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  'Device-independent architecture: runs smoothly on CPU-only laptops, Apple Silicon, NVIDIA CUDA, and AMD ROCm.',
                  'Multi-provider flexibility: switch between cloud endpoints and air-gapped local engines in seconds.',
                  'Dynamic complexity router dispatches analytical queries to the optimal configured provider.',
                  'Sub-second prompt evaluation with cryptographic exact-match SHA-256 inference caching.',
                  'Configurable data boundaries: maintain zero-egress local compliance or leverage scalable cloud models.',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} />
                    </div>
                    <span className="text-sm text-[var(--text-primary)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="teal-glass-card p-6 rounded-2xl border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-[var(--accent-primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Inference Telemetry</span>
                </div>
                <Badge variant="teal" size="sm">Adaptive Engine</Badge>
              </div>

              <div className="space-y-4 mt-5">
                <div>
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                    <span>Inference Throughput</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">42.8 tokens/s (Adaptive)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                    <div className="h-full bg-[var(--accent-primary)] rounded-full w-[84%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                    <span>Memory Footprint</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">1.4 GB / Dynamic Budget</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                    <div className="h-full bg-[var(--accent-primary)] rounded-full w-[28%]" />
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)] text-xs font-mono text-[var(--text-secondary)] space-y-1">
                  <div>[runtime_detector] Universal runtime active. Host compute: Optimized.</div>
                  <div>[inference_router] complexity=BALANCED -&gt; provider=hybrid_adapter</div>
                  <div>[llm_cache] prompt_sha256=b764b... latency_saved=1.5s</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ENTERPRISE 8-LAYER AI ARCHITECTURE */}
      <section id="security" className="py-24 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium tracking-wide uppercase text-[var(--accent-primary)] mb-3">
              Defense In Depth
            </h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Enterprise 8-Layer AI Security Architecture
            </p>
            <p className="text-base text-[var(--text-secondary)] mt-4">
              Agentix enforces full-stack AI governance at every layer—from network ingress down to token evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: '01',
                title: 'API Governance',
                detail: 'Tenant token-bucket rate limiting (1000 req/min), payload constraints, and security headers.',
              },
              {
                num: '02',
                title: 'System Prompt Registry',
                detail: 'Versioned templates, cryptographic SHA-256 tracking, and delimiter collision containment.',
              },
              {
                num: '03',
                title: 'Tenant-Isolated RAG',
                detail: 'Strictly partitioned vector indexing preventing cross-tenant document and metadata leakage.',
              },
              {
                num: '04',
                title: 'MCP Tool Security',
                detail: 'JSON-RPC 2.0 schemas, formal input validation, risk tiering, and execution audit trails.',
              },
              {
                num: '05',
                title: 'Granular RBAC & OIDC',
                detail: 'Role matrices (Admin, Data Scientist, Analyst, Viewer) with RFC 7662 token introspection.',
              },
              {
                num: '06',
                title: 'Dual-Stage Guardrails',
                detail: 'Adversarial jailbreak neutralization (base64 & leetspeak) and bidirectional PII redaction.',
              },
              {
                num: '07',
                title: 'Exact Cache & Routing',
                detail: 'Tenant-aware SHA-256 exact-match cache (<5ms) and dynamic query complexity routing.',
              },
              {
                num: '08',
                title: 'Observability & Evals',
                detail: 'GenAI OpenTelemetry semantic spans and automated factual faithfulness scoring (0.0–1.0).',
              },
            ].map((layer, idx) => (
              <div
                key={idx}
                className="teal-glass-card p-6 rounded-xl border border-[var(--border-subtle)] relative group hover:border-[var(--accent-primary)] transition-colors"
              >
                <div className="text-xs font-mono text-[var(--accent-primary)] font-bold mb-3">
                  LAYER {layer.num}
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {layer.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {layer.detail}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 size={12} />
                  <span>VERIFIED COMPLIANT</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. INSTITUTIONAL USE CASES */}
      <section id="solutions" className="py-24 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-medium tracking-wide uppercase text-[var(--accent-primary)] mb-3">
              Institutional Solutions
            </h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Built for high-stakes analytical environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                domain: 'Financial Services & Hedge Funds',
                title: 'Credit Risk & Portfolio Stress Testing',
                body: 'Profile borrower portfolios, discover non-linear credit default risks with gradient boosted trees, and generate compliant XAI audit packages.',
              },
              {
                domain: 'Healthcare & Clinical Trials',
                title: 'Patient Outcome & Dosage Intelligence',
                body: 'Analyze longitudinal cohort data under zero-leakage air-gapped constraints. PII redaction ensures HIPAA compliance automatically.',
              },
              {
                domain: 'Enterprise Operations & SaaS',
                title: 'Churn Prevention & Customer Lifetime Value',
                body: 'Ingest multi-table telemetry, engineer cohort features, predict high-risk contract terminations, and generate executive briefings.',
              },
            ].map((uc, idx) => (
              <div key={idx} className="teal-glass-card p-7 rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[11px] font-mono font-medium text-[var(--accent-primary)] uppercase tracking-wider">
                  {uc.domain}
                </span>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-3">
                  {uc.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
                  {uc.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CALL TO ACTION */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="teal-glass p-12 rounded-3xl border border-[var(--border-subtle)] shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Deploy Institutional Intelligence Today.
            </h2>
            <p className="text-base text-[var(--text-secondary)] max-w-xl mx-auto mt-4">
              Experience the full Agentix platform—from raw dataset ingestion to board-ready executive reports—running locally on your infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="/dashboard"
                className="teal-button-primary px-8 py-3.5 rounded-xl text-base flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Launch Agentix Console</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="teal-button-secondary px-8 py-3.5 rounded-xl text-base flex items-center justify-center gap-2"
              >
                <span>Sign In to Workspace</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. ENTERPRISE FOOTER */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-primary)] py-12 text-sm text-[var(--text-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-foreground)]">
                <Compass size={16} />
              </div>
              <span className="font-bold text-base text-[var(--text-primary)]">AGENTIX</span>
              <span className="text-xs text-[var(--text-secondary)]">&bull; Institutional AI Intelligence Platform</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational &bull; Local Neural Engine Active</span>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-4">
            <p>&copy; {new Date().getFullYear()} Agentix. All rights reserved. Built for enterprise data intelligence.</p>
            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-[var(--text-primary)] transition-colors">Console</Link>
              <a href="#platform" className="hover:text-[var(--text-primary)] transition-colors">Platform</a>
              <a href="#security" className="hover:text-[var(--text-primary)] transition-colors">Security</a>
              <Link href="/login" className="hover:text-[var(--text-primary)] transition-colors">Documentation</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
