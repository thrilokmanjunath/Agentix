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
  Hexagon,
  Menu,
  X,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return 'A';
  const parts = source.includes('@') ? [source.split('@')[0]] : source.split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'A';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Back to Executive Console', href: '/dashboard', icon: ArrowLeft },
    { name: 'Your AI Team', href: '/admin/brain-console', icon: BrainCircuit },
    { name: 'Automations', href: '/admin/workflow-manager', icon: Wand2 },
    { name: 'Institutional Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 w-full h-full relative overflow-hidden flex font-sans">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={`fixed md:relative flex flex-col bg-slate-900 border-r border-slate-800/80 text-white w-64 h-full flex-shrink-0 z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 text-slate-100 font-semibold tracking-tight text-base font-serif">
            <span className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Hexagon size={16} />
            </span>
            Agentix Admin
          </Link>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-6">
          <nav className="space-y-1">
            <div className="px-3 mb-2 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Administration</div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-amber-400' : 'text-slate-500'} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.aside>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Top Navbar */}
        <header className="bg-slate-900/80 backdrop-blur-md h-16 shrink-0 flex justify-between items-center px-4 md:px-8 z-30 border-b border-slate-800/80 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2">
              <span className="font-serif font-semibold text-slate-100 text-sm">Administrative Console</span>
              <Badge variant="gold" className="text-[10px]">PREVIEW</Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/profile" className="w-8 h-8 rounded-full bg-slate-950 border border-amber-400/50 text-amber-400 flex items-center justify-center font-serif text-xs font-bold shadow-md hover:scale-105 transition-transform">
              {initialsFrom(session?.user?.name, session?.user?.email)}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-300">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
              <p className="text-xs leading-relaxed">
                Institutional Administrative Preview: Components under this section allow inspection of planned infrastructure tooling. Production operations remain governed by the Executive Console.
              </p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
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
