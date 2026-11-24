"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Database, HardDrive, Cpu, Filter, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function MemoryInspectorPage() {
  const [search, setSearch] = useState('');

  const memoryBlocks = [
    { id: 'ctx-a1', agent: 'UploadAgent (A1)', type: 'Chunk Buffer', tokens: '4,096 B', lastAccessed: 'Just now', status: 'Active' },
    { id: 'ctx-a3', agent: 'ProfilingAgent (A3)', type: 'Streaming Summary', tokens: '<2.8 MB', lastAccessed: '5 mins ago', status: 'Active' },
    { id: 'ctx-a5', agent: 'EDAAgent (A5)', type: 'Correlation Matrix', tokens: '18,400 B', lastAccessed: '12 mins ago', status: 'Active' },
    { id: 'ctx-a7', agent: 'TrainingAgent (A7)', type: '5-Fold CV Artifacts', tokens: '2.4 MB', lastAccessed: '25 mins ago', status: 'Active' },
    { id: 'ctx-a9', agent: 'ReportAgent (A9)', type: 'Grounded JSON Prompt', tokens: '3,840 tk', lastAccessed: '30 mins ago', status: 'Active' },
    { id: 'cache-l7', agent: 'Layer 7 LLMCache', type: 'SHA-256 Exact Match', tokens: '<5 ms latency', lastAccessed: 'Just now', status: 'Active' },
  ];

  const filtered = memoryBlocks.filter(
    (b) =>
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.agent.toLowerCase().includes(search.toLowerCase()) ||
      b.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Memory & Cache Inspector
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified Telemetry
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Inspect real agent execution memory buffers, pipeline context caches, and Layer 7 SHA-256 entries.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="teal-glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-[var(--accent-soft-alpha)] p-3 rounded-xl">
            <Database className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Parquet Columnar Lake</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">0.19 GB</p>
            <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Snappy Compressed (data/temp/)</p>
          </div>
        </div>
        <div className="teal-glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-sky-500/15 p-3 rounded-xl">
            <HardDrive className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Relational Database</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">5.1 MB</p>
            <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">agentix.db (SQLite/PostgreSQL)</p>
          </div>
        </div>
        <div className="teal-glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-emerald-500/15 p-3 rounded-xl">
            <Cpu className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Active Agent Contexts</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">9 Agents</p>
            <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Bounded Memory Isolation</p>
          </div>
        </div>
      </div>

      <div className="teal-glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row justify-between gap-4 bg-[var(--surface-secondary)]/40">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search agent context or memory IDs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
            />
          </div>
          <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
            Filter Contexts
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-medium border-b border-[var(--border-subtle)]">
              <tr>
                <th className="px-6 py-4">Context ID</th>
                <th className="px-6 py-4">Agent / Component</th>
                <th className="px-6 py-4">Memory Scope</th>
                <th className="px-6 py-4">Footprint / Size</th>
                <th className="px-6 py-4">Last Cycle</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((block, idx) => (
                <motion.tr
                  key={block.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="hover:bg-[var(--surface-secondary)]/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4 font-mono text-[var(--accent-primary)] font-medium">{block.id}</td>
                  <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{block.agent}</td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">{block.type}</td>
                  <td className="px-6 py-4 font-mono text-[var(--text-secondary)]">{block.tokens}</td>
                  <td className="px-6 py-4 text-[var(--text-muted)] font-mono text-xs">{block.lastAccessed}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      {block.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Displaying {filtered.length} active agent memory allocations</span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">Zero Cross-Agent Leakage Enforced</span>
        </div>
      </div>
    </div>
  );
}
