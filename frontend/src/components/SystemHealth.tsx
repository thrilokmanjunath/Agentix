"use client";
import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Activity, Server, Thermometer, CheckCircle2, AlertCircle } from 'lucide-react';
import { backendFetch } from '@/lib/backendClient';

interface HealthData {
  cpu: { usage_percent: number; cores_logical: number };
  ram: { total_gb: number; available_gb: number; usage_percent: number };
  gpu: { available: boolean; vendor: string | null; model: string | null; vram_total_mb: number };
  ollama: { online: boolean; models: { name: string }[] };
}

export function SystemHealthDashboard({ simplified = false }: { simplified?: boolean }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchHealth = () => {
      backendFetch('/api/v1/platform/system-health')
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(json => {
          if (!isMounted) return;
          setHealth(json?.data || null);
          setOnline(true);
        })
        .catch(() => {
          if (isMounted) setOnline(false);
        });
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const modelName = health?.ollama?.online ? health.ollama.models?.[0]?.name : null;

  if (simplified) {
    const healthy = online && !!health;
    return (
      <div className="teal-glass rounded-[2rem] overflow-hidden w-full p-8 md:p-10 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl shadow-lg ${healthy ? 'bg-[var(--accent-primary)] text-[var(--accent-foreground)]' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'}`}>
            {healthy ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] font-heading tracking-tight">Your AI Assistant</h2>
            <p className="text-[var(--text-secondary)] mt-1 font-medium">
              {!online ? 'Backend is unreachable right now.' : modelName ? `Running smoothly on ${modelName}.` : 'Backend is online, but no local AI model is loaded.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teal-glass rounded-[2rem] overflow-hidden w-full p-8 md:p-10 transition-all duration-300">
      <div className="flex items-center gap-4 mb-8 border-b border-[var(--border-subtle)] pb-6">
        <div className="p-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--accent-foreground)] shadow-lg">
          <Activity size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] font-heading tracking-tight">System Health & AI Resources</h2>
          <p className="text-[var(--text-secondary)] mt-1 font-medium">{online ? 'Real-time resource utilization' : 'Backend unreachable — showing last known state'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* CPU */}
        <div className="teal-glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-[var(--accent-primary)]">
            <Cpu size={20} />
            <span className="font-semibold text-sm">CPU Usage</span>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--text-primary)]">{health ? `${health.cpu.usage_percent.toFixed(1)}%` : '—'}</div>
            <div className="w-full bg-[var(--surface-secondary)] rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${health?.cpu.usage_percent ?? 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* GPU */}
        <div className="teal-glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-[var(--accent-primary)]">
            <Server size={20} />
            <span className="font-semibold text-sm">GPU</span>
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] leading-tight">{health?.gpu.available ? health.gpu.model : (health ? 'No GPU detected' : '—')}</div>
            {health?.gpu.available && <div className="text-xs text-[var(--text-secondary)] mt-1">{(health.gpu.vram_total_mb / 1024).toFixed(1)} GB VRAM</div>}
          </div>
        </div>

        {/* RAM Available */}
        <div className="teal-glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-sky-600 dark:text-sky-400">
            <HardDrive size={20} />
            <span className="font-semibold text-sm">RAM Available</span>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--text-primary)]">{health ? health.ram.available_gb : '—'} <span className="text-lg text-[var(--text-secondary)]">/ {health ? health.ram.total_gb : '—'} GB</span></div>
            <div className="w-full bg-[var(--surface-secondary)] rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${health ? 100 - health.ram.usage_percent : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* System RAM usage */}
        <div className="teal-glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
            <Thermometer size={20} />
            <span className="font-semibold text-sm">RAM Usage</span>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--text-primary)]">{health ? `${health.ram.usage_percent.toFixed(1)}%` : '—'}</div>
            <div className="w-full bg-[var(--surface-secondary)] rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${health?.ram.usage_percent ?? 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[var(--surface-secondary)]/70 rounded-2xl p-5 border border-[var(--border-subtle)] flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${modelName ? 'bg-emerald-500' : 'bg-[var(--text-muted)]'}`}></div>
            <span className="font-bold text-[var(--text-primary)]">Active AI Model</span>
         </div>
         <span className="px-4 py-1.5 bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--accent-primary)] font-bold rounded-lg text-sm shadow-xs">{modelName || (health ? 'None loaded' : '—')}</span>
      </div>
    </div>
  );
}
