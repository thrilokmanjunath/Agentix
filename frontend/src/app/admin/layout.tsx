"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  BrainCircuit,
  Wand2,
  Settings,
  Shield,
  Menu,
  X,
  LayoutDashboard,
  Bot,
  Box,
  Activity,
  Database,
  FileText,
  HardDrive,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ThemeToggle';

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return 'AX';
  const parts = source.includes('@') ? [source.split('@')[0]] : source.split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'AX';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Security & Governance', href: '/admin/brain-console', icon: Shield },
    { name: 'Admin Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Workflow Automations', href: '/admin/workflow-manager', icon: Wand2 },
    { name: 'LLM Providers', href: '/admin/llm-manager', icon: Bot },
    { name: 'Model Registry', href: '/admin/model-manager', icon: Box },
    { name: 'System Monitoring', href: '/admin/monitoring', icon: Activity },
    { name: 'Database Console', href: '/admin/database-manager', icon: Database },
    { name: 'Prompt Vault', href: '/admin/prompt-manager', icon: FileText },
    { name: 'Memory Inspector', href: '/admin/memory-inspector', icon: HardDrive },
  ];

  const utilityItems = [
    { name: 'Executive Console', href: '/dashboard', icon: ArrowLeft },
    { name: 'Institutional Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="h-screen bg-[var(--background)] text-[var(--text-primary)] w-full relative overflow-hidden flex font-sans transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Theme-Aware Sidebar */}
      <motion.aside
        className={`fixed md:relative flex flex-col bg-[var(--surface-primary)] border-r border-[var(--border-subtle)] text-[var(--text-primary)] w-64 h-full flex-shrink-0 z-50 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--border-subtle)] shrink-0">
          <Link href="/admin/brain-console" className="flex items-center gap-2.5 group">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-foreground)] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
              <BrainCircuit size={17} />
            </span>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-sm text-[var(--text-primary)] leading-tight">
                AGENTIX
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent-primary)] font-semibold">
                Governance
              </span>
            </div>
          </Link>
          <button
            className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col justify-between gap-6">
          <nav className="space-y-1">
            <div className="px-3 mb-2 text-[10px] font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Governance & Control
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border-l-2 border-[var(--accent-primary)] font-semibold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon
                    size={16}
                    className={isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-1">
            <div className="px-3 mb-2 text-[10px] font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Workspace Navigation
            </div>
            {utilityItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all duration-150"
                >
                  <Icon size={16} className="text-[var(--text-muted)]" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Glass Header */}
        <header className="teal-glass h-16 shrink-0 flex justify-between items-center px-4 md:px-8 z-30 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Toggle admin sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2.5">
              <span className="font-semibold text-[var(--text-primary)] text-sm tracking-tight">
                Security & Governance Console
              </span>
              <Badge variant="teal" size="sm">
                8-Layer Certified
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
            >
              <ArrowLeft size={13} />
              Executive Console
            </Link>

            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-[var(--accent-foreground)] flex items-center justify-center font-bold text-xs shadow-md hover:scale-105 transition-transform"
              title={session?.user?.email || 'Operator Profile'}
            >
              {initialsFrom(session?.user?.name, session?.user?.email)}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[var(--background)]">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
