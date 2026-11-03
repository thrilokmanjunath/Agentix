'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Database,
  FileText,
  MessageSquare,
  Settings,
  Menu,
  Search,
  Bell,
  Hexagon,
  Network,
  History,
  Shield,
  Activity,
  Lightbulb,
  CheckCircle2,
  Server,
  ChevronDown,
  Cpu,
  Lock,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return 'AX';
  const parts = source.includes('@') ? [source.split('@')[0]] : source.split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'AX';
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isRightPanelOpen, setRightPanelOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  const [systemHealth, setSystemHealth] = useState<{
    online: boolean;
    pingMs: number | null;
    ollamaOnline: boolean;
    activeModel?: string;
  }>({
    online: false,
    pingMs: null,
    ollamaOnline: false,
    activeModel: 'qwen2.5:3b'
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/workspaces')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!isMounted || !data) return;
        const list = Array.isArray(data) ? data : data.workspaces;
        if (list && list.length > 0) setWorkspaceName(list[0].name);
      })
      .catch(() => {});

    fetch('/api/dashboard')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (!isMounted) return;
        const logs = (json?.data || json)?.activityLogs;
        if (Array.isArray(logs)) setRecentActivity(logs.slice(0, 3));
      })
      .catch(() => {});

    const checkHealth = () => {
      const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const start = performance.now();
      fetch(`${backendBase}/api/v1/platform/ai/status`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(json => {
          if (!isMounted) return;
          const data = json?.data || {};
          const localModels = data.local_models || [];
          setSystemHealth({
            online: true,
            pingMs: Math.round(performance.now() - start),
            ollamaOnline: localModels.length > 0,
            activeModel: localModels[0]?.name || 'qwen2.5:3b'
          });
        })
        .catch(() => {
          if (isMounted) setSystemHealth({ online: false, pingMs: null, ollamaOnline: false });
        });
    };
    checkHealth();
    const healthInterval = setInterval(checkHealth, 15000);

    return () => { isMounted = false; clearInterval(healthInterval); };
  }, []);

  const userInitials = initialsFrom(session?.user?.name, session?.user?.email);

  const navItems = [
    { name: 'Console', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Data Dock', href: '/data-dock', icon: Database },
    { name: 'Analysis & XAI', href: '/insights', icon: Lightbulb },
    { name: 'Reports', href: '/intelligence-reports', icon: FileText },
    { name: 'AI Workspace', href: '/agent-console', icon: MessageSquare },
    { name: 'Pipeline History', href: '/history', icon: History },
    { name: 'Knowledge Graph', href: '/knowledge-graph', icon: Network },
  ];

  const bottomNavItems = [
    { name: 'System Settings', href: '/settings', icon: Settings },
    { name: 'Admin Console', href: '/admin/brain-console', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 w-full h-full relative overflow-hidden flex flex-col font-sans">
      
      {/* Top Luxury Navigation */}
      <header className="bg-slate-950/85 backdrop-blur-xl h-16 shrink-0 flex justify-between items-center px-4 md:px-6 z-40 border-b border-slate-800/80 sticky top-0 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            className="lg:hidden text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-900 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Toggle Navigation"
          >
            <Menu size={20} />
          </button>
          
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Hexagon size={18} className="text-slate-950 fill-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-lg text-slate-100 flex items-center gap-1.5">
                AGENTIX
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  INSTITUTIONAL
                </span>
              </span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] font-mono">
              {(workspaceName || 'A')[0]}
            </div>
            <span className="text-xs font-medium text-slate-300">{workspaceName || 'Default Workspace'}</span>
            <ChevronDown size={12} className="text-slate-500" />
          </div>
        </div>

        {/* Global Search / Command Interface */}
        <div className="hidden md:flex items-center relative flex-1 max-w-md mx-8">
          <Search size={15} className="absolute left-3.5 text-slate-500" />
          <input 
            className="w-full pl-9 pr-14 py-2 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner" 
            placeholder="Search datasets, models, pipeline stages (Cmd+K)..." 
            type="text"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-950 border border-slate-800 rounded">
            ⌘K
          </kbd>
        </div>
        
        {/* Right Header Badges & Actions */}
        <div className="flex items-center gap-3">
          {/* Privacy & Model Status Badges */}
          <div className="hidden lg:flex items-center gap-2">
            <Badge variant="local" size="sm" className="hidden sm:inline-flex">
              <Lock size={10} />
              Zero Data Leakage
            </Badge>
            <Badge variant="gold" size="sm">
              <Cpu size={10} />
              {systemHealth.ollamaOnline ? `OLLAMA: ${systemHealth.activeModel}` : 'LOCAL AI STANDBY'}
            </Badge>
          </div>

          <button 
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-900 p-2 rounded-lg transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full shadow-sm shadow-amber-400/50"></span>
          </button>
          
          <Link
            href="/profile"
            title={session?.user?.email || undefined}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md border border-amber-400/40 ml-1 overflow-hidden hover:scale-105 transition-transform"
          >
            {userInitials}
          </Link>

          <button 
            className="xl:hidden text-slate-400 hover:text-slate-200 p-2 ml-1 rounded-lg hover:bg-slate-900 transition-colors"
            onClick={() => setRightPanelOpen(!isRightPanelOpen)}
            aria-label="Toggle Telemetry Panel"
          >
            <Activity size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Left Luxury Sidebar */}
        <motion.aside 
          className={`fixed lg:relative flex flex-col bg-slate-950/90 border-r border-slate-800/80 w-64 h-full flex-shrink-0 z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-6">
            <div className="px-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Core Capabilities
              </span>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-amber-500/10 text-amber-300 border-l-2 border-amber-400 shadow-sm font-semibold' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={17} className={isActive ? 'text-amber-400' : 'text-slate-500'} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <div className="px-3 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Platform Management
              </span>
            </div>
            <nav className="space-y-1">
              {bottomNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-amber-500/10 text-amber-300 border-l-2 border-amber-400 font-semibold' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={17} className={isActive ? 'text-amber-400' : 'text-slate-500'} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </motion.aside>
        
        {/* Main Center Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950/60 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right Intelligence & Telemetry Drawer */}
        <aside 
          className={`fixed xl:relative right-0 flex flex-col bg-slate-950/95 border-l border-slate-800/80 w-80 h-full flex-shrink-0 z-40 transition-transform duration-300 ease-in-out shadow-2xl xl:shadow-none ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}`}
        >
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
            
            {/* Live Model Status Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Cpu size={14} className="text-amber-400" />
                  Active Inference Engine
                </span>
                <span className={`w-2 h-2 rounded-full ${systemHealth.ollamaOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`}></span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Provider</span>
                  <span className="font-mono text-slate-200 font-medium">Ollama (Local)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Loaded Model</span>
                  <span className="font-mono text-amber-300 font-semibold">{systemHealth.activeModel}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Data Boundary</span>
                  <span className="text-emerald-400 font-medium">Air-Gapped Local</span>
                </div>
              </div>
            </div>

            {/* Current Activity Log */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 font-mono">
                <Activity size={13} className="text-amber-400" />
                Live Pipeline Audit Feed
              </h4>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((log, idx) => {
                    const failed = typeof log.action === 'string' && log.action.toLowerCase().startsWith('failed');
                    return (
                      <div className="flex gap-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60" key={log.id || idx}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${failed ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                          {failed ? <Database size={13} /> : <CheckCircle2 size={13} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-200 truncate">{log.action}</p>
                          {log.createdAt && (
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{new Date(log.createdAt).toLocaleTimeString()}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic">No pipeline runs recorded in this session.</p>
                )}
              </div>
            </div>

            {/* Institutional Security Attestation */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <div className="flex items-center gap-2 mb-2 text-amber-400">
                <Shield size={15} />
                <span className="text-xs font-semibold">Institutional Assurance</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tenant isolation enforced via user-scoped storage partitions. All inference executed through local hardware endpoints.
              </p>
            </div>

            {/* System Health Status */}
            <div className="mt-auto pt-4 border-t border-slate-800/60">
              <div className="flex items-center justify-between p-3 bg-slate-900/70 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${systemHealth.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  <span className="text-xs font-medium text-slate-300">
                    {systemHealth.online ? 'Core Services Operational' : 'API Connecting...'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {systemHealth.pingMs !== null ? `${systemHealth.pingMs}ms` : '—'}
                </span>
              </div>
            </div>
            
          </div>
        </aside>

      </div>
    </div>
  );
}
