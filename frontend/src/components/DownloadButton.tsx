'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, Terminal, ExternalLink } from 'lucide-react';
import AppleLogo from '@/components/AppleLogo';
import WindowsLogo from '@/components/WindowsLogo';

interface PlatformOption {
  id: string;
  name: string;
  arch: string;
  format: string;
  href: string;
  downloadName: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PLATFORMS: PlatformOption[] = [
  {
    id: 'mac-arm',
    name: 'macOS Apple Silicon',
    arch: 'M1 / M2 / M3 / M4 (ARM64)',
    format: '.dmg',
    href: '/download/mac?arch=arm64',
    downloadName: 'Agentix-1.0.0-arm64.dmg',
    icon: AppleLogo,
  },
  {
    id: 'mac-intel',
    name: 'macOS Intel',
    arch: 'Intel Core (x86_64)',
    format: '.dmg',
    href: '/download/mac?arch=x64',
    downloadName: 'Agentix-1.0.0-x64.dmg',
    icon: AppleLogo,
  },
  {
    id: 'win-x64',
    name: 'Windows x64',
    arch: 'Windows 10 / 11 (64-bit)',
    format: '.msi',
    href: '/download/windows',
    downloadName: 'Agentix-1.0.0-x64.msi',
    icon: WindowsLogo,
  },
  {
    id: 'connector-py',
    name: 'Universal Local AI Connector',
    arch: 'macOS, Windows & Linux',
    format: '.py',
    href: '/download/connector',
    downloadName: 'agentix_connector.py',
    icon: Terminal,
  },
];

export default function DownloadButton({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformOption>(PLATFORMS[0]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('win')) {
        setSelectedPlatform(PLATFORMS[2]); // Windows default
      } else if (ua.includes('mac')) {
        setSelectedPlatform(PLATFORMS[0]); // macOS Apple Silicon default
      }
    }
  }, []);

  const Icon = selectedPlatform.icon;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Primary Split Button */}
      <div className="inline-flex rounded-xl shadow-sm border border-stone-800 bg-stone-900 text-white overflow-hidden">
        <a
          href={selectedPlatform.href}
          download={selectedPlatform.downloadName}
          className="inline-flex items-center gap-2.5 px-5 py-3 text-sm font-semibold hover:bg-stone-800 transition"
          title={`Download ${selectedPlatform.downloadName}`}
        >
          <Icon className="w-4 h-4 text-white" />
          <span>Download for {selectedPlatform.name.split(' ')[0]}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono">
            {selectedPlatform.format}
          </span>
        </a>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 border-l border-stone-800 hover:bg-stone-800 transition flex items-center justify-center"
          title="Choose another platform architecture"
          aria-expanded={isOpen}
          aria-label="Toggle download platform options"
        >
          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl z-50 p-2 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-800">
              Select Architecture (v1.0.0)
            </div>

            {PLATFORMS.map((platform) => {
              const ItemIcon = platform.icon;
              const isSelected = platform.id === selectedPlatform.id;
              return (
                <a
                  key={platform.id}
                  href={platform.href}
                  download={platform.downloadName}
                  onClick={() => {
                    setSelectedPlatform(platform);
                    setIsOpen(false);
                  }}
                  className={`flex items-start gap-3 p-2.5 rounded-xl text-left transition ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <ItemIcon className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-stone-600 dark:text-stone-300'}`} />
                  <div className="flex-1">
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span>{platform.name}</span>
                      <span className="font-mono text-[10px] opacity-75">{platform.format}</span>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">{platform.arch}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                </a>
              );
            })}

            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 px-3 py-1 flex items-center justify-between text-[11px] text-stone-500">
              <a
                href="/download/releases"
                target="_blank"
                rel="noreferrer"
                className="hover:text-stone-900 dark:hover:text-stone-200 inline-flex items-center gap-1 font-medium"
              >
                All GitHub Releases
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>SHA-256 Verified</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
