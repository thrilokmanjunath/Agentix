"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Server } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

const THROUGHPUT_SERIES = Array.from({ length: 40 }, (_, i) =>
  Math.round(35 + Math.sin(i * 0.45) * 20 + ((i * 17) % 25))
);

export default function MonitoringPage() {
  const metrics = [
    { label: 'CPU Usage', value: '48%', accent: 'text-[var(--accent-primary)]', bar: 'bg-[var(--accent-primary)]', width: '48%' },
    { label: 'Memory', value: '72%', accent: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', width: '72%' },
    { label: 'Storage', value: '31%', accent: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', width: '31%' },
    { label: 'Network I/O', value: '65%', accent: 'text-sky-600 dark:text-sky-400', bar: 'bg-sky-500', width: '65%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            System Monitoring
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time infrastructure health and performance metrics.
          </p>
        </div>
        <Badge variant="success" size="md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          All Systems Operational
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 teal-glass-card rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Throughput (Requests/sec)
            </h2>
            <select className="text-xs bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]">
              <option>Last 1 Hour</option>
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>

          <div className="h-72 w-full flex items-end gap-1">
            {THROUGHPUT_SERIES.map((height, i) => (
              <div
                key={i}
                className="flex-1 h-full bg-[var(--surface-secondary)] rounded-t-sm relative group hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div
                  className="absolute bottom-0 w-full bg-[var(--accent-primary)] rounded-t-sm transition-all"
                  style={{ height: `${height}%` }}
                />
                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--text-primary)] text-[var(--background)] text-[10px] font-mono px-2 py-1 rounded pointer-events-none z-10 whitespace-nowrap shadow-md">
                  {height * 10} req/s
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="teal-glass-card rounded-2xl p-6 space-y-6"
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Resource Utilization
          </h2>

          <div className="space-y-5">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {metric.label}
                  </span>
                  <span className={`text-sm font-bold font-mono ${metric.accent}`}>
                    {metric.value}
                  </span>
                </div>
                <div className="w-full bg-[var(--surface-secondary)] h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: metric.width }}
                    transition={{ duration: 0.7, delay: 0.15 }}
                    className={`h-full ${metric.bar} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-[var(--text-muted)]" /> Infrastructure Nodes
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-emerald-500/25 bg-emerald-500/10 p-3 rounded-xl flex flex-col gap-1">
                <span className="text-xs text-[var(--text-secondary)] font-medium">Worker Nodes</span>
                <span className="text-xl font-bold font-mono text-[var(--text-primary)]">12/12</span>
              </div>
              <div className="border border-amber-500/25 bg-amber-500/10 p-3 rounded-xl flex flex-col gap-1">
                <span className="text-xs text-[var(--text-secondary)] font-medium">GPU Nodes</span>
                <span className="text-xl font-bold font-mono text-[var(--text-primary)]">3/4</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
