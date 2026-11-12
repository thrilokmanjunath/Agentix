"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Box, CheckCircle2, XCircle, RefreshCw, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ModelManagerPage() {
  const models = [
    { name: 'Predictive_Churn_v2', type: 'LightGBM', status: 'running', accuracy: '94.2%', latency: '42ms', requests: '1.2M' },
    { name: 'Sentiment_Analyzer_En', type: 'DistilBERT', status: 'running', accuracy: '89.5%', latency: '115ms', requests: '840k' },
    { name: 'Demand_Forecast_Q3', type: 'AR-Ridge', status: 'failed', accuracy: '--', latency: '--', requests: '0' },
    { name: 'Fraud_Detection_RT', type: 'RandomForest', status: 'training', accuracy: '98.1%', latency: '22ms', requests: '3.1M' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Model Registry
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Deploy, govern, and validate promoted AutoML architectures.
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Box className="w-4 h-4" />}>
          Deploy New Model
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {models.map((model, idx) => (
          <motion.div
            key={model.name}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="teal-glass-card rounded-2xl p-5 flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-[var(--surface-secondary)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                <Box className="w-5 h-5 text-[var(--accent-primary)]" />
              </div>
              {model.status === 'running' && (
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              )}
              {model.status === 'failed' && (
                <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 bg-rose-500/15 px-2.5 py-1 rounded-full text-xs font-medium">
                  <XCircle className="w-3 h-3" /> Attention
                </span>
              )}
              {model.status === 'training' && (
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-full text-xs font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Training
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-[var(--text-primary)] truncate" title={model.name}>
              {model.name}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-4">{model.type}</p>

            <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-auto">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Accuracy</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">{model.accuracy}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Latency</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">{model.latency}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Requests (30d)</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">{model.requests}</p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex gap-2">
              <button
                type="button"
                className="flex-1 flex justify-center items-center gap-1 bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Settings className="w-3 h-3" /> Config
              </button>
              {model.status !== 'training' && (
                <button
                  type="button"
                  className="flex-1 flex justify-center items-center gap-1 bg-[var(--accent-soft-alpha)] hover:opacity-85 text-[var(--accent-primary)] py-1.5 rounded-lg text-xs font-medium transition-opacity cursor-pointer"
                >
                  <Play className="w-3 h-3" /> Test
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
