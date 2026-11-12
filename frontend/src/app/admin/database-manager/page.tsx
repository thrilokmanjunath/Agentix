"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Table as TableIcon, Plus, Play, Code2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DatabaseManagerPage() {
  const tables = [
    { name: 'users', rows: '12,483', size: '45 MB', status: 'Healthy' },
    { name: 'conversations', rows: '142,091', size: '1.2 GB', status: 'Healthy' },
    { name: 'agent_logs', rows: '2.4M', size: '18.4 GB', status: 'Optimizing' },
    { name: 'workflows', rows: '842', size: '2 MB', status: 'Healthy' },
    { name: 'api_keys', rows: '4,102', size: '1 MB', status: 'Healthy' },
  ];

  const [query, setQuery] = useState('SELECT id, email, role FROM users LIMIT 10;');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Database Console
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Inspect tenant schemas, storage tables, and read-only SQL queries.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SQL Console */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="teal-glass-card rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-[var(--surface-secondary)] px-4 py-2.5 flex items-center justify-between border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-[var(--text-primary)] text-xs font-mono font-semibold">
                <Code2 className="w-4 h-4 text-[var(--accent-primary)]" /> SQL Query Inspector
              </div>
              <Button variant="primary" size="sm" leftIcon={<Play className="w-3 h-3 fill-current" />}>
                Run Query
              </Button>
            </div>
            <textarea
              className="w-full h-40 bg-[var(--surface-primary)] text-[var(--text-primary)] font-mono p-4 focus:outline-none resize-none text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck="false"
            />
          </div>

          <div className="teal-glass-card rounded-2xl p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-sm font-semibold text-[var(--text-primary)]">
              Query Results
            </div>
            <div className="p-8 text-center text-[var(--text-muted)] text-sm flex flex-col items-center justify-center gap-2">
              <TableIcon className="w-8 h-8 opacity-40" />
              Run a query to inspect governed table results.
            </div>
          </div>
        </motion.div>

        {/* Schema Explorer */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="teal-glass-card rounded-2xl flex flex-col"
        >
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--surface-secondary)]/50">
            <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--accent-primary)]" /> Tables
            </h2>
            <button
              type="button"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label="Refresh schema"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-[var(--border-subtle)]">
              {tables.map((table) => (
                <li
                  key={table.name}
                  className="p-4 hover:bg-[var(--surface-secondary)]/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                      {table.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        table.status === 'Healthy'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {table.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <span>{table.rows} rows</span>
                    <span>{table.size}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-[var(--border-strong)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Table
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
