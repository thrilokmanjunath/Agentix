"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Database, HardDrive, Cpu, Filter, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function MemoryInspectorPage() {
  const [search, setSearch] = useState('');

  const memoryBlocks = [
    { id: 'mem-892', agent: 'SupportBot', type: 'Vector', tokens: '4,200', lastAccessed: '2 mins ago', status: 'Active' },
    { id: 'mem-893', agent: 'SalesAssist', type: 'Relational', tokens: '1,050', lastAccessed: '15 mins ago', status: 'Active' },
    { id: 'mem-894', agent: 'CodeCopilot', type: 'Context Window', tokens: '124,000', lastAccessed: '1 hr ago', status: 'Archived' },
    { id: 'mem-895', agent: 'DataAnalyzer', type: 'Vector', tokens: '89,100', lastAccessed: '3 hrs ago', status: 'Active' },
  ];

  const filtered = memoryBlocks.filter(
    (b) =>
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.agent.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Memory Inspector
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Inspect tenant-scoped agent memory contexts and vector RAG embeddings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="teal-glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-[var(--accent-soft-alpha)] p-3 rounded-xl">
            <Database className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Vector Storage</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">42.5 GB</p>
          </div>
        </div>
        <div className="teal-glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-sky-500/15 p-3 rounded-xl">
            <HardDrive className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Relational Cache</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">12.1 GB</p>
          </div>
        </div>
        <div className="teal-glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-emerald-500/15 p-3 rounded-xl">
            <Cpu className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Active Contexts</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">1,204</p>
          </div>
        </div>
      </div>

      <div className="teal-glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row justify-between gap-4 bg-[var(--surface-secondary)]/40">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search memory IDs or agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
            />
          </div>
          <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-medium border-b border-[var(--border-subtle)]">
              <tr>
                <th className="px-6 py-4">Memory ID</th>
                <th className="px-6 py-4">Agent</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Tokens</th>
                <th className="px-6 py-4">Last Accessed</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
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
                  <td className="px-6 py-4 text-[var(--text-muted)]">{block.lastAccessed}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        block.status === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {block.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Row actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Showing {filtered.length} of {memoryBlocks.length} results</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Prev</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
