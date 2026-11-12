"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Wand2, 
  BarChart2, 
  BrainCircuit,
  Target,
  SearchCode,
  Lightbulb,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Zap,
  Clock,
  Award,
  Layers,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { usePlatformStore } from '@/store/platformStore';
import { getTerm } from '@/lib/terminology';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

const SECTIONS = [
  { id: 'overview', title: 'Dataset Overview', subtitle: 'Dimensionality, shape & integrity statistics', icon: Database, color: 'text-[var(--accent-primary)] bg-[var(--accent-soft-alpha)]' },
  { id: 'cleaning', title: getTerm('Cleaning'), subtitle: 'Automated data hygiene & normalization', icon: Wand2, color: 'text-emerald-500 bg-emerald-500/10' },
  { id: 'eda', title: getTerm('Exploratory Data Analysis'), subtitle: 'Multivariate distributions & statistical metrics', icon: BarChart2, color: 'text-teal-500 bg-teal-500/10' },
  { id: 'modeling', title: getTerm('Model Planning'), subtitle: 'Algorithmic candidate selection & architecture', icon: BrainCircuit, color: 'text-purple-500 bg-purple-500/10' },
  { id: 'evaluation', title: 'Model Evaluation', subtitle: 'Empirical cross-validation leaderboard', icon: Target, color: 'text-[var(--accent-primary)] bg-[var(--accent-soft-alpha)]' },
  { id: 'explainability', title: getTerm('Explainability') + ' (XAI)', subtitle: 'Feature attribution, permutation weights & global drivers', icon: SearchCode, color: 'text-cyan-500 bg-cyan-500/10' },
  { id: 'insights', title: 'Institutional Insights', subtitle: 'Synthesized domain intelligence & correlations', icon: Lightbulb, color: 'text-[var(--accent-primary)] bg-[var(--accent-soft-alpha)]' },
  { id: 'recommendations', title: 'Strategic Prescriptions', subtitle: 'Executive action plans & model safeguards', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
];

export default function AnalysisPage() {
  const [expandedSection, setExpandedSection] = useState<string>('overview');
  const [showRegistry, setShowRegistry] = useState<boolean>(false);
  const [registryFilter, setRegistryFilter] = useState<string>('all');

  const { 
    datasetName, 
    edaData, 
    xaiData, 
    insightsData, 
    recommendationsData, 
    profileData, 
    automlData,
    algorithmCatalog,
    isLoading, 
    error, 
    fetchEDA, 
    fetchXAI, 
    fetchInsights, 
    fetchRecommendations, 
    fetchProfile, 
    fetchAutoML,
    fetchAlgorithms,
  } = usePlatformStore();

  useEffect(() => {
    fetchAlgorithms();
  }, [fetchAlgorithms]);

  useEffect(() => {
    if (datasetName) {
      fetchProfile();
      fetchEDA();
      fetchAutoML();
      fetchXAI();
      fetchInsights();
      fetchRecommendations();
    }
  }, [datasetName, fetchProfile, fetchEDA, fetchAutoML, fetchXAI, fetchInsights, fetchRecommendations]);

  const toggleSection = (id: string) => {
    setExpandedSection(prev => prev === id ? '' : id);
  };

  if (!datasetName) {
    return (
      <div className="w-full flex items-center justify-center min-h-[65vh] p-6">
        <EmptyState
          icon={Database}
          title="No Active Dataset Bound"
          description="Select or ingest an institutional dataset through the Data Dock to inspect neural training telemetry, SHAP explainability, and executive insights."
          actionLabel="Open Data Dock"
          actionHref="/data-dock"
        />
      </div>
    );
  }

  if (isLoading && !profileData && !insightsData) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 flex items-center justify-center">
          <Loader2 size={24} className="text-[var(--accent-primary)] animate-spin" />
        </div>
        <p className="text-[var(--text-secondary)] font-medium">Extracting XAI feature attributions and computing statistics...</p>
        <span className="text-xs text-[var(--text-muted)] font-mono">DATASET: {datasetName}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-rose-500 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <AlertCircle size={36} />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Telemetry Extraction Failed</h2>
        <p className="text-[var(--text-secondary)] text-center max-w-md text-sm">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 pb-16 max-w-5xl mx-auto pt-6 px-4 md:px-0 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="teal">
              <Sparkles className="w-3 h-3 mr-1" />
              EXPLAINABLE AI ENGINE
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {datasetName}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Analysis & Neural Diagnostics
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            End-to-end audit of data quality, AutoML candidate benchmarks, and SHAP explainability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/agent-console">
            <Button variant="outline" size="sm">
              <BrainCircuit className="w-4 h-4 mr-2 text-[var(--accent-primary)]" />
              Ask Agent Console
            </Button>
          </Link>
          <Link href="/intelligence-reports">
            <Button variant="teal" size="sm">
              View Executive Report
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="flex flex-col gap-4">
        {SECTIONS.map((section) => {
          const isExpanded = expandedSection === section.id;
          const Icon = section.icon;

          return (
            <motion.div 
              key={section.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isExpanded 
                  ? 'bg-[var(--surface-primary)] border-[var(--accent-primary)]/50 shadow-lg ring-1 ring-[var(--accent-primary)]/20' 
                  : 'bg-[var(--surface-primary)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-secondary)]/30'
              }`}
            >
              <button 
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-5 flex items-center justify-between text-left outline-none transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border-subtle)] ${section.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{section.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] font-normal mt-0.5">{section.subtitle}</p>
                  </div>
                </div>
                <div className="text-[var(--text-secondary)] bg-[var(--surface-secondary)] p-2 rounded-lg border border-[var(--border-subtle)]">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-[var(--border-subtle)]"
                  >
                    <div className="p-6 md:p-8 bg-[var(--surface-secondary)]/30">
                      
                      {section.id === 'overview' && (
                        profileData ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-[var(--surface-primary)] p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs">
                              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 font-mono">Total Rows</p>
                              <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">{profileData.rows ? Number(profileData.rows).toLocaleString() : 0}</p>
                            </div>
                            <div className="bg-[var(--surface-primary)] p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs">
                              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 font-mono">Columns</p>
                              <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">{profileData.cols || 0}</p>
                            </div>
                            <div className="bg-[var(--surface-primary)] p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs">
                              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 font-mono">Missing Values</p>
                              <p className={`text-2xl font-bold font-mono ${profileData.missing > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{profileData.missing || 0}</p>
                            </div>
                            <div className="bg-[var(--surface-primary)] p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs">
                              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 font-mono">Duplicates</p>
                              <p className="text-2xl font-bold text-emerald-500 font-mono">{profileData.duplicates || 0}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[var(--text-secondary)] text-sm">No dataset profiling metadata cached.</p>
                        )
                      )}

                      {section.id === 'cleaning' && (
                        <div className="space-y-4">
                          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
                            Agentix autonomous pre-processing executed institutional data sanitization rules prior to model training:
                          </p>
                          <div className="flex items-center gap-3 bg-[var(--surface-primary)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
                            <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                            <span className="text-sm font-medium text-[var(--text-primary)]">Continuous features median-imputed; categorical missing values mapped to deterministic baseline.</span>
                          </div>
                          <div className="flex items-center gap-3 bg-[var(--surface-primary)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
                            <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                            <span className="text-sm font-medium text-[var(--text-primary)]">ISO-8601 date normalization and high-cardinality label encoding applied.</span>
                          </div>
                          <div className="flex items-center gap-3 bg-[var(--surface-primary)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
                            <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                            <span className="text-sm font-medium text-[var(--text-primary)]">Zero-variance predictors and redundant multicollinear features culled.</span>
                          </div>
                        </div>
                      )}

                      {section.id === 'eda' && (
                        <div className="space-y-4">
                          {edaData ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {edaData.statistics && Object.entries(edaData.statistics).slice(0, 6).map(([key, value]: [string, any]) => (
                                <div key={key} className="bg-[var(--surface-primary)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
                                  <p className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-1 font-mono">{key}</p>
                                  <p className="text-sm font-mono text-[var(--text-primary)] overflow-hidden text-ellipsis whitespace-nowrap">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </p>
                                </div>
                              ))}
                              {(!edaData.statistics || Object.keys(edaData.statistics).length === 0) && (
                                <p className="text-[var(--text-secondary)] text-sm">Exploratory distribution completed without numerical flags.</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[var(--text-secondary)] text-sm">No exploratory statistics computed for active dataset.</p>
                          )}
                        </div>
                      )}

                      {section.id === 'modeling' && (
                        <div className="space-y-6">
                          {automlData ? (
                            <>
                              {/* Primary Winning Model Card */}
                              <div className="bg-[var(--surface-primary)] p-6 rounded-xl border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                                    <p className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">Winning Architecture</p>
                                    <Badge variant="teal" className="text-xs">
                                      #1 Empirical Best
                                    </Badge>
                                  </div>
                                  <h4 className="text-xl font-bold text-[var(--accent-primary)]">{automlData.best_model}</h4>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)] mt-2">
                                    <span>Target Dimension: <strong className="text-[var(--text-primary)] font-mono">{automlData.target || 'target'}</strong></span>
                                    <span>&bull;</span>
                                    <span>Task Formulation: <strong className="text-[var(--text-primary)] font-mono uppercase">{automlData.problem_type}</strong></span>
                                    {automlData.best_score !== undefined && (
                                      <>
                                        <span>&bull;</span>
                                        <span>Best Score: <strong className="text-[var(--text-primary)] font-mono font-bold">{automlData.best_score?.toFixed(4)}</strong> ({automlData.primary_metric || 'metric'})</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setShowRegistry(!showRegistry)}
                                    className="text-xs flex items-center gap-1.5"
                                  >
                                    <BookOpen size={14} />
                                    {showRegistry ? 'Hide Registry Catalog' : 'View Full Algorithm Catalog (32)'}
                                  </Button>
                                </div>
                              </div>

                              {/* Candidate Selection Architecture & Rationale */}
                              {automlData.recommended_candidates && automlData.recommended_candidates.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                                      <Zap size={16} className="text-[var(--accent-primary)]" />
                                      Algorithmic Candidate Selection & Technical Rationale
                                    </h5>
                                    <span className="text-xs text-[var(--text-secondary)] font-mono">
                                      {automlData.recommended_candidates.length} Recommended Candidates
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 gap-3">
                                    {automlData.recommended_candidates.map((cand, idx) => (
                                      <div 
                                        key={idx}
                                        className={`p-4 rounded-xl border transition-all ${
                                          cand.is_baseline 
                                            ? 'bg-[var(--surface-primary)] border-[var(--border-subtle)]' 
                                            : idx === 0 
                                            ? 'bg-[var(--accent-soft-alpha)]/20 border-[var(--accent-primary)]/40 shadow-xs' 
                                            : 'bg-[var(--surface-primary)] border-[var(--border-subtle)]'
                                        }`}
                                      >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                          <div className="flex items-center gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-[var(--surface-secondary)] text-xs font-mono font-bold flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                              #{cand.priority_rank}
                                            </span>
                                            <span className="font-bold text-[var(--text-primary)] text-sm">{cand.algorithm_name}</span>
                                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                              {cand.tier}
                                            </Badge>
                                            {cand.is_baseline && (
                                              <Badge variant="neutral" className="text-[10px] font-mono">
                                                Baseline Anchor
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-mono">
                                            <span className="flex items-center gap-1">
                                              <Clock size={12} className="text-[var(--text-muted)]" />
                                              Speed: <strong className="text-[var(--text-primary)]">{cand.estimated_training_speed}</strong>
                                            </span>
                                            <span>&bull;</span>
                                            <span>
                                              Interpretability: <strong className="text-[var(--text-primary)]">{cand.interpretability}</strong>
                                            </span>
                                          </div>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed pl-7">
                                          {cand.rationale}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Algorithm Registry Catalog Modal/Accordion */}
                              {showRegistry && (
                                <div className="p-5 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--surface-secondary)]/70 space-y-4">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                                    <div>
                                      <h5 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                                        <Layers size={16} className="text-[var(--accent-primary)]" />
                                        Agentix Algorithm Registry ({algorithmCatalog.length} Algorithms)
                                      </h5>
                                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                        Comprehensive algorithmic library spanning linear, tree, ensemble, boosting, distance, and generative methods.
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {['all', 'classification', 'regression', 'clustering', 'dimensionality_reduction', 'time_series'].map((cat) => (
                                        <button
                                          key={cat}
                                          onClick={() => setRegistryFilter(cat)}
                                          className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                                            registryFilter === cat
                                              ? 'bg-[var(--accent-primary)] text-[var(--accent-foreground)] font-bold'
                                              : 'bg-[var(--surface-primary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]'
                                          }`}
                                        >
                                          {cat === 'all' ? 'All (32)' : cat === 'dimensionality_reduction' ? 'Reduction' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                                    {(algorithmCatalog || [])
                                      .filter((a) => registryFilter === 'all' || a.task_type === registryFilter)
                                      .map((algo) => (
                                        <div key={algo.id} className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-[var(--text-primary)]">{algo.name}</span>
                                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                              {algo.task_type}
                                            </Badge>
                                          </div>
                                          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                                            {algo.description}
                                          </p>
                                          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                                            <span>Speed: {algo.speed_tier}</span>
                                            <span>Complexity: {algo.computational_complexity}</span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-[var(--text-secondary)] text-sm">No AutoML model run completed.</p>
                          )}
                        </div>
                      )}

                      {section.id === 'evaluation' && (
                        <div className="space-y-6">
                          {automlData?.leaderboard && automlData.leaderboard.length > 0 ? (
                            <>
                              <div className="bg-[var(--surface-primary)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-xs">
                                <div className="px-5 py-3.5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Award size={16} className="text-[var(--accent-primary)]" />
                                    <h5 className="text-xs font-bold font-mono text-[var(--text-primary)] uppercase tracking-wider">
                                      Empirical Model Leaderboard ({automlData.leaderboard.length} Candidates Evaluated)
                                    </h5>
                                  </div>
                                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                                    Primary Metric: <strong className="text-[var(--text-primary)]">{automlData.primary_metric || 'score'}</strong>
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                    <thead className="text-[11px] text-[var(--text-secondary)] uppercase bg-[var(--surface-secondary)]/50 font-mono border-b border-[var(--border-subtle)]">
                                      <tr>
                                        <th className="px-5 py-3">Rank & Model Candidate</th>
                                        <th className="px-4 py-3">Algorithmic Tier</th>
                                        <th className="px-4 py-3 text-right">Fit Latency</th>
                                        <th className="px-4 py-3 text-right">Score ({automlData.primary_metric || 'Metric'})</th>
                                        <th className="px-5 py-3">Performance Breakdown</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-xs">
                                      {automlData.leaderboard.map((model: any, idx: number) => {
                                        const isBest = idx === 0 || model.is_best;
                                        return (
                                          <tr 
                                            key={idx} 
                                            className={`transition-colors ${
                                              isBest 
                                                ? 'bg-[var(--accent-soft-alpha)]/20 hover:bg-[var(--accent-soft-alpha)]/30' 
                                                : 'hover:bg-[var(--surface-secondary)]/50'
                                            }`}
                                          >
                                            <td className="px-5 py-3.5 flex items-center gap-3">
                                              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                                                isBest 
                                                  ? 'bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/50' 
                                                  : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                                              }`}>
                                                {model.rank || idx + 1}
                                              </span>
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold text-[var(--text-primary)] font-sans text-sm">
                                                    {model.model || model.name || `Candidate ${idx + 1}`}
                                                  </span>
                                                  {isBest && (
                                                    <Badge variant="teal" className="text-[10px] py-0">
                                                      Best Model
                                                    </Badge>
                                                  )}
                                                  {model.is_baseline && (
                                                    <Badge variant="outline" className="text-[10px] py-0 text-[var(--text-muted)]">
                                                      Baseline
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                              <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                                {model.tier || 'Standard'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-[var(--text-muted)]">
                                              {model.fit_time_sec !== undefined ? `${model.fit_time_sec.toFixed(4)}s` : '--'}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-bold text-sm text-[var(--text-primary)]">
                                              {typeof model.score === 'number' ? model.score.toFixed(4) : (model.score || '--')}
                                            </td>
                                            <td className="px-5 py-3.5">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                {model.accuracy !== undefined && (
                                                  <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-[11px]">
                                                    Acc: <strong className="text-[var(--text-primary)]">{model.accuracy.toFixed(4)}</strong>
                                                  </span>
                                                )}
                                                {model.f1_score !== undefined && (
                                                  <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-[11px]">
                                                    F1: <strong className="text-[var(--text-primary)]">{model.f1_score.toFixed(4)}</strong>
                                                  </span>
                                                )}
                                                {model.precision !== undefined && (
                                                  <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-[11px]">
                                                    Prec: <strong className="text-[var(--text-primary)]">{model.precision.toFixed(4)}</strong>
                                                  </span>
                                                )}
                                                {model.recall !== undefined && (
                                                  <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-[11px]">
                                                    Rec: <strong className="text-[var(--text-primary)]">{model.recall.toFixed(4)}</strong>
                                                  </span>
                                                )}
                                                {model.r2 !== undefined && (
                                                  <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-[11px]">
                                                    R²: <strong className="text-[var(--text-primary)]">{model.r2.toFixed(4)}</strong>
                                                  </span>
                                                )}
                                                {model.mae !== undefined && (
                                                  <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-[11px]">
                                                    MAE: <strong className="text-[var(--text-primary)]">{model.mae.toFixed(4)}</strong>
                                                  </span>
                                                )}
                                                {model.rmse !== undefined && (
                                                  <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-[11px]">
                                                    RMSE: <strong className="text-[var(--text-primary)]">{model.rmse.toFixed(4)}</strong>
                                                  </span>
                                                )}
                                                {model.silhouette_score !== undefined && (
                                                  <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-[11px]">
                                                    Sil: <strong className="text-[var(--text-primary)]">{model.silhouette_score.toFixed(4)}</strong>
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Confusion Matrix if available */}
                              {automlData.leaderboard[0]?.confusion_matrix && (
                                <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-xs space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-bold font-mono text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                                      <Target size={14} className="text-[var(--accent-primary)]" />
                                      Validation Confusion Matrix ({automlData.best_model})
                                    </h5>
                                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                      Rows: Actual | Columns: Predicted
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="text-xs font-mono border-collapse">
                                      <thead>
                                        <tr>
                                          <th className="p-2 text-[var(--text-muted)]">Actual \ Pred</th>
                                          {(automlData.leaderboard[0].class_labels || automlData.leaderboard[0].confusion_matrix.map((_, i: number) => `Class ${i}`)).map((label: string, colIdx: number) => (
                                            <th key={colIdx} className="p-2 text-center text-[var(--text-primary)] font-bold bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]">
                                              {label}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {automlData.leaderboard[0].confusion_matrix.map((row: number[], rowIdx: number) => {
                                          const rowSum = row.reduce((a: number, b: number) => a + b, 0) || 1;
                                          const rowLabel = automlData.leaderboard[0].class_labels?.[rowIdx] || `Class ${rowIdx}`;
                                          return (
                                            <tr key={rowIdx}>
                                              <td className="p-2 font-bold text-[var(--text-primary)] bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]">
                                                {rowLabel}
                                              </td>
                                              {row.map((val: number, colIdx: number) => {
                                                const isDiag = rowIdx === colIdx;
                                                const frac = val / rowSum;
                                                return (
                                                  <td 
                                                    key={colIdx} 
                                                    className={`p-3 text-center border border-[var(--border-subtle)] font-bold ${
                                                      isDiag 
                                                        ? 'bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)]' 
                                                        : val > 0 
                                                        ? 'bg-rose-500/10 text-rose-500' 
                                                        : 'text-[var(--text-muted)]'
                                                    }`}
                                                  >
                                                    <div>{val}</div>
                                                    <div className="text-[9px] font-normal opacity-70">{(frac * 100).toFixed(0)}%</div>
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-[var(--text-secondary)] text-sm">No benchmark leaderboard available for this workflow.</p>
                          )}
                        </div>
                      )}

                      {section.id === 'explainability' && (
                        <div className="space-y-4">
                          {(() => {
                            const entries: [string, number][] = xaiData?.importances && Object.keys(xaiData.importances).length > 0
                              ? Object.entries(xaiData.importances)
                                  .map(([k, v]) => [k, Number(v) || 0] as [string, number])
                                  .sort((a, b) => b[1] - a[1])
                              : (xaiData?.top_drivers || []).map((driver) => [driver, 0] as [string, number]);
                            const maxWeight = Math.max(...entries.map(([, val]) => val), 0.0001);

                            if (!xaiData || entries.length === 0) {
                              return (
                                <p className="text-[var(--text-secondary)] text-sm">
                                  Feature attributions are not available yet. Run the pipeline on this dataset to compute model or permutation-based feature drivers.
                                </p>
                              );
                            }

                            return (
                              <div className="bg-[var(--surface-primary)] p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <SearchCode size={16} className="text-[var(--accent-primary)]" />
                                    Global Feature Attribution Drivers
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {xaiData.method_label && (
                                      <Badge variant="outline" className="text-xs">
                                        {xaiData.method === 'surrogate_model_attribution'
                                          ? 'Surrogate Attribution'
                                          : xaiData.method_label}
                                      </Badge>
                                    )}
                                    {xaiData.model && (
                                      <Badge variant="outline" className="text-xs font-mono">
                                        {xaiData.best_model && xaiData.model !== xaiData.best_model
                                          ? `${xaiData.model} (for ${xaiData.best_model})`
                                          : xaiData.model}
                                      </Badge>
                                    )}
                                    {xaiData.target && (
                                      <Badge variant="outline" className="text-xs font-mono">
                                        Target: {xaiData.target}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {entries.map(([driver, weight], idx) => {
                                    const pct = weight * 100;
                                    const barWidth = weight > 0 ? Math.max(4, Math.round((weight / maxWeight) * 100)) : 0;
                                    return (
                                      <div
                                        key={driver}
                                        className="p-3 rounded-lg bg-[var(--surface-secondary)]/60 border border-[var(--border-subtle)] space-y-2"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <Badge variant="outline" className="text-[11px] font-mono shrink-0">
                                              #{idx + 1}
                                            </Badge>
                                            <span className="text-sm text-[var(--text-primary)] font-mono truncate" title={driver}>
                                              {driver}
                                            </span>
                                          </div>
                                          <span className="text-xs font-semibold font-mono text-[var(--accent-primary)] shrink-0">
                                            {weight > 0 ? `${pct.toFixed(1)}%` : 'Driver'}
                                          </span>
                                        </div>
                                        {weight > 0 && (
                                          <div className="h-1.5 w-full rounded-full bg-[var(--border-subtle)]/60 overflow-hidden">
                                            <div
                                              className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                                              style={{ width: `${barWidth}%` }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {section.id === 'insights' && (
                        <div className="space-y-3">
                          {insightsData?.insights && insightsData.insights.length > 0 ? (
                            insightsData.insights.map((insight: string, idx: number) => (
                              <div key={idx} className="bg-[var(--surface-primary)] border border-[var(--accent-primary)]/30 p-5 rounded-xl flex items-start gap-4 shadow-xs">
                                <div className="p-2 rounded-lg bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] shrink-0">
                                  <Lightbulb size={20} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">Key Observation #{idx + 1}</h4>
                                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    {insight}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[var(--text-secondary)] text-sm">No business insights compiled.</p>
                          )}
                        </div>
                      )}

                      {section.id === 'recommendations' && (
                        <div className="space-y-3">
                          {recommendationsData?.actions && recommendationsData.actions.length > 0 ? (
                            recommendationsData.actions.map((action: string, idx: number) => (
                              <div key={idx} className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] p-4 rounded-xl flex items-start gap-3 shadow-xs">
                                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-[var(--text-primary)] leading-relaxed">{action}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[var(--text-secondary)] text-sm">No strategic recommendations logged.</p>
                          )}
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
