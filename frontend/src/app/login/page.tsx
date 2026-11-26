'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginWithCredentials } from '@/app/actions/auth';
import {
  ArrowRight,
  AlertCircle,
  Shield,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AgentixLogo } from '@/components/AgentixLogo';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get('error');

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(DEMO_MODE ? 'admin@agentix.com' : '');
  const [password, setPassword] = useState(DEMO_MODE ? 'admin123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError === 'InvalidCredentials' || initialError === 'CredentialsSignin'
      ? 'Invalid credentials. Please verify your email and password.'
      : initialError === 'GoogleNotConfigured'
      ? 'OAuth is unconfigured. Use email and password credentials below.'
      : initialError
      ? 'Authentication failed. Please try again.'
      : null
  );

  const handleModeSwitch = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMessage(null);
    if (nextMode === 'register' && DEMO_MODE && email === 'admin@agentix.com') {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const redirectTo = searchParams.get('redirect') || '/dashboard';

      if (mode === 'register') {
        if (password.length < 8) {
          setErrorMessage('Password must be at least 8 characters.');
          setIsLoading(false);
          return;
        }

        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || undefined,
            email: email.trim(),
            password,
          }),
        });

        const regData = await regRes.json().catch(() => ({}));
        if (!regRes.ok) {
          setErrorMessage(regData?.error || 'Could not create account. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      const res = await loginWithCredentials(email.trim(), password, redirectTo);

      if (!res.success) {
        setErrorMessage(res.error || 'Invalid credentials. Check your email and password.');
        setIsLoading(false);
      } else {
        router.push(res.redirectTo || redirectTo);
        router.refresh();
      }
    } catch {
      setErrorMessage('An unexpected error occurred during authentication. Please retry.');
      setIsLoading(false);
    }
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
            <div className="w-9 h-9 rounded-xl bg-[var(--surface-elevated)] border border-amber-500/30 flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
              <AgentixLogo size={22} variant="solar-gold" />
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
              Ingest structured datasets. Run multi-agent automated data engineering, AutoML, and explainable AI inside isolated tenant workspaces.
            </p>
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Strict multi-tenant cryptographic isolation</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Automated feature engineering, cross-validation &amp; SHAP XAI</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Enterprise 8-Layer AI Security Architecture certified</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-[var(--text-muted)] font-mono">
            &copy; {new Date().getFullYear()} Agentix Institutional Platform. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Login / Registration Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-[420px] flex flex-col p-8 rounded-2xl teal-glass-card shadow-xl border border-[var(--border-subtle)]">
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] border border-amber-500/30 flex items-center justify-center">
              <AgentixLogo size={18} variant="solar-gold" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Agentix</span>
          </div>

          <div className="flex flex-col text-left gap-1 mb-5">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {mode === 'login' ? 'Institutional Access' : 'Create Workspace Account'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              {mode === 'login'
                ? 'Authenticate to access your isolated workspace'
                : 'Register a dedicated institutional account to get started'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] mb-5">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[var(--background)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('register')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[var(--background)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'register' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor="name">
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-all disabled:opacity-60"
                    id="name"
                    placeholder="Alex Morgan"
                    required
                    type="text"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor="email">
                  Institutional Email
                </label>
                <input
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-all font-mono disabled:opacity-60"
                  id="email"
                  placeholder="name@organization.com"
                  required
                  type="email"
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor="password">
                    Password
                  </label>
                  {mode === 'register' && (
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">Min. 8 characters</span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-all font-mono disabled:opacity-60"
                    id="password"
                    placeholder="••••••••"
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {DEMO_MODE && mode === 'login' && (
                <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center gap-2">
                  <Lock size={13} className="text-[var(--accent-primary)] shrink-0" />
                  <span>
                    Default development account: <strong className="text-[var(--text-primary)]">admin@agentix.com</strong> /{' '}
                    <strong className="text-[var(--text-primary)]">admin123</strong>
                  </span>
                </div>
              )}

              <button
                className="w-full mt-1 py-3 px-4 teal-button-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim() || (mode === 'register' && !name.trim())}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {mode === 'login' ? 'Authenticating Session...' : 'Creating Workspace...'}
                  </>
                ) : mode === 'login' ? (
                  <>
                    Sign In to Console
                    <ArrowRight size={14} />
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    Create Account &amp; Enter Console
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[var(--accent-primary)]" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
