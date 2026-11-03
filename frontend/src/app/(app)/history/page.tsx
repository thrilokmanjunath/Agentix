"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Clock, Cpu, FlaskConical, TrendingUp, Loader2, Sparkles, Database } from 'lucide-react';
import { usePlatformStore } from '@/store/platformStore';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function HistoryPage() {
  const fetchHistory = usePlatformStore(state => state.fetchHistory);
  const [runs, setRuns] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchHistory();
      setRuns(data.runs || []);
      setActivity(data.activity || []);
      setIsLoading(false);
    };
    load();
  }, [fetchHistory]);

  const hasData = runs.length > 0 || activity.length > 0;

  return (
    <div className="w-full flex flex-col gap-8 pb-12 max-w-5xl mx-auto pt-6 px-4 md:px-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="gold">
              <Sparkles className="w-3 h-3 mr-1" />
              AUDIT TRAILS & PROVENANCE
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-100 font-serif">
            Institutional Execution History
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Chronological audit log of model training runs, dataset transformations, and system events.
          </p>
        </div>
        <Link href="/data-dock">
          <Button variant="outline" size="sm">
            <Database className="w-4 h-4 mr-2 text-amber-400" />
            Launch New Run
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-16 flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Loader2 size={24} className="text-amber-400 animate-spin" />
          </div>
          <p className="text-slate-300 font-medium">Retrieving institutional activity logs...</p>
        </div>
      ) : !hasData ? (
        <div className="w-full flex items-center justify-center min-h-[55vh]">
          <EmptyState
            icon={History}
            title="No Execution History Found"
            description="All automated workflows, data cleaning pipelines, and model evaluation runs will be indexed here with complete audit trails."
            actionLabel="Start First Pipeline"
            actionHref="/data-dock"
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Experiment Runs */}
          {runs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md shadow-xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2 font-serif">
                  <FlaskConical size={18} className="text-amber-400" /> Experiment Runs
                </h2>
                <Badge variant="outline" className="font-mono text-xs">{runs.length} Runs Logged</Badge>
              </div>
              <div className="divide-y divide-slate-800/80">
                {runs.map((run: any, i: number) => (
                  <div key={i} className="p-5 hover:bg-slate-800/30 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Cpu size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-200 text-sm">{run.dataset || run.name || `Experiment #${i + 1}`}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{run.model || run.algorithm || 'CatBoost'} &bull; {run.created_at ? new Date(run.created_at).toLocaleDateString() : 'Recent'}</p>
                      </div>
                    </div>
                    {run.score !== undefined && (
                      <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                        <TrendingUp size={14} className="text-emerald-400" />
                        <span className="text-xs font-mono font-semibold text-emerald-400">
                          {typeof run.score === 'number' ? run.score.toFixed(4) : run.score}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Activity Log */}
          {activity.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md shadow-xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2 font-serif">
                  <Clock size={18} className="text-amber-400" /> System Activity Log
                </h2>
                <Badge variant="outline" className="font-mono text-xs">Live Journal</Badge>
              </div>
              <div className="divide-y divide-slate-800/80 font-mono text-xs">
                {activity.slice(0, 20).map((item: any, i: number) => (
                  <div key={i} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-slate-300 font-sans text-sm">{item.action || item.type || item.message || 'Workflow executed'}</span>
                    </div>
                    <span className="text-slate-500 text-xs shrink-0">{item.created_at ? new Date(item.created_at).toLocaleTimeString() : 'Recent'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
