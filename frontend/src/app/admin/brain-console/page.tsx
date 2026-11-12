"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Cpu,
  ShieldAlert,
  Activity,
  PlayCircle,
  PauseCircle,
  ShieldCheck,
  Lock,
  KeyRound,
  FileCheck2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface GovernanceAgent {
  name: string;
  role: string;
  status: 'Active' | 'Processing' | 'Paused';
  tasks: number;
  memory: string;
}

const INITIAL_AGENTS: GovernanceAgent[] = [
  { name: 'Research_Core', role: 'Data Gatherer', status: 'Active', tasks: 12, memory: '1.2 GB' },
  { name: 'Code_Synthesis', role: 'Pipeline Guard', status: 'Paused', tasks: 0, memory: '400 MB' },
  { name: 'Data_Analyzer', role: 'AutoML Auditor', status: 'Processing', tasks: 3, memory: '2.8 GB' },
];

const SECURITY_CONTROLS = [
  {
    name: 'Multi-Tenant Isolation',
    detail: 'Row-level owner scoping enforced on datasets, workflows, and vector partitions.',
    status: 'Enforced',
    icon: Lock,
  },
  {
    name: 'Auth & Session Hardening',
    detail: 'Native bcrypt hashing, zero-cache logout headers, and role mass-assignment blocks.',
    status: 'Certified',
    icon: KeyRound,
  },
  {
    name: 'Prompt & API Governance',
    detail: 'Sliding-window rate limiter, SHA-256 prompt validation, and OTel audit telemetry.',
    status: 'Active',
    icon: ShieldCheck,
  },
  {
    name: 'Air-Gapped Inference',
    detail: 'Hardware-bound local Ollama routing with strict zero-leakage egress controls.',
    status: 'Verified',
    icon: FileCheck2,
  },
];

export default function BrainConsolePage() {
  const [agents, setAgents] = useState<GovernanceAgent[]>(INITIAL_AGENTS);

  const toggleAgentStatus = (name: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.name === name
          ? { ...a, status: a.status === 'Paused' ? 'Active' : 'Paused' }
          : a
      )
    );
  };

  const toggleAllAgents = () => {
    const anyRunning = agents.some((a) => a.status !== 'Paused');
    setAgents((prev) =>
      prev.map((a) => ({
        ...a,
        status: anyRunning ? 'Paused' : 'Active',
      }))
    );
  };

  const handleSpawnAgent = () => {
    const idx = agents.length + 1;
    setAgents((prev) => [
      ...prev,
      {
        name: `Guard_Node_0${idx}`,
        role: 'Compliance Verifier',
        status: 'Active',
        tasks: 1,
        memory: '512 MB',
      },
    ]);
  };

  const allPaused = agents.every((a) => a.status === 'Paused');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="teal" size="sm">
              <ShieldCheck size={11} />
              Security & Governance
            </Badge>
            <Badge variant="local" size="sm">
              8-Layer Certified
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Security & Governance Console
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Central command for autonomous AI swarm governance, security posture, and guardrail telemetry.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={toggleAllAgents}>
            {allPaused ? 'Resume All Agents' : 'Halt All Agents'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSpawnAgent}
            leftIcon={<Brain className="w-4 h-4" />}
          >
            Spawn Agent
          </Button>
        </div>
      </div>

      {/* 8-Layer Security & Governance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SECURITY_CONTROLS.map((ctrl, idx) => {
          const Icon = ctrl.icon;
          return (
            <motion.div
              key={ctrl.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="teal-glass-card rounded-2xl p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                  <Icon className="w-4 h-4" />
                </div>
                <Badge variant="success" size="sm">
                  {ctrl.status}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{ctrl.name}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {ctrl.detail}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Roster */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Agent Swarm Status
            </h2>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              {agents.filter((a) => a.status !== 'Paused').length}/{agents.length} Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent, idx) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="teal-glass-card rounded-2xl p-5"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--accent-soft-alpha)] p-2.5 rounded-xl border border-[var(--accent-primary)]/25">
                      <Cpu className="w-5 h-5 text-[var(--accent-primary)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">{agent.name}</h3>
                      <p className="text-xs text-[var(--text-secondary)]">{agent.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAgentStatus(agent.name)}
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
                    aria-label={agent.status === 'Paused' ? `Resume ${agent.name}` : `Pause ${agent.name}`}
                    title={agent.status === 'Paused' ? 'Resume agent' : 'Pause agent'}
                  >
                    {agent.status === 'Paused' ? (
                      <PlayCircle className="w-6 h-6" />
                    ) : (
                      <PauseCircle className="w-6 h-6" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-1">
                      Status
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium inline-block ${
                        agent.status === 'Active' || agent.status === 'Processing'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-1">
                      Active Tasks
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{agent.tasks}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-1">
                      Memory
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{agent.memory}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Global Control & Alerts */}
        <div className="space-y-6">
          <Card variant="teal">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
                Global Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5 text-[var(--text-secondary)]">
                  <span>Swarm CPU Load</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">78%</span>
                </div>
                <div className="w-full bg-[var(--surface-secondary)] rounded-full h-2 overflow-hidden">
                  <div className="bg-[var(--accent-primary)] h-2 rounded-full w-[78%] transition-all" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5 text-[var(--text-secondary)]">
                  <span>API Quota (Today)</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">42%</span>
                </div>
                <div className="w-full bg-[var(--surface-secondary)] rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full w-[42%] transition-all" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Governance Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Agent boundary verified</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Data_Analyzer passed strict tenant isolation check
                  </p>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Rate limit threshold watch</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Tenant burst ceiling calibrated at 1000 req/min
                  </p>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Audit telemetry synced</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    41/41 institutional security assertions passing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
