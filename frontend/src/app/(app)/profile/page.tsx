"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Save
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
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Loader2 size={24} className="text-amber-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full relative overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto pb-16">
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="gold">
              <Sparkles className="w-3 h-3 mr-1" />
              INSTITUTIONAL IDENTITY
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-100 font-serif">
            Operator Profile & AI Persona
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure institutional user identity, credentials, and neural reasoning persona.
          </p>
        </div>
        <Button 
          variant="gold"
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
            className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-8 flex flex-col items-center text-center shadow-xl"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-slate-950 border-2 border-amber-400/50 text-amber-400 flex items-center justify-center text-3xl font-bold shadow-lg shadow-black/60 font-serif uppercase">
                {profile.firstName ? profile.firstName[0] : 'O'}
              </div>
              <button 
                type="button"
                className="absolute bottom-0 right-0 bg-slate-900 border border-slate-700 p-2 rounded-full text-slate-300 hover:text-amber-400 hover:border-amber-400/40 transition-all shadow-md"
              >
                <Camera size={14} />
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-slate-100 font-serif mb-1">
              {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : 'Institutional Operator'}
            </h3>
            <p className="text-xs font-mono text-amber-400/90 mb-4">ROLE: TENANT_LEAD</p>

            <div className="w-full text-left space-y-3 pt-6 border-t border-slate-800">
              <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
                <Mail size={14} className="text-slate-500 shrink-0" />
                <span className="truncate">{profile.email || 'operator@institution.local'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
                <Shield size={14} className="text-emerald-400 shrink-0" />
                <span>TENANT ENCLAVE VERIFIED</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{opacity: 0, y: 10}} 
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.1}}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3"
          >
            <nav className="flex flex-col gap-1 text-sm font-medium">
              <button className="flex items-center gap-3 p-3 rounded-xl text-amber-400 bg-amber-400/10 border border-amber-400/20 transition-colors text-left">
                <UserIcon size={16} />
                Identity & Details
              </button>
              <button className="flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-colors text-left">
                <Settings2 size={16} className="text-slate-500" />
                Reasoning Persona
              </button>
              <button className="flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-colors text-left">
                <Bell size={16} className="text-slate-500" />
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
            className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-8 shadow-xl"
          >
            <h2 className="text-base font-semibold text-slate-100 mb-6 pb-4 border-b border-slate-800 font-serif">
              Personal Identity Credentials
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold text-slate-300">FIRST NAME</label>
                <input 
                  className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-all font-sans" 
                  type="text" 
                  value={profile.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="e.g. Eleanor"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold text-slate-300">LAST NAME</label>
                <input 
                  className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-all font-sans" 
                  type="text" 
                  value={profile.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="e.g. Vance"
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-mono font-semibold text-slate-300">OFFICIAL INSTITUTION EMAIL</label>
                <input 
                  className="bg-slate-950/50 border border-slate-800/80 rounded-xl px-4 py-2.5 text-sm text-slate-400 font-mono" 
                  type="email" 
                  value={profile.email}
                  disabled
                />
                <span className="text-[11px] text-slate-500">Email is pinned to the current institutional tenant domain.</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{opacity: 0, y: 10}} 
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.3}}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-8 shadow-xl"
          >
            <h2 className="text-base font-semibold text-slate-100 mb-6 pb-4 border-b border-slate-800 font-serif">
              Autonomous Agent Persona & Tone
            </h2>
            
            <div className="space-y-4">
              <label 
                className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all ${
                  profile.aiPersona === 'Executive Analyst (Recommended)' 
                    ? 'border-amber-400/60 bg-amber-400/5 ring-1 ring-amber-400/20' 
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
                onClick={() => handleChange('aiPersona', 'Executive Analyst (Recommended)')}
              >
                <input 
                  type="radio" 
                  name="tone" 
                  className="mt-1 text-amber-400 focus:ring-amber-400" 
                  checked={profile.aiPersona === 'Executive Analyst (Recommended)'} 
                  readOnly
                />
                <div>
                  <div className="font-semibold text-slate-100 text-sm">Executive Analyst (Recommended)</div>
                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Focuses on high-level institutional impact, ROI, key risk factors, and actionable prescriptions without unnecessary statistical jargon.
                  </div>
                </div>
              </label>

              <label 
                className={`flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all ${
                  profile.aiPersona === 'Data Scientist Mode' 
                    ? 'border-amber-400/60 bg-amber-400/5 ring-1 ring-amber-400/20' 
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
                onClick={() => handleChange('aiPersona', 'Data Scientist Mode')}
              >
                <input 
                  type="radio" 
                  name="tone" 
                  className="mt-1 text-amber-400 focus:ring-amber-400" 
                  checked={profile.aiPersona === 'Data Scientist Mode'} 
                  readOnly
                />
                <div>
                  <div className="font-semibold text-slate-100 text-sm">Data Scientist Mode</div>
                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Produces granular mathematical telemetry, cross-validation variance, loss convergence curves, p-values, and raw SHAP feature distributions.
                  </div>
                </div>
              </label>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
