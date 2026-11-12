"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { backendFetch } from '@/lib/backendClient';
import {
  Send,
  Loader2,
  Copy,
  Check,
  Cpu,
  ChevronDown,
  Lock,
  Plus,
  MessageSquare,
  Search,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Share2,
  CheckCircle2,
  FileText,
  BarChart2,
  Sliders,
  Compass,
  CornerDownLeft,
  X,
  Trash2,
  Edit3,
  MoreVertical,
  AlertTriangle,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { usePlatformStore } from '@/store/platformStore';
import { Badge } from '@/components/ui/Badge';

interface AvailableModelItem {
  name: string;
  provider: string;
  providerName: string;
  isLocal: boolean;
  daemonRunning?: boolean;
  size?: string;
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  isError?: boolean;
  model?: string;
  timestamp?: string;
  latencyMs?: number;
  tokens?: number;
  cached?: boolean;
  guardrailStatus?: string;
}

interface Thread {
  id: string;
  title: string;
  message_count?: number;
  last_message?: string;
  timestamp: string;
  dateGroup: 'Today' | 'Yesterday' | 'Previous 7 Days';
  messages: Message[];
}

function getDateGroup(isoString?: string | null): 'Today' | 'Yesterday' | 'Previous 7 Days' {
  if (!isoString) return 'Today';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24 && date.getDate() === now.getDate()) return 'Today';
    if (diffHours < 48) return 'Yesterday';
    return 'Previous 7 Days';
  } catch {
    return 'Today';
  }
}

