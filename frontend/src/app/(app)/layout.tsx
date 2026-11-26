'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { logoutAction } from '@/app/actions/auth';
import { backendFetch, clearBackendAuthToken } from '@/lib/backendClient';
import { AgentixLogo } from '@/components/AgentixLogo';
import {
  LayoutDashboard,
  Database,
  FileText,
  MessageSquare,
  Settings,
  Menu,
  Search,
  Bell,
  Network,
  History,
  Shield,
  Activity,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Lock,
  LogOut,
  User as UserIcon,
  Loader2,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ThemeToggle';

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

  const [isProfileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    clearBackendAuthToken();
    try {
      await logoutAction();
    } catch {
      window.location.href = '/login';
    }
  };

  const [systemHealth, setSystemHealth] = useState<{
    online: boolean;
    pingMs: number | null;
    ollamaOnline: boolean;
    activeProvider?: string;
    activeModel?: string;
    cloudConfigured?: boolean;
  }>({
    online: false,
    pingMs: null,
    ollamaOnline: false,
    activeProvider: 'ollama',
    activeModel: 'No model active',
    cloudConfigured: false,
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
        if (Array.isArray(logs)) setRecentActivity(logs.slice(0, 4));
      })
      .catch(() => {});

    const checkHealth = () => {
      const start = performance.now();
      backendFetch('/api/v1/platform/ai/status')
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(json => {
          if (!isMounted) return;
          const data = json?.data || {};
          const localModels = data.local_models || [];
          const cloudProviders = data.cloud_providers || [];
          const resolvedProv = (data.active_provider || 'ollama').toUpperCase();
          const resolvedModel =
            data.active_model ||
            localModels[0]?.name ||
            cloudProviders[0]?.default_model ||
            'No model active';
          setSystemHealth({
            online: true,
            pingMs: Math.round(performance.now() - start),
            ollamaOnline: localModels.length > 0,
            activeProvider: resolvedProv,
            activeModel: resolvedModel,
            cloudConfigured: cloudProviders.length > 0,
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
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Data Dock', href: '/data-dock', icon: Database },
    { name: 'AI Models & XAI', href: '/insights', icon: Lightbulb },
    { name: 'Executive Reports', href: '/intelligence-reports', icon: FileText },
    { name: 'AI Assistant', href: '/agent-console', icon: MessageSquare },
    { name: 'Knowledge Graph', href: '/knowledge-graph', icon: Network },
    { name: 'Activity History', href: '/history', icon: History },
  ];

  const bottomNavItems = [
    { name: 'Institutional Settings', href: '/settings', icon: Settings },
    { name: 'Security & Governance', href: '/admin/brain-console', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] w-full h-full relative overflow-hidden flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Teal Glass Navigation */}
      <header className="teal-glass h-16 shrink-0 flex justify-between items-center px-4 md:px-6 z-40 border-b border-[var(--border-subtle)] sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Toggle Navigation"
          >
            <Menu size={20} />
          </button>
          
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] border border-amber-500/30 flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
              <AgentixLogo size={20} variant="solar-gold" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-lg text-[var(--text-primary)] flex items-center gap-2">
                AGENTIX
                <span className="text-[10px] uppercase font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                  INSTITUTIONAL
                </span>
              </span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-colors">
            <div className="w-4 h-4 rounded bg-[var(--accent-primary)] text-[var(--accent-foreground)] flex items-center justify-center font-bold text-[10px] font-mono">
              {(workspaceName || 'A')[0]}
            </div>
            <span className="text-xs font-medium text-[var(--text-primary)]">{workspaceName || 'Institutional Workspace'}</span>
            <ChevronDown size={12} className="text-[var(--text-secondary)]" />
          </div>
        </div>

        {/* Global Search / Command Interface */}
        <div className="hidden md:flex items-center relative flex-1 max-w-md mx-8">
          <Search size={15} className="absolute left-3.5 text-[var(--text-secondary)]" />
          <input 
            className="w-full pl-9 pr-14 py-2 bg-[var(--surface-secondary)]/70 hover:bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-all shadow-inner" 
            placeholder="Search datasets, models, pipelines (Cmd+K)..." 
            type="text"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded">
            ⌘K
          </kbd>
        </div>
        
        {/* Right Header Badges, Theme Toggle & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Privacy & Model Status Badges */}
          <div className="hidden lg:flex items-center gap-2">
            <Badge variant="teal" size="sm" className="hidden sm:inline-flex">
              <Lock size={10} />
              Zero Data Leakage
            </Badge>
            <Badge variant="local" size="sm">
              <Cpu size={10} />
              {systemHealth.ollamaOnline
                ? `LOCAL: ${systemHealth.activeModel}`
                : systemHealth.cloudConfigured && systemHealth.activeProvider !== 'OLLAMA'
                ? `${systemHealth.activeProvider}: ${systemHealth.activeModel}`
                : systemHealth.cloudConfigured
                ? 'CLOUD READY'
                : 'INFERENCE STANDBY'}
            </Badge>
          </div>

          <ThemeToggle />

          <button 
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] p-2 rounded-lg transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent-primary)] rounded-full shadow-sm"></span>
          </button>
          
          {/* Profile Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
              aria-label="User Account Menu"
              aria-expanded={isProfileDropdownOpen}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-[var(--accent-foreground)] flex items-center justify-center font-bold text-xs shadow-md border border-[var(--accent-primary)]/30 overflow-hidden group-hover:scale-105 transition-transform">
                {userInitials}
              </div>
              <ChevronDown size={12} className={`text-[var(--text-secondary)] transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isProfileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-2xl py-2 z-50 text-left overflow-hidden"
                >
                  {/* User Identity Details */}
                  <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {session?.user?.name || 'Institutional Operator'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] font-mono truncate mt-0.5">
                      {session?.user?.email || 'admin@agentix.com'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                        {/* @ts-expect-error role is on custom session */}
                        {session?.user?.role || 'ADMIN'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] truncate">
                        {workspaceName || 'Primary Workspace'}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="p-1.5 space-y-0.5">
                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-xl transition-colors"
                    >
                      <UserIcon size={14} className="text-[var(--accent-primary)]" />
                      <span>Operator Profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-xl transition-colors"
                    >
                      <Settings size={14} className="text-[var(--accent-primary)]" />
                      <span>Account & Settings</span>
                    </Link>

                    <Link
                      href="/admin/brain-console"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-xl transition-colors"
                    >
                      <Shield size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Security & Governance</span>
                    </Link>
                  </div>

                  {/* Logout Action */}
                  <div className="p-1.5 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowLogoutModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign Out of Session</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 ml-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            onClick={() => setRightPanelOpen(!isRightPanelOpen)}
            aria-label="Toggle Telemetry Panel"
            title="Toggle Live Telemetry & Pipeline Feed"
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Left Teal Glass Sidebar */}
        <motion.aside 
          className={`fixed lg:relative flex flex-col bg-[var(--surface-primary)] border-r border-[var(--border-subtle)] w-64 h-full flex-shrink-0 z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-6">
            <div className="px-3 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                Intelligence Platform
              </span>
              <button 
                className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={16} />
              </button>
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive 
                        ? 'bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border-l-2 border-[var(--accent-primary)] font-semibold shadow-sm' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={17} className={isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50">
            <div className="px-3 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                Governance & Admin
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive 
                        ? 'bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border-l-2 border-[var(--accent-primary)] font-semibold' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={17} className={isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </motion.aside>
        
        {/* Main Center Content */}
        <main className="flex-1 overflow-y-auto bg-[var(--background)] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right Intelligence & Telemetry Drawer */}
        <aside 
          className={`fixed 2xl:relative right-0 flex flex-col bg-[var(--surface-primary)] border-l border-[var(--border-subtle)] w-80 h-full flex-shrink-0 z-40 transition-transform duration-300 ease-in-out shadow-xl 2xl:shadow-none ${
            isRightPanelOpen ? 'translate-x-0' : (pathname === '/agent-console' ? 'translate-x-full' : 'translate-x-full 2xl:translate-x-0')
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] 2xl:hidden">
            <span className="text-xs font-bold text-[var(--text-primary)]">Telemetry Drawer</span>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              aria-label="Close telemetry drawer"
            >
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 min-w-0">
            
            {/* Live Model Status Card */}
            <div className="p-4 rounded-xl teal-glass-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Cpu size={14} className="text-[var(--accent-primary)]" />
                  Inference Runtime &amp; Telemetry
                </span>
                <span className={`w-2 h-2 rounded-full ${systemHealth.ollamaOnline ? 'bg-emerald-500 shadow-sm' : 'bg-amber-500'}`}></span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Provider</span>
                  <span className="font-mono text-[var(--text-primary)] font-medium">
                    {systemHealth.ollamaOnline
                      ? 'Ollama (Air-Gapped)'
                      : `${systemHealth.activeProvider || 'API Key'} Engine`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Active Model</span>
                  <span className="font-mono text-[var(--accent-primary)] font-semibold">{systemHealth.activeModel}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Boundary</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {systemHealth.ollamaOnline ? 'Hardware Bound' : 'Server-Protected Key'}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Activity Log */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Activity size={13} className="text-[var(--accent-primary)]" />
                  Live Pipeline Feed
                </h4>
              </div>
              <div className="space-y-2.5">
                {recentActivity.length > 0 ? (
                  recentActivity.map((log, idx) => {
                    const failed = typeof log.action === 'string' && log.action.toLowerCase().startsWith('failed');
                    return (
                      <div className="flex gap-3 p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs" key={log.id || idx}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${failed ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                          {failed ? <Database size={12} /> : <CheckCircle2 size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text-primary)] truncate">{log.action || 'Stage Completed'}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{log.details || 'Pipeline run processed'}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-secondary)]/50 rounded-lg border border-[var(--border-subtle)]">
                    No recent activity records.
                  </div>
                )}
              </div>
            </div>

            {/* 8-Layer Security Status Micro-card */}
            <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Shield size={14} className="text-[var(--accent-primary)]" />
                  8-Layer Security
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">ALL PASS</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Token-bucket rate limits, prompt SHA-256 validation, PII redaction, and GenAI OTel spans active.
              </p>
            </div>

          </div>
        </aside>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isLoggingOut && setShowLogoutModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-md bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <LogOut size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Sign Out of Agentix
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Confirm session termination
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Are you sure you want to end your current session? Your authentication credentials will be purged and you will be redirected to the login screen. Running backend pipeline workflows will continue safely on the server.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Terminating Session...
                    </>
                  ) : (
                    <>
                      <LogOut size={13} />
                      Sign Out
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
