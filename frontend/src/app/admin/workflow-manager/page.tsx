"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Plus, GitBranch, Zap, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function WorkflowManagerPage() {
  const workflows = [
    { name: 'Daily Data Aggregation', type: 'Scheduled', runs: '24', successRate: '100%', active: true },
    { name: 'Email Lead Extraction', type: 'Webhook', runs: '1,492', successRate: '98.5%', active: true },
    { name: 'Customer Sentiment Alert', type: 'Trigger', runs: '84', successRate: '92.1%', active: false },
  ];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = workflows[selectedIdx];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Workflow Manager
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Design and monitor agentic automations and pipelines.
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Sidebar List */}
        <div className="lg:col-span-1 teal-glass-card rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50">
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">Active Workflows</h2>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-[var(--border-subtle)]">
            {workflows.map((wf, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <button
                  key={wf.name}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`w-full text-left p-4 cursor-pointer transition-colors border-l-4 ${
                    isSelected
                      ? 'bg-[var(--accent-soft-alpha)] border-[var(--accent-primary)]'
                      : 'hover:bg-[var(--surface-secondary)]/60 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3
                      className={`font-semibold text-sm ${
                        isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {wf.name}
                    </h3>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        wf.active ? 'bg-emerald-500' : 'bg-[var(--text-muted)]'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {wf.type}
                    </span>
                    <span>&bull;</span>
                    <span>{wf.successRate}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workflow Canvas */}
        <div className="lg:col-span-3 bg-[var(--surface-secondary)]/40 rounded-2xl shadow-sm border border-[var(--border-subtle)] overflow-hidden relative flex flex-col">
          <div
            className="relative z-10 p-4 border-b border-[var(--border-subtle)] teal-glass flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-[var(--text-primary)]">{selected.name}</h2>
              <Badge variant={selected.active ? 'success' : 'neutral'} size="sm">
                {selected.active ? 'Running' : 'Standby'}
              </Badge>
            </div>
            <button
              type="button"
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-md transition-colors"
              aria-label="Workflow options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="relative z-10 flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-5">
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="teal-glass-card p-4 rounded-xl w-64 text-center"
              >
                <div className="bg-amber-500/15 text-amber-600 dark:text-amber-400 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-[var(--text-primary)]">Cron Trigger</h4>
                <p className="text-xs text-[var(--text-secondary)]">Every day at 00:00 UTC</p>
              </motion.div>

              <div className="w-0.5 h-7 bg-[var(--border-strong)]" />

              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="teal-glass-card p-4 rounded-xl w-64 text-center"
              >
                <div className="bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Network className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-[var(--text-primary)]">Data Fetch Agent</h4>
                <p className="text-xs text-[var(--text-secondary)]">Extract from 3 verified sources</p>
              </motion.div>

              <div className="w-0.5 h-7 bg-[var(--border-strong)]" />

              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.16 }}
                className="teal-glass-card p-4 rounded-xl w-64 text-center"
              >
                <div className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2">
                  <GitBranch className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-[var(--text-primary)]">Summary Generator</h4>
                <p className="text-xs text-[var(--text-secondary)]">Air-Gapped LLM Processing</p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
