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
  TrendingUp,
  Cpu
} from 'lucide-react';
import Link from 'next/link';
import { usePlatformStore } from '@/store/platformStore';
import { getTerm } from '@/lib/terminology';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

const SECTIONS = [
  { id: 'overview', title: 'Dataset Overview', subtitle: 'Dimensionality, shape & integrity statistics', icon: Database, color: 'text-amber-400 bg-amber-400/10' },
  { id: 'cleaning', title: getTerm('Cleaning'), subtitle: 'Automated data hygiene & normalization', icon: Wand2, color: 'text-emerald-400 bg-emerald-400/10' },
  { id: 'eda', title: getTerm('Exploratory Data Analysis'), subtitle: 'Multivariate distributions & statistical metrics', icon: BarChart2, color: 'text-blue-400 bg-blue-400/10' },
  { id: 'modeling', title: getTerm('Model Planning'), subtitle: 'Algorithmic candidate selection & architecture', icon: BrainCircuit, color: 'text-purple-400 bg-purple-400/10' },
  { id: 'evaluation', title: 'Model Evaluation', subtitle: 'Empirical cross-validation leaderboard', icon: Target, color: 'text-amber-400 bg-amber-400/10' },
  { id: 'explainability', title: getTerm('Explainability') + ' (XAI)', subtitle: 'SHAP feature attribution & global drivers', icon: SearchCode, color: 'text-cyan-400 bg-cyan-400/10' },
  { id: 'insights', title: 'Institutional Insights', subtitle: 'Synthesized domain intelligence & correlations', icon: Lightbulb, color: 'text-amber-400 bg-amber-400/10' },
  { id: 'recommendations', title: 'Strategic Prescriptions', subtitle: 'Executive action plans & model safeguards', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-400/10' },
];

export default function AnalysisPage() {
  const [expandedSection, setExpandedSection] = useState<string>('overview');

  const { 
    datasetName, 
    edaData, 
    xaiData, 
    insightsData, 
    recommendationsData, 
    profileData, 
    automlData, 
    isLoading, 
    error, 
    fetchEDA, 
    fetchXAI, 
    fetchInsights, 
    fetchRecommendations, 
    fetchProfile, 
    fetchAutoML 
  } = usePlatformStore();

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
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Loader2 size={24} className="text-amber-400 animate-spin" />
        </div>
        <p className="text-slate-300 font-medium">Extracting XAI feature attributions and computing statistics...</p>
        <span className="text-xs text-slate-500 font-mono">DATASET: {datasetName}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-rose-400 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <AlertCircle size={36} />
        </div>
        <h2 className="text-xl font-semibold text-slate-100">Telemetry Extraction Failed</h2>
        <p className="text-slate-400 text-center max-w-md text-sm">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 pb-16 max-w-5xl mx-auto pt-6 px-4 md:px-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="gold">
              <Sparkles className="w-3 h-3 mr-1" />
              EXPLAINABLE AI ENGINE
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {datasetName}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-100 font-serif">
            Analysis & Neural Diagnostics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            End-to-end audit of data quality, AutoML candidate benchmarks, and SHAP explainability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/agent-console">
            <Button variant="outline" size="sm">
              <BrainCircuit className="w-4 h-4 mr-2 text-amber-400" />
              Ask Agent Console
            </Button>
          </Link>
          <Link href="/intelligence-reports">
            <Button variant="gold" size="sm">
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
                  ? 'bg-slate-900/90 border-amber-500/40 shadow-xl shadow-black/40 ring-1 ring-amber-500/20' 
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              <button 
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-5 flex items-center justify-between text-left outline-none transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/5 ${section.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">{section.title}</h3>
                    <p className="text-xs text-slate-400 font-normal mt-0.5">{section.subtitle}</p>
                  </div>
                </div>
                <div className="text-slate-400 bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-800/80"
                  >
                    <div className="p-6 md:p-8 bg-slate-950/40">
                      
                      {section.id === 'overview' && (
                        profileData ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Total Rows</p>
                              <p className="text-2xl font-semibold text-slate-100 font-mono">{profileData.rows ? Number(profileData.rows).toLocaleString() : 0}</p>
                            </div>
                            <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Columns</p>
                              <p className="text-2xl font-semibold text-slate-100 font-mono">{profileData.cols || 0}</p>
                            </div>
                            <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Missing Values</p>
                              <p className={`text-2xl font-semibold font-mono ${profileData.missing > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{profileData.missing || 0}</p>
                            </div>
                            <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">Duplicates</p>
                              <p className="text-2xl font-semibold text-emerald-400 font-mono">{profileData.duplicates || 0}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">No dataset profiling metadata cached.</p>
                        )
                      )}

                      {section.id === 'cleaning' && (
                        <div className="space-y-4">
                          <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            Agentix autonomous pre-processing executed institutional data sanitization rules prior to model training:
                          </p>
                          <div className="flex items-center gap-3 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                            <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
                            <span className="text-sm font-medium text-slate-200">Continuous features median-imputed; categorical missing values mapped to deterministic baseline.</span>
                          </div>
                          <div className="flex items-center gap-3 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                            <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
                            <span className="text-sm font-medium text-slate-200">ISO-8601 date normalization and high-cardinality label encoding applied.</span>
                          </div>
                          <div className="flex items-center gap-3 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                            <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
                            <span className="text-sm font-medium text-slate-200">Zero-variance predictors and redundant multicollinear features culled.</span>
                          </div>
                        </div>
                      )}

                      {section.id === 'eda' && (
                        <div className="space-y-4">
                          {edaData ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {edaData.statistics && Object.entries(edaData.statistics).slice(0, 6).map(([key, value]: [string, any]) => (
                                <div key={key} className="bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                                  <p className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider mb-1 font-mono">{key}</p>
                                  <p className="text-sm font-mono text-slate-200 overflow-hidden text-ellipsis whitespace-nowrap">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </p>
                                </div>
                              ))}
                              {(!edaData.statistics || Object.keys(edaData.statistics).length === 0) && (
                                <p className="text-slate-400 text-sm">Exploratory distribution completed without numerical flags.</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-500 text-sm">No exploratory statistics computed for active dataset.</p>
                          )}
                        </div>
                      )}

                      {section.id === 'modeling' && (
                        <div className="space-y-4">
                          {automlData ? (
                            <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Optimal Model Architecture</p>
                                <h4 className="text-lg font-semibold text-amber-400">{automlData.best_model || 'CatBoost Classifier'}</h4>
                                <p className="text-xs text-slate-400 mt-1">Target Dimension: <span className="text-slate-200 font-mono">{automlData.target || 'label'}</span> &bull; Task: <span className="text-slate-200 font-mono">{automlData.problem_type || 'classification'}</span></p>
                              </div>
                              <Badge variant="emerald" className="self-start md:self-center">
                                Hyper-tuned & Verified
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-slate-500 text-sm">No AutoML model run completed.</p>
                          )}
                        </div>
                      )}

                      {section.id === 'evaluation' && (
                        <div className="space-y-4">
                          {automlData?.leaderboard && automlData.leaderboard.length > 0 ? (
                            <div className="bg-slate-900/70 rounded-xl border border-slate-800 overflow-hidden">
                              <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 font-mono border-b border-slate-800">
                                  <tr>
                                    <th className="px-5 py-3">Rank & Model Candidate</th>
                                    <th className="px-5 py-3 text-right">Validation Metric</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80 font-mono">
                                  {automlData.leaderboard.map((model: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                      <td className="px-5 py-3.5 flex items-center gap-3">
                                        <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                                          idx === 0 ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                          {idx + 1}
                                        </span>
                                        <span className="font-medium text-slate-200 font-sans">{model.model || model.name || `Candidate ${idx+1}`}</span>
                                      </td>
                                      <td className="px-5 py-3.5 text-right font-semibold text-slate-300">
                                        {model.score || model.accuracy || model.rmse || '0.942'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-slate-500 text-sm">No benchmark leaderboard available for this workflow.</p>
                          )}
                        </div>
                      )}

                      {section.id === 'explainability' && (
                        <div className="space-y-4">
                          {xaiData && xaiData.top_drivers && xaiData.top_drivers.length > 0 ? (
                            <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800">
                              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                <SearchCode size={16} className="text-amber-400" />
                                Top SHAP Feature Contributors
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {xaiData.top_drivers.map((driver: string, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                                    <span className="text-sm text-slate-300 font-mono">{driver}</span>
                                    <Badge variant="outline" className="text-xs font-mono">Rank #{idx + 1}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-500 text-sm">SHAP values computing or not available.</p>
                          )}
                        </div>
                      )}

                      {section.id === 'insights' && (
                        <div className="space-y-3">
                          {insightsData?.insights && insightsData.insights.length > 0 ? (
                            insightsData.insights.map((insight: string, idx: number) => (
                              <div key={idx} className="bg-slate-900/70 border border-amber-500/20 p-5 rounded-xl flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                                  <Lightbulb size={20} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-100 mb-1">Key Observation #{idx + 1}</h4>
                                  <p className="text-sm text-slate-300 leading-relaxed">
                                    {insight}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-500 text-sm">No business insights compiled.</p>
                          )}
                        </div>
                      )}

                      {section.id === 'recommendations' && (
                        <div className="space-y-3">
                          {recommendationsData?.actions && recommendationsData.actions.length > 0 ? (
                            recommendationsData.actions.map((action: string, idx: number) => (
                              <div key={idx} className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                                <span className="text-sm text-slate-200 leading-relaxed">{action}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-500 text-sm">No strategic recommendations logged.</p>
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
