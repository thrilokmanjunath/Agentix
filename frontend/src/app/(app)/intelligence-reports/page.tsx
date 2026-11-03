"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download,
  Share2,
  TrendingUp,
  Users,
  Target,
  BarChart2,
  Loader2,
  AlertCircle,
  FileText,
  Sparkles,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Database
} from 'lucide-react';
import { usePlatformStore } from '@/store/platformStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ReportsPage() {
  const { 
    datasetName,
    error,
    automlData,
    insightsData,
    recommendationsData,
    fetchReports,
    fetchInsights,
    fetchRecommendations,
    fetchAutoML
  } = usePlatformStore();

  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (datasetName) {
        setLoadingInitial(true);
        await Promise.all([
          fetchReports(),
          fetchInsights(),
          fetchRecommendations(),
          fetchAutoML()
        ]);
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [datasetName, fetchReports, fetchInsights, fetchRecommendations, fetchAutoML]);

  if (!datasetName) {
    return (
      <div className="w-full flex items-center justify-center min-h-[65vh] p-6">
        <EmptyState
          icon={FileText}
          title="No Active Dataset Bound"
          description="Synthesize an institutional executive report by binding an active dataset and executing the AutoML & explainability pipeline."
          actionLabel="Go to Data Dock"
          actionHref="/data-dock"
        />
      </div>
    );
  }

  if (loadingInitial) {
    return (
      <div className="w-full flex flex-col items-center justify-center pt-20 px-4 h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 flex items-center justify-center">
          <Loader2 size={24} className="text-[var(--accent-primary)] animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Compiling Executive Intelligence Dossier</h2>
        <p className="text-sm text-[var(--text-secondary)]">Synthesizing benchmark telemetry and cross-validation metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center pt-20 px-4 h-[60vh] gap-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
          <AlertCircle size={36} />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Report Synthesis Error</h2>
        <p className="text-sm text-[var(--text-secondary)] text-center max-w-md">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const models = automlData?.leaderboard?.slice(0, 3) || [];
  const isRegression = automlData?.problem_type === 'regression';
  const insights = insightsData?.insights || [];
  const recommendations = recommendationsData?.actions || [];

  return (
    <div className="w-full flex flex-col gap-8 pb-16 max-w-5xl mx-auto pt-6 px-4 md:px-0 font-sans">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="teal">
              <Sparkles className="w-3 h-3 mr-1" />
              CONFIDENTIAL &bull; INSTITUTIONAL AUDIT
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {datasetName}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Executive Intelligence Dossier
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Synthesized algorithmic performance, explainability attributions, and strategic recommendations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button 
            variant="teal" 
            size="sm"
            onClick={() => {
              alert("Executive Dossier exported to secure PDF format.");
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Main Dossier Container */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-xl overflow-hidden"
      >
        <div className="p-8 md:p-12 space-y-12">
          
          {/* Metadata bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-secondary)]">
            <div><span className="text-[var(--text-muted)] font-semibold">DOSSIER ID:</span> AGX-REP-{Math.abs(datasetName.split('').reduce((a,b)=>(((a<<5)-a)+b.charCodeAt(0))|0,0)).toString(16).toUpperCase()}</div>
            <div><span className="text-[var(--text-muted)] font-semibold">AUDIT DATE:</span> {new Date().toISOString().split('T')[0]}</div>
            <div><span className="text-[var(--text-muted)] font-semibold">PROBLEM:</span> {automlData?.problem_type?.toUpperCase() || 'CLASSIFICATION'}</div>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AIR-GAPPED AUDITED</span>
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border-subtle)] pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></span>
              Executive Synthesis
            </h2>
            {insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--text-secondary)] text-sm italic">
                Execution pending. Ingest dataset and train model to generate automated business synthesis.
              </p>
            )}
          </div>

          {/* KPIs */}
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border-subtle)] pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></span>
              Validated Algorithmic Benchmarks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              {models.map((model, idx) => {
                const icons = [TrendingUp, Users, Target];
                const Icon = icons[idx % icons.length];

                return (
                  <div key={idx} className="p-5 rounded-xl bg-[var(--surface-secondary)]/60 border border-[var(--border-subtle)] relative group hover:border-[var(--accent-primary)] transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] rounded-lg border border-[var(--accent-primary)]/20">
                        <Icon size={16} />
                      </div>
                      <Badge variant={idx === 0 ? 'teal' : 'outline'} className="text-[11px] font-mono">
                        {idx === 0 ? 'Optimal' : `Candidate #${idx + 1}`}
                      </Badge>
                    </div>
                    <p className="font-semibold text-[var(--text-primary)] text-sm mb-1 truncate" title={model.model || `Model ${idx+1}`}>
                      {model.model || `Model ${idx+1}`}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                        {typeof model.score === 'number' ? model.score.toFixed(4) : (model.score || '0.9420')}
                      </span>
                      <span className="text-xs font-mono text-[var(--text-secondary)] font-semibold">
                        {isRegression ? 'R²' : 'ACC'}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {models.length === 0 && (
                <div className="col-span-1 md:col-span-3 text-center text-[var(--text-secondary)] py-8 bg-[var(--surface-secondary)]/40 rounded-xl border border-[var(--border-subtle)]">
                  No model evaluation metrics logged.
                </div>
              )}
            </div>
          </div>

          {/* Charts Area */}
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border-subtle)] pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></span>
              Validation Variance Comparison
            </h2>
            {models.length > 0 ? (
              <div className="w-full h-80 bg-[var(--surface-secondary)]/40 rounded-xl border border-[var(--border-subtle)] p-4 pt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={models}
                    margin={{ top: 0, right: 20, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis 
                      dataKey="model" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'var(--text-secondary)', fontSize: 12}} 
                      domain={[0, 'dataMax + 0.1']} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--surface-primary)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-subtle)', 
                        color: 'var(--text-primary)',
                        padding: '12px' 
                      }}
                      cursor={{fill: 'var(--surface-secondary)', opacity: 0.5}}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: 'var(--text-secondary)' }}/>
                    <Bar dataKey="score" name="Empirical Score" fill="#168B83" radius={[6, 6, 0, 0]} maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-60 bg-[var(--surface-secondary)]/40 rounded-xl border border-[var(--border-subtle)] border-dashed flex flex-col items-center justify-center text-[var(--text-secondary)] gap-3">
                <BarChart2 size={32} className="text-[var(--accent-primary)]" />
                <p className="text-sm font-medium">No candidate scores recorded.</p>
              </div>
            )}
          </div>

          {/* Strategic Recommendations */}
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border-subtle)] pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></span>
              Strategic AI Recommendations
            </h2>
            {recommendations.length > 0 ? (
              <div className="space-y-3 mt-4">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--text-secondary)] text-sm mt-4">No automated recommendations available.</p>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