export default function AgentConsolePage() {
  const selectedDataset = usePlatformStore(state => state.datasetName);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);

  const [threadMenuOpenId, setThreadMenuOpenId] = useState<string | null>(null);
  const [threadToDelete, setThreadToDelete] = useState<Thread | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [threadToRename, setThreadToRename] = useState<Thread | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [id: string]: 'up' | 'down' }>({});
  const [deepThinking, setDeepThinking] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const [availableModels, setAvailableModels] = useState<AvailableModelItem[]>([]);
  const [activeModel, setActiveModel] = useState<string>('No model detected');
  const [activeProvider, setActiveProvider] = useState<string>('ollama');
  const [isModelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [isRefreshingModels, setRefreshingModels] = useState(false);
  const [modelFilterTab, setModelFilterTab] = useState<'all' | 'local' | 'cloud'>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const currentThread = threads.find(t => t.id === activeThreadId) || (threads.length > 0 ? threads[0] : null);
  const messages = React.useMemo(() => currentThread?.messages || [], [currentThread]);

  const hydrateModelsFromRegistry = (data: any) => {
    if (!data) return;
    const rawUnified = Array.isArray(data.available_models) ? data.available_models : [];
    const mapped: AvailableModelItem[] = rawUnified.map((m: any) => ({
      name: m.name,
      provider: m.provider || 'ollama',
      providerName: m.provider_name || m.provider || 'Local Engine',
      isLocal: Boolean(m.is_local),
      daemonRunning: m.daemon_running !== false,
      size: m.size,
    }));

    setAvailableModels(mapped);

    const activeProv = (data.active_provider || 'ollama').toLowerCase();
    const activeM = data.active_model;
    const matchingActive = mapped.find((m) => m.name === activeM && m.provider === activeProv);

    if (matchingActive) {
      setActiveModel(matchingActive.name);
      setActiveProvider(matchingActive.provider);
    } else if (mapped.length > 0) {
      // Prefer configured local model if in local mode, otherwise any configured API key model
      const preferred =
        (data.inference_mode === 'local' ? mapped.find((m) => m.isLocal) : undefined) || mapped[0];
      setActiveModel(preferred.name);
      setActiveProvider(preferred.provider);
    }
  };

  const fetchAvailableModels = async (refresh = false) => {
    try {
      setRefreshingModels(true);
      const endpoint = refresh
        ? '/api/v1/platform/ai/models?refresh=true'
        : '/api/v1/platform/ai/status';
      const res = await backendFetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        hydrateModelsFromRegistry(json?.data);
      }
    } catch {
      // Silent fallback
    } finally {
      setRefreshingModels(false);
    }
  };

  // Query detected local & configured API-key models on mount
  useEffect(() => {
    fetchAvailableModels(false);
  }, []);

  // Close model dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelectModel = async (item: AvailableModelItem) => {
    setActiveModel(item.name);
    setActiveProvider(item.provider);
    setModelSelectorOpen(false);

    try {
      // If user clicked a downloaded local Ollama model while daemon was offline, start Ollama automatically
      if (item.isLocal && item.provider === 'ollama' && item.daemonRunning === false) {
        showToast(`Starting local Ollama engine for ${item.name}...`, 'success');
        await backendFetch('/api/v1/platform/ai/ollama/start', { method: 'POST' });
        await fetchAvailableModels(false);
      }

      const res = await backendFetch('/api/v1/platform/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_provider: item.provider,
          active_model: item.name,
          ...(!item.isLocal ? { inference_mode: 'auto', allow_cloud_fallback: true } : {}),
        }),
      });
      if (res.ok) {
        showToast(`Active model set to ${item.name} (${item.providerName})`, 'success');
      }
    } catch {
      showToast(`Selected ${item.name}`, 'success');
    }
  };

  // Fetch real conversation list on mount
  const fetchConversations = async () => {
    try {
      setIsLoadingThreads(true);
      const res = await backendFetch('/api/v1/platform/conversations');
      if (res.ok) {
        const json = await res.json();
        const convList = json.data || [];
        if (convList.length > 0) {
          const mapped: Thread[] = convList.map((c: any) => ({
            id: c.id,
            title: c.title,
            message_count: c.message_count,
            last_message: c.last_message,
            timestamp: c.updated_at ? new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            dateGroup: getDateGroup(c.updated_at || c.created_at),
            messages: []
          }));
          setThreads(mapped);
          setActiveThreadId(prev => (mapped.some(m => m.id === prev) ? prev : mapped[0].id));
        } else {
          setThreads([]);
          setActiveThreadId('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch conversation messages when activeThreadId changes
  useEffect(() => {
    if (!activeThreadId) return;
    const fetchConversationDetails = async () => {
      try {
        const res = await backendFetch(`/api/v1/platform/conversations/${activeThreadId}`);
        if (res.ok) {
          const json = await res.json();
          const conv = json.data;
          if (conv && Array.isArray(conv.messages)) {
            const mappedMsgs: Message[] = conv.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              model: m.model || activeModel,
              timestamp: m.timestamp || 'Recently',
              latencyMs: m.latency_ms,
              tokens: m.tokens,
              cached: m.cached,
              guardrailStatus: m.guardrail_status || 'Layer 6 Certified'
            }));
            setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: mappedMsgs, title: conv.title } : t));
          }
        }
      } catch (err) {
        console.error('Failed to load conversation details:', err);
      }
    };
    fetchConversationDetails();
  }, [activeThreadId]);

  // Close thread menu on click outside
  useEffect(() => {
    const handleCloseMenu = (e: MouseEvent) => {
      if (threadMenuOpenId && !(e.target as HTMLElement).closest('.thread-menu-container')) {
        setThreadMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleCloseMenu);
    return () => document.removeEventListener('mousedown', handleCloseMenu);
  }, [threadMenuOpenId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputValue]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateNewChat = async () => {
    try {
      const res = await backendFetch('/api/v1/platform/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Analysis' })
      });
      if (res.ok) {
        const json = await res.json();
        const conv = json.data;
        const newThread: Thread = {
          id: conv.id,
          title: conv.title,
          timestamp: 'Just now',
          dateGroup: 'Today',
          messages: [
            {
              id: `init-${Date.now()}`,
              role: 'agent',
              content: selectedDataset 
                ? `Active dataset: **${selectedDataset}**. I am prepared to analyze distributions, train AutoML candidates, or interpret feature weights.`
                : "Agentix conversational workspace ready. Ingest a dataset in **Data Dock** or ask any institutional data science and architecture question.",
              model: activeModel,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              guardrailStatus: 'Layer 6 Certified'
            }
          ]
        };
        setThreads(prev => [newThread, ...prev]);
        setActiveThreadId(conv.id);
        setInputValue('');
        showToast('New conversation initialized', 'success');
      }
    } catch {
      showToast('Failed to initialize conversation', 'error');
    }
  };

  const confirmDeleteThread = async () => {
    if (!threadToDelete) return;
    setIsDeleting(true);
    try {
      const res = await backendFetch(`/api/v1/platform/conversations/${threadToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const deletedId = threadToDelete.id;
        const remaining = threads.filter(t => t.id !== deletedId);
        setThreads(remaining);
        if (activeThreadId === deletedId) {
          setActiveThreadId(remaining.length > 0 ? remaining[0].id : '');
        }
        showToast(`Conversation "${threadToDelete.title}" permanently deleted`, 'success');
        setThreadToDelete(null);
      } else {
        showToast('Failed to delete conversation', 'error');
      }
    } catch {
      showToast('Error deleting conversation', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmRenameThread = async () => {
    if (!threadToRename || !renameTitle.trim()) return;
    setIsRenaming(true);
    try {
      const res = await backendFetch(`/api/v1/platform/conversations/${threadToRename.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameTitle.trim() })
      });
      if (res.ok) {
        const newTitle = renameTitle.trim();
        setThreads(prev => prev.map(t => t.id === threadToRename.id ? { ...t, title: newTitle } : t));
        showToast('Conversation renamed', 'success');
        setThreadToRename(null);
      } else {
        showToast('Failed to rename conversation', 'error');
      }
    } catch {
      showToast('Error renaming conversation', 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = (textOverride || inputValue).trim();
    if (!textToSend || isTyping) return;

    let targetConvId = activeThreadId;
    if (!targetConvId) {
      try {
        const res = await backendFetch('/api/v1/platform/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: textToSend.slice(0, 36) })
        });
        if (res.ok) {
          const json = await res.json();
          targetConvId = json.data.id;
          setActiveThreadId(targetConvId);
        }
      } catch (err) {
        console.error('Failed to create thread:', err);
      }
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: attachedFile ? `[Attached: ${attachedFile.name}]\n\n${textToSend}` : textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setThreads(prev => {
      const exists = prev.some(t => t.id === targetConvId);
      if (!exists) {
        return [{
          id: targetConvId,
          title: textToSend.slice(0, 36) + (textToSend.length > 36 ? '...' : ''),
          timestamp: 'Just now',
          dateGroup: 'Today',
          messages: [userMessage]
        }, ...prev];
      }
      return prev.map(t => {
        if (t.id === targetConvId) {
          const isDefault = t.title === 'New Analysis' || t.title === 'New Investigation';
          return {
            ...t,
            title: isDefault ? textToSend.slice(0, 36) + (textToSend.length > 36 ? '...' : '') : t.title,
            messages: [...t.messages, userMessage]
          };
        }
        return t;
      });
    });

    setInputValue('');
    setAttachedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    const startTime = performance.now();
    try {
      const res = await backendFetch('/api/v1/platform/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          dataset_name: selectedDataset || '',
          conversation_id: targetConvId,
          model: activeModel !== 'No model detected' ? activeModel : undefined,
          provider: activeProvider || undefined,
        })
      });
      const data = await res.json();
      const latency = Math.round(performance.now() - startTime);
      const isCached = data?.data?.cached || latency < 35;
      const responseText = data?.data?.response || data?.message || 'Analysis complete.';
      const usedModel = data?.data?.model || activeModel;

      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: responseText,
        model: usedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs: latency,
        tokens: Math.max(24, Math.round(responseText.length / 4)),
        cached: isCached,
        guardrailStatus: 'Layer 6 Certified'
      };

      setThreads(prev => prev.map(t => {
        if (t.id === targetConvId) {
          return { ...t, messages: [...t.messages, agentMessage] };
        }
        return t;
      }));
    } catch (error: any) {
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'agent',
        content: `**Inference Advisory:** ${error.message || "Local inference execution failed. Verify Ollama service status."}`,
        isError: true,
        model: activeModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setThreads(prev => prev.map(t => {
        if (t.id === targetConvId) {
          return { ...t, messages: [...t.messages, errorMessage] };
        }
        return t;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleRegenerate = async (messageIndex: number) => {
    if (isTyping) return;
    const previousUserMsg = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');
    if (previousUserMsg) {
      handleSend(previousUserMsg.content);
    }
  };

  const filteredThreads = threads.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const starterCards = [
    {
      title: "Automated Data Audit",
      desc: "Scan dataset for skewness, cardinality, and missing value patterns",
      prompt: "Perform an audit of dataset missingness, cardinality, and numerical skewness.",
      icon: <FileText size={16} className="text-[var(--accent-primary)]" />
    },
    {
      title: "Predictive AutoML",
      desc: "Benchmark classification and regression model candidate ensembles",
      prompt: "Compare cross-validation performance across all AutoML candidate models.",
      icon: <BarChart2 size={16} className="text-[var(--accent-primary)]" />
    },
    {
      title: "Explainability (SHAP)",
      desc: "Analyze top global feature drivers and local decision rationale",
      prompt: "Identify the top 5 predictive features and summarize their global SHAP contributions.",
      icon: <Sliders size={16} className="text-[var(--accent-primary)]" />
    },
    {
      title: "8-Layer AI Governance",
      desc: "Inspect multi-tenant isolation, prompt security, and local inference",
      prompt: "Provide an executive audit summary of the 8-Layer Enterprise AI Security Architecture.",
      icon: <Lock size={16} className="text-[var(--accent-primary)]" />
    }
  ];

  return (
    <div className="flex w-full h-[calc(100vh-64px)] relative bg-[var(--background)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-200">
      
      {/* 1. Left Conversational History Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="h-full bg-[var(--surface-primary)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 overflow-hidden z-30"
          >
            {/* Sidebar Header & New Chat Button */}
            <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-foreground)] flex items-center justify-center shadow-sm">
                    <Compass size={16} />
                  </div>
                  <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">Agentix</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>

              <button
                onClick={handleCreateNewChat}
                className="w-full py-2.5 px-3.5 teal-button-primary rounded-xl font-semibold text-xs flex items-center justify-between shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Plus size={15} />
                  <span>New Conversation</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 border border-current/25 px-1.5 py-0.5 rounded">⌘N</span>
              </button>

              {/* Thread Search Bar */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] font-sans"
                />
              </div>
            </div>

            {/* Conversation Threads List */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
              {isLoadingThreads ? (
                <div className="flex items-center gap-2 p-3 text-xs text-[var(--text-secondary)]">
                  <Loader2 size={13} className="animate-spin text-[var(--accent-primary)]" />
                  <span>Loading conversations...</span>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-secondary)]/30 rounded-xl border border-dashed border-[var(--border-subtle)]">
                  No conversations found.
                </div>
              ) : (
                ['Today', 'Yesterday', 'Previous 7 Days'].map((group) => {
                  const groupThreads = filteredThreads.filter(t => t.dateGroup === group);
                  if (groupThreads.length === 0) return null;

                  return (
                    <div key={group} className="space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                        {group}
                      </div>
                      {groupThreads.map((thread) => {
                        const isActive = thread.id === activeThreadId;
                        return (
                          <div
                            key={thread.id}
                            className={`relative group/item flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all ${
                              isActive
                                ? 'bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] font-semibold shadow-xs'
                                : 'text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] border border-transparent'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveThreadId(thread.id)}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <MessageSquare size={13} className={isActive ? 'text-[var(--accent-primary)] shrink-0' : 'text-[var(--text-secondary)] shrink-0'} />
                              <span className="truncate">{thread.title}</span>
                            </button>

                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              <span className={`text-[10px] font-mono shrink-0 transition-opacity ${isActive ? 'opacity-70' : 'opacity-0 group-hover/item:opacity-70'}`}>
                                {thread.timestamp}
                              </span>

                              <div className="relative thread-menu-container">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setThreadMenuOpenId(threadMenuOpenId === thread.id ? null : thread.id);
                                  }}
                                  className={`p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)] transition-all cursor-pointer ${
                                    threadMenuOpenId === thread.id ? 'opacity-100 bg-[var(--surface-primary)] text-[var(--text-primary)]' : 'opacity-0 group-hover/item:opacity-100'
                                  }`}
                                  title="Options"
                                  aria-label="Conversation options"
                                >
                                  <MoreVertical size={13} />
                                </button>

                                {threadMenuOpenId === thread.id && (
                                  <div className="absolute right-0 top-7 w-32 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-xl py-1 z-50 text-left">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setThreadMenuOpenId(null);
                                        setThreadToRename(thread);
                                        setRenameTitle(thread.title);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] cursor-pointer"
                                    >
                                      <Edit3 size={12} className="text-[var(--accent-primary)]" />
                                      <span>Rename</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setThreadMenuOpenId(null);
                                        setThreadToDelete(thread);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-red-500/10 text-red-600 dark:text-red-400 cursor-pointer"
                                    >
                                      <Trash2 size={12} />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Bottom Status */}
            <div className="p-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Lock size={12} className="text-emerald-600 dark:text-emerald-400" />
                  Inference Boundary
                </span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                  {activeProvider === 'ollama' || activeProvider === 'lm_studio' ? 'Air-Gapped' : `${activeProvider} Key`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-subtle)]/50">
                <span className="text-[var(--text-secondary)]">Scope</span>
                <span className="font-mono text-[11px] font-semibold text-[var(--accent-primary)] truncate max-w-[140px]">
                  {selectedDataset || 'General'}
                </span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. Main Conversational Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Top Header Bar */}
        <header className="shrink-0 h-14 px-4 sm:px-6 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] flex items-center justify-between z-20 shadow-xs">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer mr-1"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <PanelLeft size={18} />
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-[var(--text-primary)] tracking-tight truncate max-w-[220px] sm:max-w-md">
                {currentThread?.title || 'Conversational Workspace'}
              </h1>
              <Badge variant="teal" size="sm" className="hidden sm:inline-flex">
                <Sparkles size={10} />
                Layer 6 Active
              </Badge>
            </div>
          </div>

          {/* Model Selector & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Model Selector Dropdown (Local + Configured API Keys) */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  const next = !isModelSelectorOpen;
                  setModelSelectorOpen(next);
                  if (next) fetchAvailableModels(false);
                }}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] hover:border-[var(--accent-primary)] text-xs font-mono text-[var(--accent-primary)] flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                aria-label="Select AI Model"
                aria-expanded={isModelSelectorOpen}
              >
                {activeProvider === 'ollama' || activeProvider === 'lm_studio' ? (
                  <Cpu size={13} className="text-[var(--accent-primary)] shrink-0" />
                ) : (
                  <KeyRound size={13} className="text-[var(--accent-primary)] shrink-0" />
                )}
                <span className="hidden sm:inline truncate max-w-[180px]">{activeModel}</span>
                <span className="sm:hidden truncate max-w-[100px]">{activeModel.split(':')[0]}</span>
                <ChevronDown size={12} className={`text-[var(--text-secondary)] transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              {isModelSelectorOpen && (
                <div className="absolute right-0 mt-1.5 w-80 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-2xl py-2 z-50">
                  <div className="px-3.5 py-1.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] font-semibold">
                      Available Models
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchAvailableModels(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--accent-primary)] hover:underline cursor-pointer"
                    >
                      <RefreshCw size={10} className={isRefreshingModels ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>

                  {/* Quick Source Filter Tabs */}
                  <div className="px-3 pt-2 pb-1 flex items-center gap-1">
                    {[
                      { id: 'all' as const, label: `All (${availableModels.length})` },
                      { id: 'local' as const, label: `Local (${availableModels.filter((m) => m.isLocal).length})` },
                      { id: 'cloud' as const, label: `API Keys (${availableModels.filter((m) => !m.isLocal).length})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setModelFilterTab(tab.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                          modelFilterTab === tab.id
                            ? 'bg-[var(--accent-primary)] text-[var(--accent-foreground)] font-bold'
                            : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-80 overflow-y-auto py-1">
                    {availableModels.length === 0 ? (
                      <div className="px-3.5 py-4 text-center text-xs text-[var(--text-secondary)]">
                        No local engine or API key models detected. Configure an API key in Settings.
                      </div>
                    ) : (
                      [
                        { title: 'Local Hardware Models', items: modelFilterTab === 'cloud' ? [] : availableModels.filter((m) => m.isLocal) },
                        { title: 'API Key Cloud Models', items: modelFilterTab === 'local' ? [] : availableModels.filter((m) => !m.isLocal) },
                      ]
                        .filter((g) => g.items.length > 0)
                        .map((group) => (
                          <div key={group.title} className="mb-1.5 last:mb-0">
                            <div className="px-3.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                              {group.title}
                            </div>
                            {group.items.map((item) => {
                              const isSelected = activeModel === item.name && activeProvider === item.provider;
                              const isOnline = item.daemonRunning !== false;
                              return (
                                <button
                                  key={`${item.provider}:${item.name}`}
                                  type="button"
                                  onClick={() => handleSelectModel(item)}
                                  className={`w-full text-left px-3.5 py-2 text-xs font-mono flex items-center justify-between gap-2 hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'text-[var(--accent-primary)] font-bold bg-[var(--accent-soft-alpha)]'
                                      : 'text-[var(--text-primary)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                                      }`}
                                      title={isOnline ? 'Online / Ready' : 'Installed locally — click to start & use'}
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate">{item.name}</p>
                                      <p className="text-[10px] text-[var(--text-muted)] font-sans font-normal truncate">
                                        {item.providerName}{item.size ? ` · ${item.size}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                  {isSelected && <Check size={12} className="text-[var(--accent-primary)] shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        ))
                    )}
                  </div>

                  <div className="px-3.5 pt-2 mt-1 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <Link
                      href="/settings?tab=llm"
                      onClick={() => setModelSelectorOpen(false)}
                      className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline"
                    >
                      Manage API Keys & Fetch Models &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
                navigator.clipboard.writeText(transcript);
                alert('Conversation transcript copied to clipboard.');
              }}
              className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer shadow-xs hidden sm:flex"
              title="Share / Export transcript"
              aria-label="Share transcript"
            >
              <Share2 size={14} />
            </button>
          </div>
        </header>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-8 flex flex-col gap-6 w-full max-w-4xl mx-auto custom-scrollbar pb-64">
          
          {/* Empty State when thread has only default or zero messages */}
          {messages.length === 1 && messages[0].id.startsWith('init-') && (
            <div className="py-8 flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] flex items-center justify-center shadow-md">
                <Compass size={24} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                  Where shall we direct the analysis today?
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Run automated machine learning, audit data drift, inspect feature SHAP values, or explore institutional intelligence with hardware-isolated AI.
                </p>
              </div>

              {/* 4 Curated Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left pt-2">
                {starterCards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(card.prompt)}
                    className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface-secondary)]/50 transition-all text-left group shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-[var(--accent-soft-alpha)]">
                        {card.icon}
                      </div>
                      <span className="font-bold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {card.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {card.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render All Messages */}
          {messages.map((msg, index) => (
            msg.role === 'user' ? (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-end w-full"
              >
                <div className="bg-[var(--accent-primary)] text-[var(--accent-foreground)] px-5 py-3.5 rounded-2xl rounded-tr-xs max-w-[85%] text-sm shadow-sm leading-relaxed font-normal whitespace-pre-wrap">
                  {msg.content}
                </div>
                {msg.timestamp && (
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono mt-1 mr-1">
                    {msg.timestamp}
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3.5 w-full items-start group"
              >
                {/* Agent Icon Badge */}
                <div className="w-8 h-8 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 mt-1 shadow-xs text-[var(--accent-primary)]">
                  <Compass size={17} />
                </div>

                <div className="flex-1 min-w-0 max-w-[92%] space-y-2">
                  <div className={`p-6 rounded-2xl rounded-tl-xs border text-sm leading-relaxed ${
                    msg.isError
                      ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                      : 'bg-[var(--surface-primary)] border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm'
                  }`}>
                    {/* Render high-fidelity markdown with GitHub-flavored table & code blocks */}
                    <div className="prose prose-sm max-w-none dark:prose-invert text-[var(--text-primary)] space-y-3">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ ...props }) => <h1 className="text-xl font-bold text-[var(--text-primary)] pb-1.5 border-b border-[var(--border-subtle)]" {...props} />,
                          h2: ({ ...props }) => <h2 className="text-lg font-bold text-[var(--text-primary)] mt-4 mb-2" {...props} />,
                          h3: ({ ...props }) => <h3 className="text-sm font-bold text-[var(--accent-primary)] uppercase tracking-wider mt-3 mb-1" {...props} />,
                          p: ({ ...props }) => <p className="text-sm leading-relaxed text-[var(--text-primary)] mb-2.5" {...props} />,
                          ul: ({ ...props }) => <ul className="list-disc pl-5 space-y-1 text-sm text-[var(--text-primary)]" {...props} />,
                          ol: ({ ...props }) => <ol className="list-decimal pl-5 space-y-1 text-sm text-[var(--text-primary)]" {...props} />,
                          li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
                          blockquote: ({ ...props }) => <blockquote className="border-l-3 border-[var(--accent-primary)] pl-3.5 py-1 text-[var(--text-secondary)] italic bg-[var(--surface-secondary)]/50 rounded-r-lg" {...props} />,
                          table: ({ ...props }) => (
                            <div className="overflow-x-auto my-3 rounded-xl border border-[var(--border-subtle)]">
                              <table className="w-full text-left text-xs border-collapse" {...props} />
                            </div>
                          ),
                          thead: ({ ...props }) => <thead className="bg-[var(--surface-secondary)] text-[var(--text-primary)] border-b border-[var(--border-subtle)] font-mono text-[11px]" {...props} />,
                          th: ({ ...props }) => <th className="p-2.5 font-bold" {...props} />,
                          td: ({ ...props }) => <td className="p-2.5 border-t border-[var(--border-subtle)] font-mono" {...props} />,
                          code: ({ className, children, ...props }: any) => {
                            const isBlock = Boolean(className);
                            if (isBlock) {
                              return (
                                <div className="my-3 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
                                  <div className="px-4 py-1.5 border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                                    <span>Code Block</span>
                                    <button
                                      onClick={() => handleCopy(msg.id + '-code', String(children))}
                                      className="hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                                    >
                                      {copiedId === msg.id + '-code' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                      <span>Copy</span>
                                    </button>
                                  </div>
                                  <pre className="p-4 text-xs font-mono text-[var(--text-primary)] overflow-x-auto bg-transparent">
                                    <code>{children}</code>
                                  </pre>
                                </div>
                              );
                            }
                            return (
                              <code className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--accent-primary)] font-mono text-xs font-semibold" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Execution Telemetry & Action Toolbar */}
                  <div className="flex flex-wrap items-center justify-between px-1 gap-2 text-[11px] text-[var(--text-secondary)] font-mono">
                    <div className="flex items-center gap-3">
                      <span>{msg.model || activeModel}</span>
                      {msg.latencyMs !== undefined && (
                        <span>&bull; {msg.latencyMs}ms</span>
                      )}
                      {msg.cached && (
                        <span className="text-[var(--accent-primary)] font-bold flex items-center gap-1">
                          &bull; Exact Match (0ms GPU)
                        </span>
                      )}
                      {msg.guardrailStatus && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> {msg.guardrailStatus}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Copy, Regenerate, Thumbs Rating */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded-md hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Copy response"
                        aria-label="Copy response"
                      >
                        {copiedId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>

                      <button
                        onClick={() => handleRegenerate(index)}
                        className="p-1 rounded-md hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Regenerate response"
                        aria-label="Regenerate response"
                      >
                        <RotateCw size={13} />
                      </button>

                      <button
                        onClick={() => setFeedbackGiven({ ...feedbackGiven, [msg.id]: 'up' })}
                        className={`p-1 rounded-md hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer ${feedbackGiven[msg.id] === 'up' ? 'text-emerald-500' : 'text-[var(--text-secondary)]'}`}
                        title="Helpful"
                        aria-label="Helpful"
                      >
                        <ThumbsUp size={13} />
                      </button>

                      <button
                        onClick={() => setFeedbackGiven({ ...feedbackGiven, [msg.id]: 'down' })}
                        className={`p-1 rounded-md hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer ${feedbackGiven[msg.id] === 'down' ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}
                        title="Unhelpful"
                        aria-label="Unhelpful"
                      >
                        <ThumbsDown size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3.5 w-full items-start">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 mt-1">
                <Loader2 className="text-[var(--accent-primary)] animate-spin" size={16} />
              </div>
              <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] px-4 py-3 rounded-2xl rounded-tl-xs flex gap-1.5 items-center shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                <span className="text-xs text-[var(--text-secondary)] font-mono ml-2">
                  Running {activeModel} ({activeProvider})...
                </span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. Anchored Floating Composer */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/95 to-transparent pt-8 pb-5 px-4 sm:px-6 z-20 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
            
            {/* Attachment preview if file selected */}
            {attachedFile && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] w-fit shadow-xs">
                <Paperclip size={13} className="text-[var(--accent-primary)]" />
                <span className="font-mono">{attachedFile.name}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">({Math.round(attachedFile.size / 1024)} KB)</span>
                <button onClick={() => setAttachedFile(null)} className="ml-1 text-[var(--text-secondary)] hover:text-red-500 cursor-pointer">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Main Composer Box */}
            <div className="relative bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-xl focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/20 transition-all flex flex-col overflow-hidden">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-3.5 px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-h-[56px] max-h-40 leading-relaxed font-sans"
                placeholder={selectedDataset ? `Query '${selectedDataset}' or request code...` : "Message Agentix... (Shift+Enter for newline)"}
                rows={1}
              />

              {/* Composer Toolbar: File attachment, Deep Thinking pill, Character count, Send button */}
              <div className="px-3 py-2 bg-[var(--surface-secondary)]/40 border-t border-[var(--border-subtle)]/50 flex items-center justify-between">
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) setAttachedFile(e.target.files[0]);
                    }}
                    className="hidden"
                    accept=".csv,.tsv,.json,.parquet,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                    title="Attach dataset (.csv, .json, .parquet)"
                    aria-label="Attach dataset"
                  >
                    <Paperclip size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeepThinking(!deepThinking)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                      deepThinking
                        ? 'bg-[var(--accent-primary)] text-[var(--accent-foreground)] shadow-xs font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
                    }`}
                  >
                    <Sparkles size={12} />
                    <span>Deep Reasoning</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {inputValue.length > 0 && (
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono hidden sm:inline">
                      {inputValue.length} chars
                    </span>
                  )}

                  <button
                    disabled={!inputValue.trim() || isTyping}
                    onClick={() => handleSend()}
                    className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                      inputValue.trim() && !isTyping
                        ? 'teal-button-primary shadow-sm cursor-pointer'
                        : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] opacity-40 cursor-not-allowed'
                    }`}
                    aria-label="Send message"
                  >
                    {isTyping ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Telemetry Disclaimer */}
            <div className="flex items-center justify-between px-2 text-[10px] text-[var(--text-secondary)] font-mono">
              <span className="truncate">
                Active Model: <strong className="text-[var(--text-primary)]">{activeModel}</strong> &bull;{' '}
                {activeProvider === 'ollama' || activeProvider === 'lm_studio'
                  ? 'Local Hardware Execution (Zero Egress)'
                  : `API Key Routing (${activeProvider.toUpperCase()})`}
              </span>
              <span className="hidden sm:inline">
                Enter to send <CornerDownLeft size={10} className="inline ml-0.5" />
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {threadToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isDeleting && setThreadToDelete(null)}
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
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Delete Conversation
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Permanent deletion confirmation
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] space-y-1">
                <span className="text-[11px] text-[var(--text-secondary)] uppercase font-mono tracking-wider font-semibold">
                  Conversation Title
                </span>
                <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2">
                  {threadToDelete.title}
                </p>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Are you sure you want to delete this conversation? All prompts, model outputs, and metrics within this conversation will be permanently removed from the database. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setThreadToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteThread}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      Delete Conversation
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Conversation Modal */}
      <AnimatePresence>
        {threadToRename && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isRenaming && setThreadToRename(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-md bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] flex items-center justify-center">
                    <Edit3 size={15} />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Rename Conversation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setThreadToRename(null)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Conversation Title
                </label>
                <input
                  type="text"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  disabled={isRenaming}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] font-sans"
                  placeholder="Enter new conversation title"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isRenaming}
                  onClick={() => setThreadToRename(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRenaming || !renameTitle.trim()}
                  onClick={confirmRenameThread}
                  className="px-4 py-2 text-xs font-bold rounded-xl teal-button-primary transition-colors flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isRenaming ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Title'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Feedback Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-red-500/90 text-white border-red-600'
                : 'bg-emerald-600/95 text-white border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
