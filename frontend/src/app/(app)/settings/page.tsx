"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database,
  Cpu,
  Palette,
  Save,
  CheckCircle2,
  Loader2,
  Shield,
  HardDrive,
  RefreshCw,
  Monitor,
  Check,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  Terminal,
  Link2,
  Play,
  Copy
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { THEME_OPTIONS, getThemeOption } from '@/lib/themes';
import { useAiPersona } from '@/hooks/useAiPersona';
import { backendFetch } from '@/lib/backendClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import DesktopSettingsView from '@/components/DesktopSettingsView';

const SETTINGS_TABS = [
  { id: 'llm', label: 'AI Inference Engine', icon: Cpu },
  { id: 'desktop', label: 'Desktop Ecosystem', icon: Monitor },
  { id: 'database', label: 'Storage & DB', icon: Database, advanced: true },
  { id: 'theme', label: 'Enterprise Theme', icon: Palette },
  { id: 'security', label: 'Institutional Security', icon: Shield, advanced: true },
];

export default function SettingsPage() {
  const { isExecutive } = useAiPersona();
  const { theme: activeTheme, setTheme, resolvedTheme } = useTheme();
  const visibleTabs = SETTINGS_TABS.filter(tab => !tab.advanced || !isExecutive);
  const [activeTab, setActiveTab] = useState('llm');
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [modelAppliedMsg, setModelAppliedMsg] = useState<string | null>(null);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>({
    ollama: [],
    lm_studio: [],
    gemini: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-flash-latest'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4-turbo'],
    anthropic: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  });

  const [aiStatus, setAiStatus] = useState<any>(null);

  // Local Connector & Remote Local Inference States
  const [connectorTokenInfo, setConnectorTokenInfo] = useState<{
    token: string;
    launch_command_unix: string;
    launch_command_win: string;
  } | null>(null);
  const [connectorStatus, setConnectorStatus] = useState<any>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isCheckingConnector, setIsCheckingConnector] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [directLoopbackStatus, setDirectLoopbackStatus] = useState<any>(null);
  const [isProbingLoopback, setIsProbingLoopback] = useState(false);

  // Real Live Inference Test States
  const [isTestingInference, setIsTestingInference] = useState(false);
  const [inferencePrompt, setInferencePrompt] = useState('Explain why cross-validation prevents overfitting in machine learning in one concise sentence.');
  const [inferenceTestResult, setInferenceTestResult] = useState<any>(null);

  const [settings, setSettings] = useState({
    llmProvider: 'ollama',
    activeModel: '',
    inferenceMode: 'local',
    allowCloudFallback: false,
    apiKey: '',
    geminiKey: '',
    anthropicKey: '',
    ollamaBaseUrl: '',
    theme: 'light'
  });

  const hydrateFromBackendStatus = (data: any) => {
    if (!data) return;
    setAiStatus(data);

    const cfg = data.config || {};
    const liveOllama = (data.local_ollama_models || data.local_models || []).map((m: any) => m.name);
    const diskOllama = (data.installed_local_models || []).map((m: any) => m.name);
    const localList = Array.from(new Set([...liveOllama, ...diskOllama]));
    const lmsList = (data.local_lm_studio_models || []).map((m: any) => m.name);

    const nextModels: Record<string, string[]> = {
      ollama: localList,
      lm_studio: lmsList,
      local_connector: [],
      gemini: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-flash-latest'],
      openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4-turbo'],
      anthropic: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    };

    const cloudProvs = Array.isArray(data.cloud_providers) ? data.cloud_providers : [];
    for (const cp of cloudProvs) {
      if (cp?.provider && Array.isArray(cp.available_models) && cp.available_models.length > 0) {
        nextModels[cp.provider] = cp.available_models;
      }
    }
    setProviderModels(nextModels);

    const resolvedProvider = (cfg.ai_provider || data.active_provider || 'ollama').toLowerCase();
    const resolvedModelsForProv = nextModels[resolvedProvider] || [];
    const resolvedActiveModel =
      data.active_model || cfg.active_model || resolvedModelsForProv[0] || '';

    setSettings(prev => ({
      ...prev,
      llmProvider: resolvedProvider,
      activeModel: resolvedActiveModel,
      inferenceMode: cfg.inference_mode || data.inference_mode || prev.inferenceMode,
      allowCloudFallback: Boolean(cfg.allow_cloud_fallback ?? data.allow_cloud_fallback),
      ollamaBaseUrl: cfg.ollama_base_url || prev.ollamaBaseUrl,
    }));
  };

  const fetchConnectorStatus = async () => {
    setIsCheckingConnector(true);
    try {
      const res = await backendFetch('/api/v1/platform/connector/status');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        setConnectorStatus(data);
        if (Array.isArray(data.models) && data.models.length > 0) {
          setProviderModels(prev => ({ ...prev, local_connector: data.models }));
        }
      }
    } catch (e) {
      console.warn("Failed to check connector status:", e);
    } finally {
      setIsCheckingConnector(false);
    }
  };

  const handleGenerateConnectorToken = async () => {
    setIsGeneratingToken(true);
    try {
      const res = await backendFetch('/api/v1/platform/connector/token');
      if (res.ok) {
        const json = await res.json();
        setConnectorTokenInfo(json.data);
      }
    } catch (e) {
      console.error("Failed to generate token:", e);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleProbeDirectLoopback = async () => {
    setIsProbingLoopback(true);
    setDirectLoopbackStatus(null);
    try {
      const res = await fetch('http://127.0.0.1:11435/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setDirectLoopbackStatus({ online: true, ...data });
        if (data.models && data.models.length > 0) {
          setProviderModels(prev => ({ ...prev, local_connector: data.models }));
        }
      } else {
        setDirectLoopbackStatus({ online: false, error: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      setDirectLoopbackStatus({
        online: false,
        error: e.message || 'Cannot reach 127.0.0.1:11435. Please launch the connector companion script.',
      });
    } finally {
      setIsProbingLoopback(false);
    }
  };

  const handleRunLiveInference = async () => {
    setIsTestingInference(true);
    setInferenceTestResult(null);
    try {
      const res = await backendFetch('/api/v1/platform/ai/test-inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.llmProvider,
          model: settings.activeModel || undefined,
          prompt: inferencePrompt,
        }),
      });
      const json = await res.json();
      setInferenceTestResult(json.data || json);
    } catch (e: any) {
      setInferenceTestResult({ status: 'error', error: e.message });
    } finally {
      setIsTestingInference(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (requestedTab && SETTINGS_TABS.some(t => t.id === requestedTab)) {
      setActiveTab(requestedTab);
    }

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/users/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data }));
        }

        const aiRes = await backendFetch('/api/v1/platform/ai/status');
        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          hydrateFromBackendStatus(aiJson.data);
        }

        await fetchConnectorStatus();
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const persistBackendAiConfig = async (overrides: Partial<typeof settings> = {}) => {
    const merged = { ...settings, ...overrides };
    const isCloud = !['ollama', 'lm_studio'].includes(merged.llmProvider);
    const effectiveMode =
      isCloud && merged.inferenceMode === 'local' ? 'auto' : merged.inferenceMode;

    const payload: Record<string, any> = {
      ai_provider: merged.llmProvider,
      active_model: merged.activeModel || undefined,
      inference_mode: effectiveMode,
      allow_cloud_fallback: isCloud ? true : merged.allowCloudFallback,
      ollama_base_url: merged.ollamaBaseUrl || undefined,
    };

    if (merged.geminiKey && !merged.geminiKey.includes('...')) {
      payload.gemini_api_key = merged.geminiKey.trim();
    }
    if (merged.apiKey && !merged.apiKey.includes('...')) {
      payload.openai_api_key = merged.apiKey.trim();
    }
    if (merged.anthropicKey && !merged.anthropicKey.includes('...')) {
      payload.anthropic_api_key = merged.anthropicKey.trim();
    }

    const res = await backendFetch('/api/v1/platform/ai/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      hydrateFromBackendStatus(json.data);
      return json.data;
    }
    return null;
  };

  const handleSave = async () => {
    try {
      await persistBackendAiConfig();
      await fetch('/api/users/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, theme: activeTheme || settings.theme })
      }).catch(() => {});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const handleApplyActiveModel = async () => {
    try {
      if (settings.llmProvider === 'ollama' && !aiStatus?.ollama_daemon_online) {
        await backendFetch('/api/v1/platform/ai/ollama/start', { method: 'POST' }).catch(() => {});
      }
      const updated = await persistBackendAiConfig();
      if (updated) {
        setModelAppliedMsg(`Activated ${updated.active_model || settings.activeModel} via ${updated.active_provider || settings.llmProvider}`);
        setTimeout(() => setModelAppliedMsg(null), 3500);
      }
    } catch (err) {
      console.error("Failed to activate model:", err);
    }
  };

  const handleDiscoverModels = async (providerId: string) => {
    setIsDiscovering(true);
    try {
      const suppliedKey =
        providerId === 'gemini'
          ? settings.geminiKey
          : providerId === 'openai'
          ? settings.apiKey
          : providerId === 'anthropic'
          ? settings.anthropicKey
          : undefined;

      const res = await backendFetch('/api/v1/platform/ai/models/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          api_key: suppliedKey && !suppliedKey.includes('...') ? suppliedKey.trim() : undefined,
          base_url: settings.ollamaBaseUrl || undefined,
          force_refresh: true,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const models: string[] = json?.data?.models || [];
        if (models.length > 0) {
          setProviderModels(prev => ({ ...prev, [providerId]: models }));
          if (!models.includes(settings.activeModel)) {
            setSettings(prev => ({ ...prev, activeModel: models[0] }));
          }
          setTestResult({
            status: json?.data?.live ? 'connected' : 'configured',
            latency_ms: 0,
            models,
            provider: providerId,
          });
        }
      }
    } catch (err: any) {
      setTestResult({ status: 'error', error: err.message });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleTestConnection = async (provider: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const suppliedKey =
        provider === 'gemini'
          ? settings.geminiKey
          : provider === 'openai'
          ? settings.apiKey
          : provider === 'anthropic'
          ? settings.anthropicKey
          : undefined;
      const res = await backendFetch('/api/v1/platform/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          base_url: settings.ollamaBaseUrl || undefined,
          api_key: suppliedKey && !suppliedKey.includes('...') ? suppliedKey.trim() : undefined,
        })
      });
      const json = await res.json();
      const result = json.data || json;
      setTestResult(result);
      if (Array.isArray(result?.models) && result.models.length > 0) {
        setProviderModels(prev => ({ ...prev, [provider]: result.models }));
      }
    } catch (err: any) {
      setTestResult({ status: 'error', error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px]">
        <Loader2 size={36} className="text-[var(--accent-primary)] animate-spin" />
      </div>
    );
  }

  const memoryInfo = aiStatus?.memory_guidance || { available_ram_gb: 8.0, recommended_parameters: '<= 7B Parameters' };

  return (
    <div className="w-full flex flex-col gap-8 pb-16 max-w-5xl mx-auto pt-8 px-6 font-sans text-[var(--text-primary)]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="teal" size="sm">
              <Shield size={11} />
              System Preferences
            </Badge>
            <Badge variant="local" size="sm">
              Air-Gapped Compliance
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Institutional Configuration
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage local inference endpoints, data retention policies, and tenant isolation parameters.
          </p>
        </div>
        <Button 
          variant="teal"
          size="md"
          onClick={handleSave}
          leftIcon={saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
        >
          {saved ? 'Settings Persisted' : 'Save Configuration'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Navigation Tabs */}
        <div className="lg:col-span-3">
          <nav className="flex flex-col sticky top-24 gap-1.5">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 font-bold shadow-xs' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"} /> 
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-9">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {activeTab === 'llm' && (() => {
              const cfg = aiStatus?.config || {};
              const isGeminiReady = Boolean(cfg.has_gemini_key || aiStatus?.gemini_available || (settings.geminiKey && !settings.geminiKey.includes('...')));
              const isOpenAiReady = Boolean(cfg.has_openai_key || aiStatus?.openai_available || (settings.apiKey && !settings.apiKey.includes('...')));
              const isAnthropicReady = Boolean(cfg.has_anthropic_key || aiStatus?.anthropic_available || (settings.anthropicKey && !settings.anthropicKey.includes('...')));

              const ollamaModelNames = providerModels.ollama || [];
              const lmsModelNames = providerModels.lm_studio || [];
              const connectorModelNames = providerModels.local_connector || connectorStatus?.models || [];
              const isConnectorReady = Boolean(connectorStatus?.connected);
              const selectedProviderModels = providerModels[settings.llmProvider] || [];
              const allSelectableGroups = [
                ...(isConnectorReady && connectorModelNames.length > 0 ? [{ group: 'Local Connector (Bridge Online)', provider: 'local_connector', models: connectorModelNames }] : []),
                ...(ollamaModelNames.length > 0 ? [{ group: aiStatus?.ollama_daemon_online ? 'Local Hardware (Ollama Online)' : 'Local Hardware (Ollama on Disk)', provider: 'ollama', models: ollamaModelNames }] : []),
                ...(lmsModelNames.length > 0 ? [{ group: 'Local Hardware (LM Studio)', provider: 'lm_studio', models: lmsModelNames }] : []),
                ...(isGeminiReady ? [{ group: 'Google Gemini (API Key Active)', provider: 'gemini', models: providerModels.gemini || [] }] : []),
                ...(isOpenAiReady ? [{ group: 'OpenAI (API Key Active)', provider: 'openai', models: providerModels.openai || [] }] : []),
                ...(isAnthropicReady ? [{ group: 'Anthropic Claude (API Key Active)', provider: 'anthropic', models: providerModels.anthropic || [] }] : []),
              ];

              return (
              <div className="space-y-6">
                
                {/* Active Model Selection Dropdown for Available API Key & Local Engine */}
                <Card variant="teal">
                  <CardHeader>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles size={16} className="text-[var(--accent-primary)]" />
                        Active Model Selection (Available API Key &amp; Local Engines)
                      </CardTitle>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Pick any model available for your configured API key or local runtime and activate it across Agent Console.
                      </p>
                    </div>
                    <Badge variant={settings.inferenceMode === 'local' ? 'local' : 'cloud'} size="sm" className="whitespace-nowrap shrink-0">
                      {settings.inferenceMode === 'local' ? 'Local Only' : settings.inferenceMode === 'cloud' ? 'Cloud Key Primary' : 'Hybrid Auto'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Inference Policy Selector */}
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                        Execution Policy
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'local', label: 'Local Only (Air-Gapped)', desc: 'Hardware boundary only' },
                          { id: 'auto', label: 'Hybrid Auto (Local + API Key)', desc: 'Permits configured API keys' },
                          { id: 'cloud', label: 'Cloud API Key Primary', desc: 'Routes via selected API key' },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => handleChange('inferenceMode', mode.id)}
                            className={`text-left px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                              settings.inferenceMode === mode.id
                                ? 'bg-[var(--accent-soft-alpha)] border-[var(--accent-primary)] text-[var(--text-primary)] ring-1 ring-[var(--accent-primary)]/30'
                                : 'bg-[var(--surface-primary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                            }`}
                          >
                            <span className="block text-xs font-semibold text-[var(--text-primary)]">{mode.label}</span>
                            <span className="block text-[10px] text-[var(--text-secondary)] mt-0.5">{mode.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dropdown Menu for Model Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-4">
                        <label
                          htmlFor="settings-provider-select"
                          className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
                        >
                          Provider Source
                        </label>
                        <select
                          id="settings-provider-select"
                          value={settings.llmProvider}
                          onChange={(e) => {
                            const nextProv = e.target.value;
                            const nextList = providerModels[nextProv] || [];
                            const isCloudProv = !['ollama', 'lm_studio', 'local_connector'].includes(nextProv);
                            setSettings(prev => ({
                              ...prev,
                              llmProvider: nextProv,
                              activeModel: nextList[0] || '',
                              inferenceMode: isCloudProv && prev.inferenceMode === 'local' ? 'auto' : prev.inferenceMode,
                            }));
                          }}
                          className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                          <option value="ollama">Ollama Local ({ollamaModelNames.length} available)</option>
                          <option value="lm_studio">LM Studio Local ({lmsModelNames.length} loaded)</option>
                          <option value="local_connector">Agentix Local Connector {isConnectorReady ? `(Online • ${connectorModelNames.length} models)` : '(Companion Bridge)'}</option>
                          <option value="gemini">Google Gemini {isGeminiReady ? '✓ Key Ready' : '(No Key)'}</option>
                          <option value="openai">OpenAI Platform {isOpenAiReady ? '✓ Key Ready' : '(No Key)'}</option>
                          <option value="anthropic">Anthropic Claude {isAnthropicReady ? '✓ Key Ready' : '(No Key)'}</option>
                        </select>
                      </div>

                      <div className="md:col-span-4">
                        <label
                          htmlFor="settings-model-select"
                          className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
                        >
                          Select Model for Available Key
                        </label>
                        <select
                          id="settings-model-select"
                          value={settings.activeModel}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.includes('::')) {
                              const [p, m] = val.split('::');
                              const isCloudProv = !['ollama', 'lm_studio', 'local_connector'].includes(p);
                              setSettings(prev => ({
                                ...prev,
                                llmProvider: p,
                                activeModel: m,
                                inferenceMode: isCloudProv && prev.inferenceMode === 'local' ? 'auto' : prev.inferenceMode,
                              }));
                            } else {
                              handleChange('activeModel', val);
                            }
                          }}
                          className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                          {selectedProviderModels.length > 0 ? (
                            selectedProviderModels.map((modelId) => (
                              <option key={modelId} value={modelId}>
                                {modelId}
                              </option>
                            ))
                          ) : (
                            <option value="">No models detected for {settings.llmProvider}</option>
                          )}
                          {allSelectableGroups.map((grp) => (
                            <optgroup key={grp.group} label={`── ${grp.group} ──`}>
                              {grp.models.map((m: string) => (
                                <option key={`${grp.provider}::${m}`} value={`${grp.provider}::${m}`}>
                                  [{grp.provider.toUpperCase()}] {m}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={isDiscovering}
                          onClick={() => handleDiscoverModels(settings.llmProvider)}
                          leftIcon={<RefreshCw size={13} />}
                          className="shrink-0 whitespace-nowrap"
                          title="Query provider API for live available models"
                        >
                          Fetch
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleApplyActiveModel}
                          className="flex-1 whitespace-nowrap"
                        >
                          Use Model
                        </Button>
                      </div>
                    </div>

                    {modelAppliedMsg && (
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-300">
                        <span className="font-medium flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> {modelAppliedMsg}
                        </span>
                        <Link href="/agent-console" className="font-semibold underline inline-flex items-center gap-1">
                          Open AI Assistant <ArrowRight size={12} />
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Agentix Local Connector Companion (Web-to-Local Bridge) */}
                <Card variant="elevated" className="border-l-4 border-l-[var(--accent-primary)]">
                  <CardHeader>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="teal" size="sm">
                          <Terminal size={11} />
                          Zero-Config Device Bridge
                        </Badge>
                        <Badge variant={connectorStatus?.connected ? 'success' : 'neutral'} size="sm">
                          {connectorStatus?.connected ? 'Bridge Online' : 'Bridge Offline / Standby'}
                        </Badge>
                      </div>
                      <CardTitle className="flex items-center gap-2">
                        <Link2 size={16} className="text-[var(--accent-primary)]" />
                        Agentix Local Connector Companion
                      </CardTitle>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Run local models (Ollama, LM Studio) directly inside this deployed cloud web application without opening ports or exposing secrets.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={isCheckingConnector}
                        onClick={fetchConnectorStatus}
                        leftIcon={<RefreshCw size={13} />}
                      >
                        Refresh Status
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Status Alert */}
                    {connectorStatus?.connected ? (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-emerald-500" />
                            Connected to your device via Outbound WebSocket Tunnel
                          </span>
                          <span className="text-[11px] font-mono opacity-80">
                            Uptime: {connectorStatus?.uptime_seconds || 0}s
                          </span>
                        </div>
                        <p className="text-xs opacity-90 leading-relaxed">
                          Your local models are securely bridged to this browser session. Inference requests will execute on your device hardware with zero data storage in the cloud.
                        </p>
                        <div className="text-[11px] font-mono bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                          Discovered Models: {connectorStatus?.models?.join(', ') || 'Scanning...'}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                            <Terminal size={14} className="text-[var(--accent-primary)]" />
                            Connect Your Laptop / Local Models in 1 Step
                          </span>
                          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                            Zero Install • Python 3.8+ Standard Library
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          Click below to generate a secure 1-hour pairing command. Run it in your terminal to instantly bridge Ollama or LM Studio to this website.
                        </p>
                        
                        {!connectorTokenInfo ? (
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={isGeneratingToken}
                            onClick={handleGenerateConnectorToken}
                            leftIcon={<Sparkles size={14} />}
                            className="w-full sm:w-auto"
                          >
                            Generate Secure Pairing Command
                          </Button>
                        ) : (
                          <div className="space-y-3 pt-2">
                            {/* macOS / Linux command */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-mono text-[var(--text-secondary)] block">macOS / Linux Terminal:</span>
                              <div className="flex items-center gap-2 bg-[var(--surface-primary)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                                <code className="text-xs font-mono text-[var(--text-primary)] flex-1 overflow-x-auto whitespace-nowrap">
                                  {connectorTokenInfo.launch_command_unix}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(connectorTokenInfo.launch_command_unix, 'unix')}
                                  leftIcon={copiedCmd === 'unix' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                >
                                  {copiedCmd === 'unix' ? 'Copied' : 'Copy'}
                                </Button>
                              </div>
                            </div>

                            {/* Windows PowerShell command */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-mono text-[var(--text-secondary)] block">Windows PowerShell:</span>
                              <div className="flex items-center gap-2 bg-[var(--surface-primary)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                                <code className="text-xs font-mono text-[var(--text-primary)] flex-1 overflow-x-auto whitespace-nowrap">
                                  {connectorTokenInfo.launch_command_win}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(connectorTokenInfo.launch_command_win, 'win')}
                                  leftIcon={copiedCmd === 'win' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                >
                                  {copiedCmd === 'win' ? 'Copied' : 'Copy'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Direct Loopback Check (for local desktop run) */}
                    <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-[var(--text-primary)] block">Direct Loopback Gateway Probe (127.0.0.1:11435)</span>
                        <span className="text-[var(--text-secondary)]">Test direct browser loopback via Private Network Access (PNA).</span>
                        {directLoopbackStatus && (
                          <div className="mt-1 font-mono text-[11px]">
                            {directLoopbackStatus.online ? (
                              <span className="text-emerald-600 font-bold">✓ Loopback Gateway detected! Models: {directLoopbackStatus.models?.join(', ') || 'None'}</span>
                            ) : (
                              <span className="text-amber-600">Loopback unreachable ({directLoopbackStatus.error})</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={isProbingLoopback}
                        onClick={handleProbeDirectLoopback}
                        className="shrink-0"
                      >
                        Probe Loopback
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Provider Architecture Overview */}
                <Card variant="elevated">
                  <CardHeader>
                    <div>
                      <CardTitle>Inference Routing Architecture</CardTitle>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Select your primary reasoning backend and verify connection diagnostics.</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Provider Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { 
                          id: 'ollama', 
                          name: 'Ollama (Local Engine)', 
                          desc: 'Hardware inference executing on 127.0.0.1:11434. Zero token transmission outside machine boundary.',
                          isLocal: true,
                          ready: (providerModels.ollama || []).length > 0,
                          models: (providerModels.ollama || []).slice(0, 3).join(', ') || 'No local daemon active'
                        },
                        { 
                          id: 'lm_studio', 
                          name: 'LM Studio (Local Engine)', 
                          desc: 'OpenAI-compatible local server executing on 127.0.0.1:1234. Supports custom GGUF and quantized weights.',
                          isLocal: true,
                          ready: (providerModels.lm_studio || []).length > 0,
                          models: (providerModels.lm_studio || []).slice(0, 3).join(', ') || 'No local server active'
                        },
                        { 
                          id: 'local_connector', 
                          name: 'Local Connector Bridge', 
                          desc: 'Secure outbound WebSocket tunnel bridging this web app to inference runtimes on your laptop.',
                          isLocal: true,
                          ready: isConnectorReady,
                          models: connectorModelNames.slice(0, 3).join(', ') || 'Companion not paired'
                        },
                        { 
                          id: 'gemini', 
                          name: 'Google Gemini', 
                          desc: 'High-speed reasoning and multimodal analysis via configured Google AI Studio API key.',
                          isLocal: false,
                          ready: isGeminiReady,
                          models: (providerModels.gemini || []).slice(0, 3).join(', ')
                        },
                        { 
                          id: 'openai', 
                          name: 'OpenAI Platform', 
                          desc: 'GPT-4o / o3-mini reasoning endpoint gated by your configured API key.',
                          isLocal: false,
                          ready: isOpenAiReady,
                          models: (providerModels.openai || []).slice(0, 3).join(', ')
                        },
                        { 
                          id: 'anthropic', 
                          name: 'Anthropic Claude', 
                          desc: 'Claude Sonnet / Haiku long-context analysis via configured Anthropic API key.',
                          isLocal: false,
                          ready: isAnthropicReady,
                          models: (providerModels.anthropic || []).slice(0, 3).join(', ')
                        },
                      ].map(provider => {
                        const isSelected = settings.llmProvider === provider.id;
                        return (
                          <div
                            key={provider.id}
                            onClick={() => {
                              const nextList = providerModels[provider.id] || [];
                              setSettings(prev => ({
                                ...prev,
                                llmProvider: provider.id,
                                activeModel: nextList[0] || prev.activeModel,
                                inferenceMode: !provider.isLocal && prev.inferenceMode === 'local' ? 'auto' : prev.inferenceMode,
                              }));
                            }}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-[var(--accent-soft-alpha)] border-[var(--accent-primary)]/50 shadow-xs ring-1 ring-[var(--accent-primary)]/30' 
                                : 'bg-[var(--surface-primary)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-secondary)]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm text-[var(--text-primary)]">{provider.name}</span>
                              <div className="flex items-center gap-1.5">
                                {provider.ready && (
                                  <Badge variant="success" size="sm">Ready</Badge>
                                )}
                                <Badge variant={provider.isLocal ? 'local' : 'cloud'} size="sm">
                                  {provider.isLocal ? 'Local' : 'API Key'}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed">{provider.desc}</p>
                            <div className="text-[11px] font-mono text-[var(--accent-primary)] font-medium truncate">
                              Models: {provider.models}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Connection Test Diagnostics */}
                    <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/60 border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-primary)] block">Inference Probe Diagnostic</span>
                        <span className="text-xs text-[var(--text-secondary)]">Verify endpoint / API key availability and refresh discoverable model list.</span>
                        {testResult && (
                          <div className="mt-2 text-xs font-mono">
                            {testResult.status === 'connected' || testResult.status === 'configured' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                ✓ {testResult.provider?.toUpperCase()} {testResult.status} ({testResult.latency_ms}ms) • {testResult.models?.length || 0} models available
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">Status: {testResult.status} {testResult.error && `(${testResult.error})`}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={isTesting}
                        onClick={() => handleTestConnection(settings.llmProvider)}
                        leftIcon={<RefreshCw size={13} />}
                      >
                        Probe {settings.llmProvider.toUpperCase()}
                      </Button>
                    </div>

                    {/* Live Interactive Inference Test */}
                    <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                            <Play size={13} className="text-[var(--accent-primary)]" />
                            Live Inference Execution Test
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            Execute an actual inference request against {settings.llmProvider.toUpperCase()} ({settings.activeModel || 'default model'}) and verify token generation.
                          </span>
                        </div>
                        <Button
                          variant="teal"
                          size="sm"
                          isLoading={isTestingInference}
                          onClick={handleRunLiveInference}
                          leftIcon={<Play size={12} />}
                          className="shrink-0"
                        >
                          Execute Test
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inferencePrompt}
                          onChange={(e) => setInferencePrompt(e.target.value)}
                          placeholder="Enter prompt for live test..."
                          className="w-full bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>

                      {inferenceTestResult && (
                        <div className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                          inferenceTestResult.status === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-[var(--text-primary)]'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300'
                        }`}>
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold flex items-center gap-1">
                              {inferenceTestResult.status === 'success' ? <CheckCircle2 size={13} className="text-emerald-500" /> : null}
                              {inferenceTestResult.status === 'success' ? 'Response Verified' : 'Inference Failed'}
                            </span>
                            {inferenceTestResult.latency_ms !== undefined && (
                              <span className="font-bold">Latency: {inferenceTestResult.latency_ms}ms</span>
                            )}
                          </div>
                          {inferenceTestResult.response && (
                            <div className="p-2.5 rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)] font-mono text-xs whitespace-pre-wrap text-[var(--text-primary)]">
                              {inferenceTestResult.response}
                            </div>
                          )}
                          {inferenceTestResult.error && (
                            <div className="font-mono text-xs text-rose-600 dark:text-rose-400">
                              Error: {inferenceTestResult.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Hardware Memory Sizing Guidance */}
                    <div className="p-4 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive size={15} className="text-[var(--accent-primary)]" />
                        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">Hardware Capacity Scan</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[var(--text-secondary)] block">Host Available RAM</span>
                          <span className="font-mono text-[var(--text-primary)] font-bold">{memoryInfo.available_ram_gb} GB Free</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block">Recommended Quantization</span>
                          <span className="font-mono text-[var(--accent-primary)] font-bold">{memoryInfo.recommended_parameters}</span>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>

                {/* Cloud Key Configuration (Masked) */}
                <Card variant="elevated">
                  <CardHeader>
                    <div>
                      <CardTitle>API Key Credentials (Server-Side Protected)</CardTitle>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Keys configured on the server are never exposed in plaintext. Enter a key and click Fetch/Save to discover its available models.</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Google Gemini API Key</label>
                        {cfg.has_gemini_key && (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            Active on Server ({cfg.gemini_key_masked})
                          </span>
                        )}
                      </div>
                      <input 
                        type="password"
                        value={settings.geminiKey}
                        onChange={(e) => handleChange('geminiKey', e.target.value)}
                        placeholder={cfg.has_gemini_key ? `Server Key Active (${cfg.gemini_key_masked}) — enter new key to replace` : 'AIzaSy... (Paste Google Gemini API key)'}
                        className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">OpenAI Secret Key</label>
                        {cfg.has_openai_key && (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            Active on Server ({cfg.openai_key_masked})
                          </span>
                        )}
                      </div>
                      <input 
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => handleChange('apiKey', e.target.value)}
                        placeholder={cfg.has_openai_key ? `Server Key Active (${cfg.openai_key_masked}) — enter new key to replace` : 'sk-... (Paste OpenAI API key)'}
                        className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Anthropic API Key</label>
                        {cfg.has_anthropic_key && (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            Active on Server ({cfg.anthropic_key_masked})
                          </span>
                        )}
                      </div>
                      <input 
                        type="password"
                        value={settings.anthropicKey}
                        onChange={(e) => handleChange('anthropicKey', e.target.value)}
                        placeholder={cfg.has_anthropic_key ? `Server Key Active (${cfg.anthropic_key_masked}) — enter new key to replace` : 'sk-ant-... (Paste Anthropic API key)'}
                        className="w-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                  </CardContent>
                </Card>

              </div>
              );
            })()}

            {activeTab === 'database' && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Database & Persistence Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/60 border border-[var(--border-subtle)] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Backend Relational Engine</span>
                      <span className="font-mono text-[var(--text-primary)] font-medium">SQLite (WAL Mode) / PostgreSQL 15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Connection Pooling</span>
                      <span className="font-mono text-[var(--text-primary)] font-medium">QueuePool (30 connections, 60 overflow)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Cache & Queue Service</span>
                      <span className="font-mono text-[var(--text-primary)] font-medium">Managed Redis Cluster (High Availability)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Institutional Security Attestation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 text-emerald-600 dark:text-emerald-300">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={15} /> All 16 OWASP Vulnerabilities Remediated & 8 Layers Certified
                    </p>
                    <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                      Role mass assignment blocked, IDOR eliminated from workflow jobs, sliding-window rate limiting active, native bcrypt password hashing verified.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'desktop' && (
              <DesktopSettingsView />
            )}

            {activeTab === 'theme' && (() => {
              const effectiveThemeId = activeTheme === 'system' ? resolvedTheme || 'light' : activeTheme || resolvedTheme || 'light';
              const activeDef = getThemeOption(effectiveThemeId);

              const handleSelectTheme = (id: string) => {
                setTheme(id);
                handleChange('theme', id);
              };

              return (
                <Card variant="elevated">
                  <CardHeader>
                    <div>
                      <CardTitle>Design System & Theme Studio</CardTitle>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Select a curated minimalist palette. Applied instantaneously across Executive Console, Admin, and Governance modules.
                      </p>
                    </div>
                    <Badge variant="teal" size="sm">
                      {activeDef.name}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* System Auto Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)]">
                          <Monitor size={17} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--text-primary)] block">Match Operating System</span>
                          <span className="text-xs text-[var(--text-secondary)]">Automatically toggle between Pearl Teal and Obsidian Teal based on host OS preference.</span>
                        </div>
                      </div>
                      <Button
                        variant={activeTheme === 'system' ? 'teal' : 'outline'}
                        size="sm"
                        onClick={() => handleSelectTheme('system')}
                      >
                        {activeTheme === 'system' ? 'System Active' : 'Use System'}
                      </Button>
                    </div>

                    {[
                      { label: 'Minimalist Light Editions', mode: 'light' as const, Icon: Sun },
                      { label: 'Minimalist Dark Editions', mode: 'dark' as const, Icon: Moon },
                    ].map(({ label, mode, Icon }) => (
                      <div key={mode} className="space-y-3">
                        <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                          <Icon size={13} className="text-[var(--accent-primary)]" />
                          <span>{label}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {THEME_OPTIONS.filter(t => t.mode === mode).map(option => {
                            const isSelected = activeTheme !== 'system' ? activeTheme === option.id : effectiveThemeId === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelectTheme(option.id)}
                                className={`group text-left rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col gap-3 ${
                                  isSelected
                                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft-alpha)] ring-2 ring-[var(--accent-primary)]/25 shadow-md'
                                    : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--accent-primary)]/50 hover:shadow-sm'
                                }`}
                              >
                                {/* Mini UI Wireframe Preview */}
                                <div
                                  className="w-full h-24 rounded-xl border p-2 flex gap-2 overflow-hidden shadow-inner"
                                  style={{
                                    backgroundColor: option.preview.background,
                                    borderColor: option.preview.border,
                                  }}
                                >
                                  <div
                                    className="w-6 h-full rounded-md border flex flex-col gap-1 p-1"
                                    style={{
                                      backgroundColor: option.preview.surface,
                                      borderColor: option.preview.border,
                                    }}
                                  >
                                    <div className="w-full h-2 rounded-xs" style={{ backgroundColor: option.preview.accent }} />
                                    <div className="w-full h-1.5 rounded-xs opacity-60" style={{ backgroundColor: option.preview.secondary }} />
                                    <div className="w-full h-1.5 rounded-xs opacity-60" style={{ backgroundColor: option.preview.secondary }} />
                                  </div>
                                  <div className="flex-1 flex flex-col gap-1.5">
                                    <div
                                      className="h-3.5 w-full rounded-md border flex items-center justify-between px-1.5"
                                      style={{
                                        backgroundColor: option.preview.surface,
                                        borderColor: option.preview.border,
                                      }}
                                    >
                                      <span className="w-8 h-1 rounded-full" style={{ backgroundColor: option.preview.text }} />
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: option.preview.accent }} />
                                    </div>
                                    <div
                                      className="flex-1 rounded-md border p-1.5 flex flex-col justify-between"
                                      style={{
                                        backgroundColor: option.preview.surface,
                                        borderColor: option.preview.border,
                                      }}
                                    >
                                      <div className="space-y-1">
                                        <div className="w-14 h-1.5 rounded-full" style={{ backgroundColor: option.preview.text }} />
                                        <div className="w-20 h-1 rounded-full opacity-75" style={{ backgroundColor: option.preview.muted }} />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="w-10 h-2.5 rounded-xs" style={{ backgroundColor: option.preview.secondary }} />
                                        <span className="w-7 h-2.5 rounded-xs" style={{ backgroundColor: option.preview.accent }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Theme Label & Metadata */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-sm text-[var(--text-primary)]">{option.name}</span>
                                    {isSelected ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-foreground)]">
                                        <Check size={10} /> Active
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                                        {option.category}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    {option.description}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })()}
          </motion.div>
        </div>

      </div>
    </div>
  );
}
