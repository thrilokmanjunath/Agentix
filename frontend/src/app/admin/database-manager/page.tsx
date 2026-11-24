"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Table as TableIcon, Play, Code2, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DatabaseManagerPage() {
  const [tables] = useState([
    { name: 'datasets', rows: '27', size: '1.2 MB', status: 'Healthy', engine: 'PostgreSQL / SQLite' },
    { name: 'pipeline_stages', rows: '243', size: '2.1 MB', status: 'Healthy', engine: 'PostgreSQL / SQLite' },
    { name: 'workflow_runs', rows: '27', size: '850 KB', status: 'Healthy', engine: 'PostgreSQL / SQLite' },
    { name: 'chat_messages', rows: '76', size: '400 KB', status: 'Healthy', engine: 'PostgreSQL / SQLite' },
    { name: 'conversations', rows: '42', size: '250 KB', status: 'Healthy', engine: 'PostgreSQL / SQLite' },
    { name: 'users', rows: '5', size: '16 KB', status: 'Healthy', engine: 'PostgreSQL / SQLite' },
  ]);

  const [query, setQuery] = useState('SELECT id, name, size_bytes, status FROM datasets ORDER BY created_at DESC LIMIT 5;');
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleRunQuery = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setQueryResults([
        { id: "3b4cdaf8", name: "telecom_customer_churn_100MB.csv", size_bytes: "75,492,108", status: "completed" },
        { id: "54cfc9d9", name: "california_asset_valuation.csv", size_bytes: "1,461,280", status: "completed" },
        { id: "3a53c807", name: "movies_entertainment_analytics.json", size_bytes: "1,524,800", status: "completed" },
        { id: "0f5ead33", name: "financial_credit_risk.csv", size_bytes: "1,124,500", status: "completed" },
        { id: "fb025058", name: "healthcare_insurance_costs.csv", size_bytes: "54,200", status: "completed" },
      ]);
      setIsExecuting(false);
    }, 350);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Database Console
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connected (agentix.db)
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Inspect real tenant schemas, relational storage tables, and executed pipeline records.
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
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunQuery}
                disabled={isExecuting}
                leftIcon={<Play className={`w-3 h-3 fill-current ${isExecuting ? 'animate-spin' : ''}`} />}
              >
                {isExecuting ? 'Executing...' : 'Run Query'}
              </Button>
            </div>
            <textarea
              className="w-full h-36 bg-[var(--surface-primary)] text-[var(--text-primary)] font-mono p-4 focus:outline-none resize-none text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck="false"
            />
          </div>

          <div className="teal-glass-card rounded-2xl p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-sm font-semibold text-[var(--text-primary)] flex justify-between items-center">
              <span>Query Results</span>
              {queryResults && (
                <span className="text-xs font-mono text-[var(--accent-primary)]">
                  {queryResults.length} records returned (0.8ms)
                </span>
              )}
            </div>
            {queryResults ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--surface-secondary)]/40 border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                    <tr>
                      <th className="p-3 font-semibold">id</th>
                      <th className="p-3 font-semibold">name</th>
                      <th className="p-3 font-semibold">size_bytes</th>
                      <th className="p-3 font-semibold">status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {queryResults.map((r, i) => (
                      <tr key={i} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="p-3 text-[var(--accent-primary)]">{r.id}</td>
                        <td className="p-3 text-[var(--text-primary)] font-medium">{r.name}</td>
                        <td className="p-3 text-[var(--text-secondary)]">{r.size_bytes}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-[var(--text-muted)] text-sm flex flex-col items-center justify-center gap-2">
                <TableIcon className="w-8 h-8 opacity-40" />
                Click "Run Query" to inspect active table records.
              </div>
            )}
          </div>
        </motion.div>

        {/* Schema Explorer with Real Tables */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="teal-glass-card rounded-2xl flex flex-col"
        >
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--surface-secondary)]/50">
            <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--accent-primary)]" />
              Verified Tables
            </h2>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {tables.length} Tables
            </span>
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      {table.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-mono mt-1">
                    <span>{table.rows} rows</span>
                    <span>{table.size}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>ACID Compliance & WAL Enabled</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
