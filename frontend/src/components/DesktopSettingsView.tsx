'use client';

import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Cpu, 
  HardDrive, 
  RefreshCw, 
  FolderOpen, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Server
} from 'lucide-react';
import { isDesktopApp, getDesktopInfo, openDesktopDataFolder, DesktopInfo } from '@/lib/desktop';
import { getClientBackendBase } from '@/lib/backendClient';

export default function DesktopSettingsView() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopInfo, setDesktopInfo] = useState<DesktopInfo | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [probing, setProbing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>('idle');
  const [ollamaStatus, setOllamaStatus] = useState<{ online: boolean; models: string[] }>({
    online: false,
    models: [],
  });

  const loadInfo = async () => {
    setProbing(true);
    const inDesktop = isDesktopApp();
    setIsDesktop(inDesktop);

    if (inDesktop) {
      const info = await getDesktopInfo();
      setDesktopInfo(info);
    }

    // Check backend health
    try {
      const base = getClientBackendBase();
      const res = await fetch(`${base}/health`);
      if (res.ok) {
        setHealthStatus('healthy');
      } else {
        setHealthStatus('unhealthy');
      }
    } catch {
      setHealthStatus('unreachable');
    }

    // Check Ollama locally
    try {
      const oRes = await fetch('http://127.0.0.1:11434/api/tags');
      if (oRes.ok) {
        const oData = await oRes.json();
        const models = (oData.models || []).map((m: { name: string }) => m.name);
        setOllamaStatus({ online: true, models });
      } else {
        setOllamaStatus({ online: false, models: [] });
      }
    } catch {
      setOllamaStatus({ online: false, models: [] });
    }

    setProbing(false);
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const copyToken = () => {
    if (desktopInfo?.token) {
      navigator.clipboard.writeText(desktopInfo.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-amber-50/60 dark:bg-stone-900 border border-amber-200/80 dark:border-stone-800 flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Monitor className="w-5 h-5" />
            </span>
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-lg">
              {isDesktop ? 'Agentix Native Desktop Runtime' : 'Agentix Web Browser Session'}
            </h3>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-xl">
            {isDesktop
              ? 'Agentix is operating as a supervised native desktop application with an isolated PyInstaller backend sidecar and local SQLite datastore.'
              : 'You are viewing Agentix in a web browser. For maximum offline performance and local GPU acceleration, install the Agentix Desktop application.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              healthStatus === 'healthy'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            {healthStatus === 'healthy' ? 'Core Online' : 'Core Standby'}
          </span>
          <button
            onClick={loadInfo}
            disabled={probing}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Refresh Diagnostics"
          >
            <RefreshCw className={`w-4 h-4 text-stone-600 dark:text-stone-400 ${probing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backend Supervisor Panel */}
        <div className="p-5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-medium">
            <Server className="w-4 h-4 text-amber-600" />
            <h4>Backend Core Supervisor</h4>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-500">Service Endpoint</span>
              <span className="font-mono font-medium text-stone-800 dark:text-stone-200">
                {getClientBackendBase() || 'Proxy (/api/v1)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-500">Process ID (PID)</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">
                {desktopInfo?.pid || 'Supervised (8001)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-500">Security Barrier</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-stone-700 dark:text-stone-300">
                  {desktopInfo?.token
                    ? showToken
                      ? desktopInfo.token.slice(0, 16) + '...'
                      : '••••••••••••••••'
                    : 'Standard Localhost'}
                </span>
                {desktopInfo?.token && (
                  <>
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="p-1 hover:text-stone-900 text-stone-400 transition"
                      title={showToken ? 'Hide Token' : 'Reveal Token'}
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={copyToken}
                      className="p-1 hover:text-stone-900 text-stone-400 transition"
                      title="Copy Token"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1.5">
              <span className="text-stone-500">Environment</span>
              <span className="font-medium text-stone-800 dark:text-stone-200">
                {desktopInfo?.platform || 'Darwin ARM64 / Local'}
              </span>
            </div>
          </div>
        </div>

        {/* Local AI Engine Panel */}
        <div className="p-5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-medium">
            <Cpu className="w-4 h-4 text-amber-600" />
            <h4>Local Inference Link (Ollama)</h4>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-500">Loopback Gateway</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">http://127.0.0.1:11434</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-500">Ollama Daemon</span>
              <span
                className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                  ollamaStatus.online
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {ollamaStatus.online ? 'Online' : 'Not Detected'}
              </span>
            </div>

            <div className="py-1.5">
              <span className="text-stone-500 block mb-1.5">Installed Local Models:</span>
              {ollamaStatus.models.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {ollamaStatus.models.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded bg-amber-50 dark:bg-stone-800 text-amber-900 dark:text-amber-200 text-xs font-mono border border-amber-200/50 dark:border-stone-700"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No models discovered on local port 11434.</p>
              )}
            </div>
          </div>
        </div>

        {/* Local Storage Roots */}
        <div className="p-5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-medium">
              <HardDrive className="w-4 h-4 text-amber-600" />
              <h4>Local Data & Storage Root</h4>
            </div>
            {isDesktop && (
              <button
                onClick={openDesktopDataFolder}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Open Data Folder
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <span className="text-stone-500 block mb-1">SQLite Database</span>
              <span className="font-mono text-stone-800 dark:text-stone-200 font-medium">
                {desktopInfo?.data_dir ? `${desktopInfo.data_dir}/agentix.db` : '~/.../agentix.db'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <span className="text-stone-500 block mb-1">Parquet Lakehouse</span>
              <span className="font-mono text-stone-800 dark:text-stone-200 font-medium">
                {desktopInfo?.data_dir ? `${desktopInfo.data_dir}/data/temp` : '~/.../data/temp'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <span className="text-stone-500 block mb-1">Trained AutoML Models</span>
              <span className="font-mono text-stone-800 dark:text-stone-200 font-medium">
                {desktopInfo?.data_dir ? `${desktopInfo.data_dir}/models` : '~/.../models'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
