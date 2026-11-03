"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trash2,
  Send,
  Loader2,
  Bot,
  Copy,
  Check,
  Cpu,
  ChevronDown,
  Lock
} from 'lucide-react';
import { usePlatformStore } from '@/store/platformStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type Message = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  isError?: boolean;
  model?: string;
  timestamp?: string;
};

export default function AgentConsolePage() {
  const selectedDataset = usePlatformStore(state => state.datasetName);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>(['researcher-m4:latest', 'qwen2.5:3b']);
  const [activeModel, setActiveModel] = useState<string>('researcher-m4:latest');
  const [isModelSelectorOpen, setModelSelectorOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Query detected local models
    const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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

    if (!selectedDataset) {
      setMessages([{
        id: 'no-dataset',
        role: 'agent',
        content: "Welcome to the Agentix AI Intelligence Console. Select or ingest a dataset in Data Dock to ground my analysis in verified pipeline statistics.",
        model: 'Ollama: researcher-m4',
        timestamp: new Date().toLocaleTimeString()
      }]);
    } else {
      setMessages([{
        id: 'ready',
        role: 'agent',
        content: `Ready to analyze dataset '${selectedDataset}'. You may query Exploratory Data Analysis distributions, feature drivers, or model evaluation metrics.`,
        model: 'Ollama: researcher-m4',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  }, [selectedDataset]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim()) return;

    if (!selectedDataset) {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'user', content: textToSend.trim(), timestamp: new Date().toLocaleTimeString() },
        { id: Date.now().toString() + '-err', role: 'agent', content: "An active dataset is required to provide grounded analysis without hallucinations. Please ingest or select a dataset first.", isError: true, timestamp: new Date().toLocaleTimeString() }
      ]);
      setInputValue('');
      return;
    }

    const query = textToSend.trim();
    setInputValue('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: query, timestamp: new Date().toLocaleTimeString() }]);
    setIsTyping(true);

    try {
      const response = await usePlatformStore.getState().chat(query);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'agent',
          content: response,
          model: `Ollama: ${activeModel}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'agent',
          content: error.message || "The local inference engine was unable to process your request.",
          isError: true,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedPrompts = [
    "What are the top predictive features?",
    "Summarize the EDA skewness and outliers.",
    "Explain the chosen evaluation score.",
    "What data cleaning actions were applied?",
    "Give an executive summary of model accuracy."
  ];

  return (
    <div className="flex flex-col w-full h-[calc(100vh-64px)] relative bg-[var(--background)] text-[var(--text-primary)] font-sans transition-colors duration-200">
      
      {/* Top Console Action Bar */}
      <div className="shrink-0 px-6 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] flex items-center justify-center shadow-sm">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-[var(--text-primary)] tracking-tight">AI Analyst Workspace</h2>
              <Badge variant="teal" size="sm">
                <Lock size={9} />
                Private Hardware
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                Grounding: {selectedDataset ? <strong className="text-[var(--accent-primary)] font-semibold">{selectedDataset}</strong> : 'No dataset loaded'}
              </span>
            </div>
          </div>
        </div>

        {/* Model Selection & Action Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <button
              onClick={() => setModelSelectorOpen(!isModelSelectorOpen)}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] hover:border-[var(--accent-primary)] text-xs font-mono text-[var(--accent-primary)] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Cpu size={13} className="text-[var(--accent-primary)]" />
              <span>{activeModel}</span>
              <ChevronDown size={12} className="text-[var(--text-secondary)]" />
            </button>

            {isModelSelectorOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-xl py-1.5 z-50">
                <div className="px-3 py-1 border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--text-secondary)]">
                  Detected Local Models
                </div>
                {availableModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setActiveModel(m);
                      setModelSelectorOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${activeModel === m ? 'text-[var(--accent-primary)] font-bold bg-[var(--accent-soft-alpha)]' : 'text-[var(--text-primary)]'}`}
                  >
                    <span>{m}</span>
                    {activeModel === m && <Check size={12} className="text-[var(--accent-primary)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessages(selectedDataset ? [{ id: 'ready', role: 'agent', content: `Ready to answer questions about ${selectedDataset}.`, model: `Ollama: ${activeModel}`, timestamp: new Date().toLocaleTimeString() }] : [])}
            leftIcon={<Trash2 size={13} />}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 flex flex-col gap-6 w-full max-w-4xl mx-auto custom-scrollbar pb-52">
        {messages.map((msg) => (
          msg.role === 'user' ? (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end w-full">
              <div className="bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm shadow-sm leading-relaxed font-normal">
                {msg.content}
              </div>
              {msg.timestamp && (
                <span className="text-[10px] text-[var(--text-secondary)] font-mono mt-1 mr-1">{msg.timestamp}</span>
              )}
            </motion.div>
          ) : (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3.5 w-full items-start group">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm text-[var(--accent-primary)]">
                <Bot size={17} />
              </div>
              
              <div className="flex-1 max-w-[90%] space-y-2">
                <div className={`p-5 rounded-2xl rounded-tl-sm border text-sm leading-relaxed ${
                  msg.isError 
                    ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300' 
                    : 'bg-[var(--surface-primary)] border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                <div className="flex items-center justify-between px-1 text-[11px] text-[var(--text-secondary)] font-mono">
                  <div className="flex items-center gap-3">
                    <span>{msg.model || `Ollama: ${activeModel}`}</span>
                    {msg.timestamp && <span>{msg.timestamp}</span>}
                  </div>
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={11} className="text-emerald-500" />
                        <span className="text-[10px] text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        ))}

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3.5 w-full items-start">
            <div className="w-8 h-8 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Loader2 className="text-[var(--accent-primary)] animate-spin" size={17} />
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '0.15s' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '0.3s' }}></span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Teal Glass Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/90 to-transparent pt-10 pb-6 px-4 z-20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          
          {/* Quick Grounded Question Chips */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {suggestedPrompts.map((prompt, i) => (
              <button 
                key={i} 
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] text-[var(--text-secondary)] text-xs font-medium transition-all shadow-sm shrink-0 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Prompt Textarea */}
          <div className="relative bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-lg focus-within:border-[var(--accent-primary)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)]/30 transition-all flex items-end overflow-hidden">
            <textarea 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-3.5 pl-4 pr-16 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-h-[52px] max-h-36" 
              placeholder="Ask Agentix about pipeline metrics, features, or distributions..." 
              rows={1}
            />

            <div className="absolute right-2.5 bottom-2.5">
              <button 
                disabled={!inputValue.trim() || isTyping}
                className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                  inputValue.trim() && !isTyping 
                    ? 'teal-button-primary shadow-sm cursor-pointer' 
                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                }`} 
                onClick={() => handleSend()}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
          
          <div className="text-center">
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">
              Inference: Local Hardware &bull; Bidirectional Guardrail & PII Filter Active
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
