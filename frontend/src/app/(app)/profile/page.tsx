"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { logoutAction } from '@/app/actions/auth';
import {
  Camera,
  Mail,
  CheckCircle2,
  Settings2,
  User as UserIcon,
  Bell,
  Shield,
  Loader2,
  Sparkles,
  Save,
  LogOut
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ProfilePage() {
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    aiPersona: 'Executive Analyst (Recommended)'
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/users/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full min-h-[400px]">
        <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 flex items-center justify-center">
          <Loader2 size={24} className="text-[var(--accent-primary)] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full relative overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto pb-16 font-sans">
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="teal">
              <Sparkles className="w-3 h-3 mr-1" />
              INSTITUTIONAL IDENTITY
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Operator Profile & AI Persona
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Configure institutional user identity, credentials, and neural reasoning persona.
          </p>
        </div>
        <Button 
          variant="teal"
          onClick={handleSave}
          className="flex items-center gap-2"
        >
          {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saved ? 'Changes Saved' : 'Save Profile'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Navigation & Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{opacity: 0, y: 10}} 
            animate={{opacity: 1, y: 0}}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 flex flex-col items-center text-center shadow-md"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-[var(--surface-secondary)] border-2 border-[var(--accent-primary)] text-[var(--accent-primary)] flex items-center justify-center text-3xl font-bold shadow-md uppercase">
                {profile.firstName ? profile.firstName[0] : 'O'}
              </div>
              <button 
                type="button"
                className="absolute bottom-0 right-0 bg-[var(--surface-primary)] border border-[var(--border-subtle)] p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-all shadow-sm cursor-pointer"
              >
                <Camera size={14} />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
              {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : 'Institutional Operator'}
            </h3>
            <p className="text-xs font-mono text-[var(--accent-primary)] font-semibold mb-4">ROLE: TENANT_LEAD</p>

            <div className="w-full text-left space-y-3 pt-6 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-3 text-[var(--text-secondary)] text-xs font-mono">
                <Mail size={14} className="text-[var(--text-muted)] shrink-0" />
                <span className="truncate">{profile.email || 'operator@institution.local'}</span>
              </div>
              <div className="flex items-center gap-3 text-[var(--text-secondary)] text-xs font-mono">
                <Shield size={14} className="text-emerald-500 shrink-0" />
                <span>TENANT ENCLAVE VERIFIED</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{opacity: 0, y: 10}} 
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.1}}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3"
          >
            <nav className="flex flex-col gap-1 text-sm font-medium">
              <button className="flex items-center gap-3 p-3 rounded-xl text-[var(--accent-primary)] bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/20 transition-colors text-left cursor-pointer">
                <UserIcon size={16} />
                Identity & Details
              </button>
              <button className="flex items-center gap-3 p-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer">
                <Settings2 size={16} className="text-[var(--text-muted)]" />
                Reasoning Persona
              </button>
              <button className="flex items-center gap-3 p-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer">
                <Bell size={16} className="text-[var(--text-muted)]" />
                Security Alerts
              </button>
            </nav>
          </motion.div>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-8 space-y-6">
          
          <motion.div 
            initial={{opacity: 0, y: 10}} 
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.2}}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 shadow-md"
          >
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--border-subtle)]">
              Personal Identity Credentials
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold text-[var(--text-secondary)]">FIRST NAME</label>
                <input 
                  className="bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] transition-all font-sans" 
                  type="text" 
                  value={profile.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="e.g. Eleanor"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold text-[var(--text-secondary)]">LAST NAME</label>
                <input 
                  className="bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] transition-all font-sans" 
                  type="text" 
                  value={profile.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="e.g. Vance"
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-mono font-semibold text-[var(--text-secondary)]">OFFICIAL INSTITUTION EMAIL</label>
                <input 
                  className="bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-secondary)] font-mono" 
                  type="email" 
                  value={profile.email}
                  disabled
                />
                <span className="text-[11px] text-[var(--text-muted)]">Email is pinned to the current institutional tenant domain.</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{opacity: 0, y: 10}} 
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.3}}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 shadow-md"
          >
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--border-subtle)]">
              Autonomous Agent Persona & Tone
            </h2>
            
            <div className="space-y-4">
              <label 
                className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all ${
                  profile.aiPersona === 'Executive Analyst (Recommended)' 
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft-alpha)] ring-1 ring-[var(--accent-primary)]/30' 
                    : 'border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 hover:border-[var(--accent-primary)]/40'
                }`}
                onClick={() => handleChange('aiPersona', 'Executive Analyst (Recommended)')}
              >
                <input 
                  type="radio" 
                  name="tone" 
                  className="mt-1 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" 
                  checked={profile.aiPersona === 'Executive Analyst (Recommended)'} 
                  readOnly
                />
                <div>
                  <div className="font-bold text-[var(--text-primary)] text-sm">Executive Analyst (Recommended)</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Focuses on high-level institutional impact, ROI, key risk factors, and actionable prescriptions without unnecessary statistical jargon.
                  </div>
                </div>
              </label>

              <label 
                className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all ${
                  profile.aiPersona === 'Data Scientist Mode' 
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft-alpha)] ring-1 ring-[var(--accent-primary)]/30' 
                    : 'border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 hover:border-[var(--accent-primary)]/40'
                }`}
                onClick={() => handleChange('aiPersona', 'Data Scientist Mode')}
              >
                <input 
                  type="radio" 
                  name="tone" 
                  className="mt-1 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" 
                  checked={profile.aiPersona === 'Data Scientist Mode'} 
                  readOnly
                />
                <div>
                  <div className="font-bold text-[var(--text-primary)] text-sm">Data Scientist Mode</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Produces granular mathematical telemetry, cross-validation variance, loss convergence curves, p-values, and raw SHAP feature distributions.
                  </div>
                </div>
              </label>
            </div>
          </motion.div>

          {/* Active Session & Security Management */}
          <motion.div 
            initial={{opacity: 0, y: 10}} 
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.4}}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 shadow-md"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Session & Security Management
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Manage active credentials, token expiration, and secure session termination.
                </p>
              </div>
              <Badge variant="teal" size="sm">
                Active Session
              </Badge>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[var(--text-primary)] block">Current Authentication State</span>
                <span className="text-xs text-[var(--text-secondary)] block">
                  Signed in as <strong className="text-[var(--text-primary)] font-mono">{profile.email || 'admin@agentix.com'}</strong> &bull; Scoped to institutional tenant
                </span>
              </div>
              <button
                type="button"
                onClick={() => logoutAction()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-600/30 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <LogOut size={14} />
                Sign Out of Session
              </button>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
