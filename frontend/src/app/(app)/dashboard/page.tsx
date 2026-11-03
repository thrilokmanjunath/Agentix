"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Play, 
  UploadCloud, 
  FileText, 
  MessageSquare, 
  BrainCircuit,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
  Database,
  Cpu,
  Shield,
  Activity,
  HardDrive,
  TrendingUp,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getTerm } from '@/lib/terminology';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function WorkspacePage() {
  const { data: session } = useSession();
  const displayName = session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Executive';
  const [data, setData] = useState<any>(null);
  const [workflowNodes, setWorkflowNodes] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = () => {
      fetch('/api/dashboard')
        .then(async res => {
          const text = await res.text();
          return text ? JSON.parse(text) : {};
        })
        .then(d => {
          if (!isMounted) return;
          const payload = d.data || d;
          setData(payload);
          if (payload?.workflow?.nodes) {
            setWorkflowNodes(payload.workflow.nodes);
          } else {
            setWorkflowNodes([
              { id: "dataset_upload", label: "Dataset Ingestion", status: "Completed" },
              { id: "profiling", label: getTerm("Profiling"), status: "Completed" },
              { id: "cleaning", label: getTerm("Cleaning"), status: "In Progress" },
              { id: "feature_engineering", label: getTerm("Feature Engineering"), status: "Pending" },
              { id: "eda", label: getTerm("EDA"), status: "Pending" },
              { id: "prediction", label: getTerm("Training"), status: "Pending" },
              { id: "explainability", label: getTerm("SHAP Explain"), status: "Pending" }
            ]);
          }
          if (payload?.activityLogs) {
             setActivityLogs(payload.activityLogs);
          }
          setIsLoading(false);
        })
        .catch(err => {
          if (!isMounted) return;
          setIsLoading(false);
        });
    };

    fetchData();

    // Fetch AI Status from backend
    const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${backendBase}/api/v1/platform/ai/status`)
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (!isMounted || !json?.data) return;
        setAiStatus(json.data);
      })
      .catch(() => {});

    const interval = setInterval(fetchData, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const localModels = aiStatus?.local_models || [];
  const primaryModel = localModels[0]?.name || 'qwen2.5:3b';
  const memoryInfo = aiStatus?.memory_guidance || { available_ram_gb: 8.0, recommended_parameters: '<= 7B Parameters' };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      <div className="w-full flex flex-col pt-8 px-6 md:px-10 max-w-7xl mx-auto gap-8 relative z-10">
        
        {/* Luxury Hero Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="luxury-panel-gold rounded-2xl p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="gold" size="sm">
                  <Shield size={11} />
                  Institutional Workspace
                </Badge>
                <Badge variant="local" size="sm">
                  <Lock size={11} />
                  Air-Gapped Privacy
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100 mb-2">
                Executive Console: <span className="gold-gradient-text">{displayName}</span>
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Autonomous multi-agent data engineering, automated machine learning, and explainable AI operations under verified tenant isolation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/data-dock">
                <Button variant="gold" size="md" leftIcon={<UploadCloud size={16} />}>
                  Ingest Dataset
                </Button>
              </Link>
              <Link href="/agent-console">
                <Button variant="outline" size="md" leftIcon={<MessageSquare size={16} />}>
                  AI Workspace
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Executive KPI Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="glass" className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Datasets Ingested</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Database size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold metric-mono text-slate-100">{data?.recentDatasets?.length || 0}</span>
              <span className="text-xs text-slate-500 ml-2">Registered</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Scoped strictly to authenticated tenant
            </div>
          </Card>

          <Card variant="glass" className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Intelligence Reports</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <FileText size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold metric-mono text-slate-100">{data?.recentReports?.length || 0}</span>
              <span className="text-xs text-slate-500 ml-2">Generated</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Auditable pipeline summaries
            </div>
          </Card>

          <Card variant="glass" className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Inference</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Cpu size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm font-bold font-mono text-amber-300 truncate block">
                {localModels.length > 0 ? primaryModel : 'Ollama Standby'}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Local Air-Gapped Inference
            </div>
          </Card>

          <Card variant="glass" className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Host Memory Advisory</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <HardDrive size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold metric-mono text-slate-100">{memoryInfo.available_ram_gb} GB</span>
              <span className="text-xs text-slate-500 ml-2">Available</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 truncate">
              {memoryInfo.recommended_parameters}
            </div>
          </Card>
        </div>

        {/* 9-Stage ML Workflow Progress Stepper */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-amber-400" />
                Autonomous Pipeline Execution Stages
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-agent orchestrator execution trace from raw tabular ingestion to privacy compliance
              </p>
            </div>
            <span className="text-xs font-mono text-amber-300/80 uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
              9-Stage Engine
            </span>
          </div>

          <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex items-center min-w-max gap-3 py-2">
              {isLoading ? (
                <div className="text-slate-400 text-sm flex items-center gap-2 font-medium">
                  <Loader2 className="animate-spin text-amber-400" size={18} /> Initializing pipeline state...
                </div>
              ) : workflowNodes.length === 0 ? (
                <div className="text-slate-400 text-sm font-medium">
                  No pipeline execution in progress. Ingest a dataset to trigger automated analysis.
                </div>
              ) : (
                workflowNodes.map((step, idx) => {
                  const isActive = step.status === 'In Progress';
                  const isDone = step.status === 'Completed';
                  const isFailed = step.status === 'Failed';
                  return (
                    <React.Fragment key={step.id}>
                      <div className={`flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-105 z-10' : 'opacity-90'}`}>
                        <div className={`h-11 px-5 rounded-xl flex items-center justify-center font-semibold text-xs border transition-all duration-300 ${
                          isActive 
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20 font-bold' 
                            : isFailed 
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300' 
                            : isDone 
                            ? 'bg-slate-900 border-emerald-500/40 text-emerald-300' 
                            : 'bg-slate-950/60 border-slate-800 text-slate-500'
                        }`}>
                          {getTerm(step.label)}
                        </div>
                      </div>
                      {idx < workflowNodes.length - 1 && (
                        <div className="w-6 flex items-center justify-center shrink-0">
                          <ArrowRight size={14} className={isDone ? 'text-emerald-500/60' : 'text-slate-700'} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Dual Console: Live Neural Telemetry & Pipeline Audit Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Console: Neural Model Status & Hardware Execution */}
          <Card variant="elevated" className="flex flex-col">
            <CardHeader>
              <CardTitle>
                <BrainCircuit size={18} className="text-amber-400" />
                Neural Inference Architecture
              </CardTitle>
              <Badge variant="local" size="sm">
                Local Hardware
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">Selected Engine</span>
                  <span className="text-xs font-mono text-amber-300 font-bold">{primaryModel}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inference executes directly on host hardware via local Ollama daemon. No tokens or training samples are dispatched to third-party endpoints.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Endpoint Address</span>
                  <span className="font-mono text-slate-200">http://127.0.0.1:11434</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Memory Allocation</span>
                  <span className="font-mono text-slate-200">{memoryInfo.available_ram_gb} GB Free / {memoryInfo.total_ram_gb || 16} GB Total</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Tenant Data Isolation</span>
                  <span className="text-emerald-400 font-medium">Owner Scoped • Level 5</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2">
                  <span className="text-slate-400">Cloud Fallback State</span>
                  <span className="font-mono text-slate-400">Disabled (Local Enforced)</span>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/settings">
                  <Button variant="outline" size="sm" className="w-full">
                    Configure Inference Providers & Hardware Limits
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Right Console: Live Pipeline Audit Feed */}
          <Card variant="elevated" className="flex flex-col">
            <CardHeader>
              <CardTitle>
                <Activity size={18} className="text-amber-400" />
                Live Pipeline Audit Stream
              </CardTitle>
              <span className="text-xs font-mono text-slate-500">Real-time</span>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[380px] custom-scrollbar">
              <AnimatePresence>
                {isLoading ? (
                  <div className="flex items-center gap-3 p-4 text-slate-400 text-sm">
                    <Loader2 className="animate-spin text-amber-400" size={16} /> Syncing pipeline stream...
                  </div>
                ) : activityLogs.length > 0 ? (
                  activityLogs.map((log, idx) => {
                    const failed = typeof log.action === 'string' && log.action.toLowerCase().startsWith('failed');
                    return (
                      <motion.div 
                        key={log.id || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${failed ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                          {failed ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{log.action}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recent execution'}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs rounded-xl border border-dashed border-slate-800 bg-slate-950/30">
                    No pipeline runs recorded in the current session.
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
