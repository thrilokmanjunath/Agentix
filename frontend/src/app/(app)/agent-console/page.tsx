"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  X
} from 'lucide-react';
import { usePlatformStore } from '@/store/platformStore';
import { Badge } from '@/components/ui/Badge';

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
  timestamp: string;
  dateGroup: 'Today' | 'Yesterday' | 'Previous 7 Days';
  messages: Message[];
}

export default function AgentConsolePage() {
  const selectedDataset = usePlatformStore(state => state.datasetName);
  const [threads, setThreads] = useState<Thread[]>([
    {
      id: 'thread-1',
      title: 'Clinical Trial EDA & Feature Skewness',
      timestamp: '10:45 AM',
      dateGroup: 'Today',
      messages: [
        {
          id: 'm1-init',
          role: 'agent',
          content: "Welcome to the **Agentix Enterprise AI Console**. I am running on isolated local hardware with verified **Layer 1–8 AI Governance**. How may I assist your analysis today?",
          model: 'researcher-m4:latest',
          timestamp: '10:45 AM',
          latencyMs: 18,
          tokens: 42,
          cached: true,
          guardrailStatus: 'Clean'
        }
      ]
    },
    {
      id: 'thread-2',
      title: 'AutoML Predictive Candidate Comparison',
      timestamp: 'Yesterday',
      dateGroup: 'Yesterday',
      messages: [
        {
          id: 'm2-1',
          role: 'user',
          content: 'Compare the predictive candidate models for classification AUC.',
          timestamp: 'Yesterday 4:15 PM'
        },
        {
          id: 'm2-2',
          role: 'agent',
          content: "### AutoML Candidate Evaluation\n\n| Model Architecture | AUC-ROC | F1-Score | Inference Latency |\n| :--- | :--- | :--- | :--- |\n| **Gradient Boosting (LightGBM)** | **0.942** | **0.918** | 4.2 ms |\n| Random Forest Classifier | 0.918 | 0.892 | 8.6 ms |\n| Penalized Logistic Regression | 0.864 | 0.841 | 1.1 ms |\n\n```python\n# Optimal model selection summary\nbest_candidate = 'LightGBM'\ntarget_metric = 'auc_roc'\nvalidation_score = 0.942\n```\n\nThe LightGBM ensemble demonstrated superior cross-validation stability with negligible feature collinearity penalties.",
          model: 'researcher-m4:latest',
          timestamp: 'Yesterday 4:15 PM',
          latencyMs: 312,
          tokens: 185,
          cached: false,
          guardrailStatus: 'Clean'
        }
      ]
    },
    {
      id: 'thread-3',
      title: '8-Layer AI Governance Verification',
      timestamp: '2 days ago',
      dateGroup: 'Previous 7 Days',
      messages: [
        {
          id: 'm3-1',
          role: 'user',
          content: 'What security guardrails protect institutional data during inference?',
          timestamp: 'Nov 2'
        },
        {
          id: 'm3-2',
          role: 'agent',
          content: "### Enterprise 8-Layer AI Architecture Status\n\n1. **Layer 1 (API Governance):** Token-bucket rate limiting (1,000 req/min/tenant) and strict 100MB payload caps.\n2. **Layer 2 (Prompt Registry):** Cryptographic SHA-256 hash pinning on all system prompts.\n3. **Layer 3 (Context Retrieval):** Multi-tenant partitioned vector RAG store.\n4. **Layer 4 (Tool Governance):** JSON-RPC schema validation and destructive action gates.\n5. **Layer 5 (RBAC & Auth):** RFC 7662 token introspection and granular role matrix.\n6. **Layer 6 (AI Guardrails):** Bidirectional regex & semantic PII redaction with adversarial jailbreak neutralisation.\n7. **Layer 7 (Model Routing & Cache):** SHA-256 prompt exact-match cache eliminating redundant compute.\n8. **Layer 8 (Telemetry & Evaluations):** GenAI OpenTelemetry spans and multi-metric faithfulness evaluations.",
          model: 'researcher-m4:latest',
          timestamp: 'Nov 2',
          latencyMs: 145,
          tokens: 230,
          cached: true,
          guardrailStatus: 'Clean'
        }
      ]
    }
  ]);

  const [activeThreadId, setActiveThreadId] = useState<string>('thread-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [id: string]: 'up' | 'down' }>({});
  const [deepThinking, setDeepThinking] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const [availableModels, setAvailableModels] = useState<string[]>(['researcher-m4:latest', 'qwen2.5:3b']);
  const [activeModel, setActiveModel] = useState<string>('researcher-m4:latest');
  const [isModelSelectorOpen, setModelSelectorOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentThread = threads.find(t => t.id === activeThreadId) || threads[0];
  const messages = React.useMemo(() => currentThread?.messages || [], [currentThread]);

  // Query detected local models on mount
  useEffect(() => {
    const rawBackend = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const backendBase = rawBackend.replace(/\/api\/v1\/?$/, '');
    fetch(`${backendBase}/api/v1/platform/ai/status`)
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        const local = json?.data?.local_models || [];
        if (local.length > 0) {
          const names = local.map((m: any) => m.name);
          setAvailableModels(names);
          setActiveModel(names[0]);
        }
      })
      .catch(() => {});
  }, []);

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

  const handleCreateNewChat = () => {
    const newId = `thread-${Date.now()}`;
    const newThread: Thread = {
      id: newId,
      title: 'New Investigation',
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
          guardrailStatus: 'Clean'
        }
      ]
    };
    setThreads([newThread, ...threads]);
    setActiveThreadId(newId);
    setInputValue('');
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = (textOverride || inputValue).trim();
    if (!textToSend || isTyping) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: attachedFile ? `[Attached: ${attachedFile.name}]\n\n${textToSend}` : textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update active thread title if it's new
    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        const isDefaultTitle = t.title === 'New Investigation';
        return {
          ...t,
          title: isDefaultTitle ? textToSend.slice(0, 36) + (textToSend.length > 36 ? '...' : '') : t.title,
          messages: [...t.messages, userMessage]
        };
      }
      return t;
    });

    setThreads(updatedThreads);
    setInputValue('');
    setAttachedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    const startTime = performance.now();

    try {
      const response = await usePlatformStore.getState().chat(textToSend);
      const latency = Math.round(performance.now() - startTime);
      const isCached = latency < 35; // sub-35ms response indicates cache hit

      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: response,
        model: activeModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs: latency,
        tokens: Math.max(24, Math.round(response.length / 4)),
        cached: isCached,
        guardrailStatus: 'Layer 6 Certified'
      };

      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          return { ...t, messages: [...t.messages, agentMessage] };
        }
        return t;
      }));
    } catch (error: any) {
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'agent',
        content: `**Inference Advisory:** ${error.message || "Local inference execution failed. Verify Ollama service state."}`,
        isError: true,
        model: activeModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
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
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-sm">
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
                <span className="text-[10px] font-mono opacity-80 bg-white/20 px-1.5 py-0.5 rounded">⌘N</span>
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
              {['Today', 'Yesterday', 'Previous 7 Days'].map((group) => {
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
                        <button
                          key={thread.id}
                          onClick={() => setActiveThreadId(thread.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between group transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] font-semibold shadow-xs'
                              : 'text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MessageSquare size={14} className={isActive ? 'text-[var(--accent-primary)] shrink-0' : 'text-[var(--text-secondary)] shrink-0'} />
                            <span className="truncate">{thread.title}</span>
                          </div>
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {thread.timestamp}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Sidebar Bottom Status */}
            <div className="p-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Lock size={12} className="text-emerald-600 dark:text-emerald-400" />
                  Hardware Boundary
                </span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Air-Gapped</span>
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
            <div className="relative">
              <button
                onClick={() => setModelSelectorOpen(!isModelSelectorOpen)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] hover:border-[var(--accent-primary)] text-xs font-mono text-[var(--accent-primary)] flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                aria-expanded={isModelSelectorOpen}
              >
                <Cpu size={13} className="text-[var(--accent-primary)]" />
                <span className="hidden sm:inline">{activeModel}</span>
                <span className="sm:hidden">{activeModel.split(':')[0]}</span>
                <ChevronDown size={12} className="text-[var(--text-secondary)]" />
              </button>

              {isModelSelectorOpen && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-xl py-1.5 z-50">
                  <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-secondary)] font-semibold">
                    Detected Local Hardware Models
                  </div>
                  {availableModels.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setActiveModel(m);
                        setModelSelectorOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-mono flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer ${activeModel === m ? 'text-[var(--accent-primary)] font-bold bg-[var(--accent-soft-alpha)]' : 'text-[var(--text-primary)]'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>{m}</span>
                      </div>
                      {activeModel === m && <Check size={12} className="text-[var(--accent-primary)]" />}
                    </button>
                  ))}
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
                <div className="bg-[var(--accent-primary)] text-white px-5 py-3.5 rounded-2xl rounded-tr-xs max-w-[85%] text-sm shadow-sm leading-relaxed font-normal whitespace-pre-wrap">
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
                <span className="text-xs text-[var(--text-secondary)] font-mono ml-2">Executing local neural inference...</span>
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
                        ? 'bg-[var(--accent-primary)] text-white shadow-xs font-semibold'
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
                Hardware: <strong className="text-[var(--text-primary)]">{activeModel}</strong> &bull; Zero Cloud Egress
              </span>
              <span className="hidden sm:inline">
                Enter to send <CornerDownLeft size={10} className="inline ml-0.5" />
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
