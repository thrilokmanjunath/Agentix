"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  Database,
  Zap,
  BrainCircuit,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const ACTIVITY_SERIES = [
  42, 58, 35, 64, 71, 49, 55, 78, 86, 62, 54, 73,
  89, 94, 67, 51, 60, 77, 83, 69, 48, 56, 72, 65,
];

export default function AdminDashboardPage() {
  const stats = [
    { name: 'Total Users', value: '12,483', change: '+14%', icon: Users, accent: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
    { name: 'Active Agents', value: '842', change: '+5%', icon: BrainCircuit, accent: 'text-[var(--accent-primary)]', bg: 'bg-[var(--accent-soft-alpha)]' },
    { name: 'Queries / hr', value: '45.2k', change: '+22%', icon: Zap, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { name: 'Database Load', value: '42%', change: '-4%', icon: Database, accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Admin Overview
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Platform governance overview and real-time infrastructure telemetry.
          </p>
        </div>
        <Button variant="primary" size="sm">
          Download Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="teal-glass-card p-6 rounded-2xl flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.accent}`} />
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  stat.change.startsWith('+')
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <h3 className="text-[var(--text-secondary)] text-sm font-medium">{stat.name}</h3>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 teal-glass-card rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">System Activity</h2>
            <span className="text-xs font-mono text-[var(--accent-primary)] font-medium">
              24h Throughput
            </span>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {ACTIVITY_SERIES.map((height, i) => (
              <div
                key={i}
                className="w-full h-full bg-[var(--surface-secondary)] rounded-t-md relative group"
              >
                <div
                  className="absolute bottom-0 w-full bg-[var(--accent-primary)] rounded-t-md transition-all duration-300 group-hover:bg-[var(--accent-hover)]"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs font-mono text-[var(--text-muted)] mt-4">
            <span>00:00</span>
            <span>12:00</span>
            <span>24:00</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="teal-glass-card rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Recent Alerts</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <div className="bg-amber-500/15 p-2 rounded-full mt-0.5 shrink-0">
                  <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">
                    Inference Latency Check
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Guardrail audit completed within SLA threshold.
                  </p>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{i * 10} mins ago</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
