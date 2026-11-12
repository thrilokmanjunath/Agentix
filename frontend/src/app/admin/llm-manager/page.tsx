"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Key, Zap, Settings, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LLMManagerPage() {
  const providers = [
    { name: 'Local (Ollama / LM Studio)', model: 'qwen2.5:3b', status: 'Standby', latency: '115ms', cost: '$0.00', icon: 'L' },
    { name: 'OpenAI', model: 'gpt-4o', status: 'Standby', latency: '450ms', cost: '$420.50', icon: 'O' },
    { name: 'Anthropic', model: 'claude-3-opus', status: 'Standby', latency: '620ms', cost: '$180.20', icon: 'A' },
    { name: 'Google', model: 'gemini-1.5-pro', status: 'Offline', latency: '--', cost: '$12.00', icon: 'G' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            LLM Provider Manager
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure reasoning models, API boundaries, and governance routing rules.
          </p>
        </div>
        <Button variant="primary" size="sm">
          Add Provider
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider, idx) => (
          <motion.div
            key={provider.name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="teal-glass-card rounded-2xl p-6 flex flex-col"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-foreground)] flex items-center justify-center font-bold text-lg shadow-xs">
                  {provider.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{provider.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">{provider.model}</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  provider.status === 'Active'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : provider.status === 'Standby'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                }`}
              >
                {provider.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[var(--surface-secondary)]/70 p-3 rounded-xl border border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[var(--accent-primary)]" /> Avg Latency
                </p>
                <p className="text-lg font-semibold text-[var(--text-primary)] font-mono">{provider.latency}</p>
              </div>
              <div className="bg-[var(--surface-secondary)]/70 p-3 rounded-xl border border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[var(--accent-primary)]" /> MTD Cost
                </p>
                <p className="text-lg font-semibold text-[var(--text-primary)] font-mono">{provider.cost}</p>
              </div>
            </div>

            <div className="mt-auto flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" leftIcon={<Key className="w-4 h-4" />}>
                API Keys
              </Button>
              <Button variant="outline" size="sm" className="flex-1" leftIcon={<Settings className="w-4 h-4" />}>
                Settings
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 rounded-2xl p-6 flex items-start gap-4">
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] p-3 rounded-xl shrink-0">
          <Bot className="w-6 h-6 text-[var(--accent-primary)]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Smart Air-Gapped Routing Enabled</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
            Agentix enforces zero external egress by default, routing analytics tasks to <strong>configured local or private cloud runtimes</strong> with optional explicit policy fallback.
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-[var(--accent-primary)] flex items-center gap-1 hover:underline cursor-pointer"
          >
            Configure Routing Rules <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
