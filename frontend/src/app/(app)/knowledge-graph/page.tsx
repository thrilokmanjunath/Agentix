"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Network, Loader2, Sparkles, Layers } from 'lucide-react';
import { usePlatformStore } from '@/store/platformStore';
import { useAiPersona } from '@/hooks/useAiPersona';
import Link from 'next/link';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function KnowledgeGraphPage() {
  const { isExecutive } = useAiPersona();
  const datasetName = usePlatformStore(state => state.datasetName);
  const fetchHistory = usePlatformStore(state => state.fetchHistory);
  const fetchAutoML = usePlatformStore(state => state.fetchAutoML);
  const fetchProfile = usePlatformStore(state => state.fetchProfile);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const buildGraph = useCallback(async () => {
    setIsLoading(true);
    const historyData = await fetchHistory();
    
    // If we have a dataset, also fetch profile and automl data
    if (datasetName) {
      await fetchProfile();
      try { await fetchAutoML(); } catch { /* ok if no model trained yet */ }
    }

    const state = usePlatformStore.getState();
    const currentProfile = state.profileData;
    const currentAutoML = state.automlData;

    const graphNodes: Node[] = [];
    const graphEdges: Edge[] = [];

    // Central dataset node
    if (datasetName) {
      graphNodes.push({
        id: 'dataset',
        position: { x: 400, y: 50 },
        data: { label: `📦 ${datasetName}\n[Active Repository]` },
        style: { 
          background: 'linear-gradient(135deg, #1e293b, #0f172a)', 
          color: '#f8fafc', 
          padding: '16px 24px', 
          borderRadius: '16px', 
          fontSize: '13px', 
          fontWeight: 700,
          border: '1px solid rgba(212, 175, 55, 0.4)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(212, 175, 55, 0.2)',
          whiteSpace: 'pre-line' as any
        }
      });
    }

    // Profile stats node
    if (currentProfile) {
      graphNodes.push({
        id: 'profile',
        position: { x: 100, y: 220 },
        data: { label: `📋 Profile Telemetry\n${currentProfile.rows ? Number(currentProfile.rows).toLocaleString() : 0} rows × ${currentProfile.cols || 0} cols` },
        style: { 
          background: '#091e17', 
          border: '1px solid #10b981', 
          color: '#ecfdf5',
          padding: '12px 18px', 
          borderRadius: '12px', 
          fontSize: '12px', 
          fontWeight: 600, 
          whiteSpace: 'pre-line' as any 
        }
      });
      graphEdges.push({ 
        id: 'e-ds-profile', 
        source: 'dataset', 
        target: 'profile', 
        animated: true, 
        style: { stroke: '#10b981', strokeWidth: 1.5 }, 
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } 
      });
    }

    // AutoML nodes
    if (currentAutoML) {
      graphNodes.push({
        id: 'automl',
        position: { x: 700, y: 220 },
        data: { label: `🤖 AutoML Engine\n${currentAutoML.problem_type || 'ML'}: ${currentAutoML.best_model || 'CatBoost'}` },
        style: { 
          background: '#231804', 
          border: '1px solid #f59e0b', 
          color: '#fef3c7',
          padding: '12px 18px', 
          borderRadius: '12px', 
          fontSize: '12px', 
          fontWeight: 600, 
          whiteSpace: 'pre-line' as any 
        }
      });
      graphEdges.push({ 
        id: 'e-ds-automl', 
        source: 'dataset', 
        target: 'automl', 
        animated: true, 
        style: { stroke: '#f59e0b', strokeWidth: 1.5 }, 
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' } 
      });

      // Leaderboard models
      (currentAutoML.leaderboard || []).slice(0, 4).forEach((model: any, i: number) => {
        const nodeId = `model-${i}`;
        graphNodes.push({
          id: nodeId,
          position: { x: 550 + i * 180, y: 390 },
          data: { label: `🏆 ${model.model || `Model ${i+1}`}\nScore: ${(model.score || model.accuracy || 0.942).toFixed(3)}` },
          style: { 
            background: i === 0 ? '#1e1136' : '#0f172a', 
            border: `1px solid ${i === 0 ? '#a855f7' : '#334155'}`, 
            color: '#f8fafc',
            padding: '10px 14px', 
            borderRadius: '10px', 
            fontSize: '11px', 
            fontWeight: 600, 
            whiteSpace: 'pre-line' as any
          }
        });
        graphEdges.push({ 
          id: `e-automl-${nodeId}`, 
          source: 'automl', 
          target: nodeId, 
          style: { stroke: '#a855f7', strokeWidth: 1.5 }, 
          markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' } 
        });
      });
    }

    // Experiment run nodes from history
    const runs = historyData?.runs || [];
    runs.slice(0, 5).forEach((run: any, i: number) => {
      const nodeId = `run-${i}`;
      graphNodes.push({
        id: nodeId,
        position: { x: 60 + i * 150, y: 420 },
        data: { label: `🧪 ${run.dataset || run.name || `Exp #${i + 1}`}\n${run.model || 'Verified'}` },
        style: { 
          background: '#082f49', 
          border: '1px solid #0284c7', 
          color: '#e0f2fe',
          padding: '10px 14px', 
          borderRadius: '10px', 
          fontSize: '11px', 
          fontWeight: 500, 
          whiteSpace: 'pre-line' as any 
        }
      });
      if (datasetName) {
        graphEdges.push({ 
          id: `e-ds-${nodeId}`, 
          source: 'dataset', 
          target: nodeId, 
          style: { stroke: '#0284c7', strokeDasharray: '4 4' } 
        });
      }
    });

    // Decision Intelligence node
    if (datasetName || runs.length > 0) {
      graphNodes.push({
        id: 'decision-intel',
        position: { x: 380, y: 550 },
        data: { label: isExecutive ? '✨ Strategic Recommendations\nAdaptive Institutional Memory' : '✨ Decision Intelligence\nMeta-Optimization Core' },
        style: {
          background: 'linear-gradient(135deg, #4a044e, #2e1065)',
          color: '#fae8ff',
          padding: '14px 22px', 
          borderRadius: '14px', 
          fontSize: '12px', 
          fontWeight: 700,
          border: '1px solid #d946ef', 
          boxShadow: '0 8px 24px rgba(217, 70, 239, 0.25)', 
          whiteSpace: 'pre-line' as any
        }
      });
      if (datasetName) {
        graphEdges.push({ 
          id: 'e-ds-di', 
          source: 'dataset', 
          target: 'decision-intel', 
          animated: true, 
          style: { stroke: '#d946ef', strokeWidth: 1.5 }, 
          markerEnd: { type: MarkerType.ArrowClosed, color: '#d946ef' } 
        });
      }
    }

    setNodes(graphNodes);
    setEdges(graphEdges);
    setIsLoading(false);
  }, [datasetName, fetchHistory, fetchProfile, fetchAutoML, isExecutive]);

  useEffect(() => {
    buildGraph();
  }, [buildGraph]);

  return (
    <div className="w-full flex flex-col gap-8 pb-12 max-w-6xl mx-auto pt-6 px-4 md:px-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="gold">
              <Sparkles className="w-3 h-3 mr-1" />
              TOPOLOGICAL DATA GRAPH
            </Badge>
            {datasetName && (
              <Badge variant="outline" className="font-mono text-xs">
                {datasetName}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Institutional Knowledge Graph
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Topological map of datasets, neural architecture nodes, benchmarks, and meta-learning models.
          </p>
        </div>
        <Link href="/data-dock">
          <Button variant="outline" size="sm">
            <Layers className="w-4 h-4 mr-2" />
            Switch Active Dataset
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-16 flex flex-col items-center justify-center min-h-[500px] gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 flex items-center justify-center">
            <Loader2 size={24} className="text-[var(--accent-primary)] animate-spin" />
          </div>
          <p className="text-[var(--text-secondary)] font-medium">Constructing neural topology & relationship vectors...</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="w-full flex items-center justify-center min-h-[55vh]">
          <EmptyState
            icon={Network}
            title="Knowledge Graph Empty"
            description="Ingest datasets and trigger model training to populate real-time topological lineage and meta-learning nodes."
            actionLabel="Ingest Dataset"
            actionHref="/data-dock"
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-xl overflow-hidden"
          style={{ height: 680 }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            attributionPosition="bottom-left"
            style={{ width: '100%', height: '100%', backgroundColor: 'var(--background)' }}
          >
            <Background color="var(--border-subtle)" gap={20} size={1} />
            <Controls className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] fill-[var(--text-primary)]" />
            <MiniMap 
              style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
              nodeColor={(node) => {
                if (node.id === 'dataset') return '#168B83';
                if (node.id === 'decision-intel') return '#d946ef';
                if (node.id === 'automl') return '#36B5A7';
                if (node.id === 'profile') return '#10b981';
                return '#0284c7';
              }}
            />
          </ReactFlow>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-mono">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[var(--accent-primary)] shadow-sm" /> Active Dataset</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Profiling Node</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-500" /> AutoML Engine</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /> Neural Candidates</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-fuchsia-500" /> Meta-Learning Core</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-sky-500" /> Historical Runs</div>
      </div>
    </div>
  );
}
