import React from 'react';
import { signIn } from '@/auth';
import { googleConfigured } from '@/auth.config';
import { Compass, ArrowRight, AlertCircle, Shield, Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params?.error;
  
  const handleLogin = async (formData: FormData) => {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard"
      });
    } catch (error: any) {
      if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
        throw error;
      }
      const errorString = String(error?.type || "") + String(error?.name || "") + String(error?.message || "");
      if (errorString.includes("CredentialsSignin") || errorString.includes("CallbackRouteError")) {
        const { redirect } = await import("next/navigation");
        redirect("/login?error=InvalidCredentials");
      }
      throw error;
    }
  };

  const handleGoogleLogin = async () => {
    "use server";
    if (!googleConfigured) {
      const { redirect } = await import("next/navigation");
      redirect("/login?error=GoogleNotConfigured");
    }
    await signIn("google", { redirectTo: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] w-full flex flex-col md:flex-row relative font-sans transition-colors duration-200">
      
      {/* Theme Toggle Top Right */}
      <div className="absolute top-5 right-5 z-50">
        <ThemeToggle />
      </div>

      {/* Left Branding Panel */}
      <div className="hidden md:flex flex-col w-1/2 bg-[var(--surface-secondary)]/50 border-r border-[var(--border-subtle)] p-12 lg:p-20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col h-full justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105">
              <Compass size={20} className="text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[var(--text-primary)]">AGENTIX</span>
          </Link>
          
          <div className="flex-1 flex flex-col justify-center gap-6 max-w-lg my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] text-xs font-mono font-semibold w-fit">
              <Shield size={12} />
              ENTERPRISE AI OPERATING SYSTEM
            </div>
            <h1 className="text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight text-[var(--text-primary)]">
              Autonomous Intelligence with <span className="text-[var(--accent-primary)]">Zero Data Leakage</span>.
            </h1>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed font-normal">
              Ingest structured institutional datasets. Run multi-agent automated data engineering, AutoML, and explainable AI powered by local hardware execution.
            </p>
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>Strict multi-tenant cryptographic isolation</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>Air-gapped local LLM inference via Ollama (Apple Silicon / CUDA)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>Enterprise 8-Layer AI Security Architecture certified</span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-[var(--text-muted)] font-mono">
            &copy; {new Date().getFullYear()} Agentix Institutional Platform. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-[420px] flex flex-col p-8 rounded-2xl teal-glass-card shadow-xl border border-[var(--border-subtle)]">
          
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-white">
              <Compass size={18} className="text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Agentix</span>
          </div>
          
          <div className="flex flex-col text-left gap-1 mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Institutional Access</h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Authenticate to access your isolated workspace</p>
          </div>

          <div className="flex flex-col gap-5">
            <form action={handleGoogleLogin}>
              <button 
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl hover:border-[var(--accent-primary)] transition-all font-medium text-[var(--text-primary)] text-xs cursor-pointer shadow-sm" 
                type="submit"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                Continue with SSO / Google
              </button>
            </form>

            {error === "GoogleNotConfigured" && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                OAuth is unconfigured in development. Use credential login below.
              </div>
            )}

            <div className="flex items-center w-full gap-3">
              <div className="h-px bg-[var(--border-subtle)] flex-1"></div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono">Or Credentials</span>
              <div className="h-px bg-[var(--border-subtle)] flex-1"></div>
            </div>

            {error === "InvalidCredentials" && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                Invalid credentials. Check email and password.
              </div>
            )}

            <form action={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor="email">Institutional Email</label>
                <input 
                  name="email" 
                  className="w-full px-3.5 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-all font-mono" 
                  id="email" 
                  placeholder="admin@agentix.com" 
                  required 
                  type="email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor="password">Password</label>
                </div>
                <input 
                  name="password" 
                  className="w-full px-3.5 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-all font-mono" 
                  id="password" 
                  placeholder="••••••••" 
                  required 
                  type="password"
                />
              </div>
              
              <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center gap-2">
                <Lock size={13} className="text-[var(--accent-primary)] shrink-0" />
                <span>Default development account: <strong className="text-[var(--text-primary)]">admin@agentix.com</strong> / <strong className="text-[var(--text-primary)]">admin123</strong></span>
              </div>
              
              <button 
                className="w-full mt-1 py-3 px-4 teal-button-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer" 
                type="submit"
              >
                Sign In to Console
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}
