"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Clock,
  Cpu,
  FileSpreadsheet,
  Shield,
  Lock,
  Database
} from 'lucide-react';
import { usePlatformStore } from '@/store/platformStore';
import { useRouter } from 'next/navigation';
import { getTerm } from '@/lib/terminology';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function DatasetsPage() {
  const router = useRouter();
  const { uploadDataset, pollJobStatus, jobStatus, clearJob, setDatasetName, uploadProgress } = usePlatformStore();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (!jobStatus) return;
    if (jobStatus.status === 'completed') {
      if (phase === 'idle') {
        clearJob();
        return;
      }
      setPhase('completed');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      const timer = setTimeout(() => {
        router.push('/insights');
      }, 2000);
      return () => clearTimeout(timer);
    }
    if (jobStatus.status === 'failed') {
      if (phase === 'idle') {
        clearJob();
        return;
      }
      setPhase('error');
      setUploadError(jobStatus.error || 'Pipeline processing failed.');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [jobStatus, router, phase, clearJob]);

  const startPolling = useCallback((jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const status = await pollJobStatus(jobId);
      if (status && (status.status === 'completed' || status.status === 'failed')) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 3000);
  }, [pollJobStatus]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setPhase('uploading');
    setUploadError(null);
    clearJob();

    try {
      const result = await uploadDataset(selectedFile);
      if (result) {
        setDatasetName(result.dataset_name);
        setPhase('processing');
        startPolling(result.job_id);
      } else {
        setUploadError(usePlatformStore.getState().error || 'Upload failed. Please check file format.');
        setPhase('error');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
      setPhase('error');
    }
  }, [uploadDataset, setDatasetName, clearJob, startPolling]);

  const handleRetry = () => {
    setFile(null);
    setPhase('idle');
    setUploadError(null);
    clearJob();
  };

  const onDropRejected = useCallback(() => {
    setUploadError('Invalid file format. Please upload a standard CSV, Excel, or JSON file.');
    setPhase('error');
    clearJob();
  }, [clearJob]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
  });

  const progress = jobStatus?.progress ?? 0;
  const currentStageIndex = jobStatus?.current_stage_index ?? 0;
  const estimatedRemaining = jobStatus?.estimated_remaining ?? 0;

  const formatETA = (seconds: number) => {
    if (seconds <= 0) return 'Analyzing stages...';
    if (seconds < 60) return `${seconds}s remaining`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s remaining`;
  };

  return (
    <div className="w-full flex flex-col gap-8 pb-16 max-w-5xl mx-auto pt-8 px-6 font-sans text-slate-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="gold" size="sm">
              <Database size={11} />
              Data Engineering Dock
            </Badge>
            <Badge variant="local" size="sm">
              <Lock size={11} />
              Isolated Storage
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
            Dataset Ingestion & Profiling
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ingest structured tabular files for automated 9-stage profiling, cleaning, feature engineering, and model training.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-14 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[420px] ${
                isDragActive
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                  : 'border-slate-800/80 bg-slate-900/40 hover:border-amber-500/40 hover:bg-slate-900/60 shadow-xl'
              }`}
            >
              <input {...getInputProps()} />
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
                  isDragActive ? 'bg-amber-400 text-slate-950 shadow-lg scale-110' : 'bg-slate-800/70 border border-slate-700/60 text-amber-400 shadow-md'
                }`}
              >
                <UploadCloud size={36} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-100 mb-2 font-heading">
                {isDragActive ? 'Release dataset to begin ingestion' : 'Ingest Tabular Dataset'}
              </h3>
              <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
                Drag and drop your dataset here or click to browse. Supports CSV, Parquet, and JSON files up to 500MB.
              </p>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">.CSV</span>
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">.XLSX</span>
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">.JSON</span>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="border border-slate-800 rounded-2xl p-14 flex flex-col items-center justify-center text-center bg-slate-900/70 shadow-xl min-h-[400px]"
          >
            <div className="w-18 h-18 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400">
              <Loader2 size={36} className="animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">
              Ingesting {file?.name}...
            </h3>
            <p className="text-slate-400 text-sm mb-6">Uploading securely to isolated tenant storage.</p>
            
            <div className="w-full max-w-md">
              <div className="flex justify-between mb-2 text-xs font-mono">
                <span className="text-slate-400">Stream Progress</span>
                <span className="text-amber-300 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden font-mono"
          >
            <div className="p-8 border-b border-slate-800/80">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Cpu size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 font-sans">Executing Pipeline: {file?.name}</h2>
                  <p className="text-slate-400 text-xs flex items-center gap-2 mt-1 font-mono">
                    <Clock size={13} className="text-amber-400" />
                    {formatETA(estimatedRemaining)}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold text-amber-300">{progress}%</div>
                  <div className="text-[11px] text-slate-500 font-sans">
                    Multi-Stage Autonomous ML
                  </div>
                </div>
              </div>

              <div className="w-full flex items-center gap-4 mb-2">
                <div className="text-amber-400 font-bold text-xs">
                  {progress < 10 ? `0${progress}` : progress}%
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-950/70 text-xs space-y-3">
              {[
                { label: 'Ingestion & Validation', index: -1 },
                { label: 'Data Quality & Imputation', index: 0 },
                { label: 'Profiling & Distribution', index: 1 },
                { label: 'Feature Engineering', index: 2 },
                { label: 'AutoML Model Training', index: 3 },
                { label: 'XAI Explainability', index: 4 },
                { label: 'Report Compilation', index: 5 },
              ].map((stage) => {
                const isDone = stage.index < currentStageIndex;
                const isActive = stage.index === currentStageIndex;

                let statusText = 'Queued';
                let statusColor = 'text-slate-600';
                
                if (stage.index === -1 || isDone) {
                   statusText = 'Completed';
                   statusColor = 'text-emerald-400';
                } else if (isActive) {
                  statusText = 'Executing';
                  statusColor = 'text-amber-300 font-bold';
                }

                return (
                  <div key={stage.label} className="flex items-center justify-between py-1.5 border-b border-slate-900 last:border-none">
                    <span className="text-slate-300 font-sans">{stage.label}</span>
                    <span className={`font-mono text-xs ${statusColor} flex items-center gap-1.5`}>
                      {isActive && <Loader2 size={11} className="animate-spin text-amber-400" />}
                      {statusText}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {phase === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-emerald-500/30 rounded-2xl p-14 flex flex-col items-center justify-center text-center bg-slate-900/80 shadow-xl min-h-[400px]"
          >
            <div className="w-18 h-18 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400">
              <CheckCircle2 size={38} />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-2 font-heading">Pipeline Complete</h3>
            <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
              All 9 autonomous stages executed successfully. Transitioning to Analysis & XAI Console...
            </p>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-medium">
              <Loader2 size={14} className="animate-spin" />
              Redirecting
              <ArrowRight size={14} />
            </div>
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-rose-500/30 rounded-2xl p-14 flex flex-col items-center justify-center text-center bg-slate-900/80 shadow-xl min-h-[400px]"
          >
            <div className="w-18 h-18 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
              <AlertCircle size={38} />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-2 font-heading">Processing Interrupted</h3>
            <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">{uploadError}</p>
            <Button
              variant="gold"
              size="md"
              onClick={handleRetry}
            >
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
