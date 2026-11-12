"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Filter, History, ChevronRight, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PromptManagerPage() {
  const prompts = [
    { name: 'Customer_Support_T1', version: 'v2.4', lastEdited: '2 hours ago', status: 'Production', testScore: '92%' },
    { name: 'Code_Review_Agent', version: 'v1.1', lastEdited: '1 day ago', status: 'Testing', testScore: '78%' },
    { name: 'Data_Extraction_JSON', version: 'v3.0', lastEdited: '3 days ago', status: 'Production', testScore: '99%' },
    { name: 'Sentiment_Analysis', version: 'v1.0', lastEdited: '5 days ago', status: 'Draft', testScore: '--' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Prompt Vault
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Version control, SHA-256 governance verification, and A/B testing for system prompts.
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<PenTool className="w-4 h-4" />}>
          Create Prompt
        </Button>
      </div>

      <div className="teal-glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row justify-between gap-4 bg-[var(--surface-secondary)]/50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search prompts by name or tag..."
              className="w-full pl-9 pr-4 py-2 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
            />
          </div>
          <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
            Filter
          </Button>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {prompts.map((prompt, idx) => (
            <motion.div
              key={prompt.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="p-4 sm:p-6 hover:bg-[var(--surface-secondary)]/60 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="bg-[var(--accent-soft-alpha)] p-3 rounded-xl border border-[var(--accent-primary)]/20">
                  <FileText className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {prompt.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                    <span className="font-mono bg-[var(--surface-secondary)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded text-[var(--text-primary)]">
                      {prompt.version}
                    </span>
                    <span className="flex items-center gap-1">
                      <History className="w-3 h-3" /> {prompt.lastEdited}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                    Test Score
                  </p>
                  <p className="text-sm font-semibold font-mono text-[var(--text-primary)]">
                    {prompt.testScore}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    prompt.status === 'Production'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : prompt.status === 'Testing'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {prompt.status}
                </span>

                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors hidden sm:block" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
