"use client";

import * as React from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { THEME_OPTIONS, getThemeOption, isDarkTheme } from "@/lib/themes";

const PAIRED_MODES: Record<string, string> = {
  light: "dark",
  dark: "light",
  alabaster: "carbon",
  carbon: "alabaster",
  nordic: "midnight",
  midnight: "nordic",
};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 px-2.5 opacity-70 ${className}`}
      >
        <span className="w-4 h-4" />
      </div>
    );
  }

  const effectiveId = theme === "system" ? resolvedTheme || "light" : theme || resolvedTheme || "light";
  const currentOption = getThemeOption(effectiveId);
  const isDark = isDarkTheme(effectiveId);
  const nextPairedTheme = PAIRED_MODES[effectiveId] || (isDark ? "light" : "dark");

  const lightThemes = THEME_OPTIONS.filter((t) => t.mode === "light");
  const darkThemes = THEME_OPTIONS.filter((t) => t.mode === "dark");

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      <div className="inline-flex items-center h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/70 shadow-sm overflow-hidden">
        {/* Quick Light/Dark Mode Toggle */}
        <button
          type="button"
          onClick={() => setTheme(nextPairedTheme)}
          className="h-full px-2.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center justify-center cursor-pointer border-r border-[var(--border-subtle)]"
          aria-label="Toggle theme"
          title={`Quick switch to ${getThemeOption(nextPairedTheme).name}`}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Multi-Theme Selector Dropdown Trigger */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="h-full px-2.5 hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-colors flex items-center gap-2 cursor-pointer"
          aria-label="Select appearance theme"
          aria-expanded={open}
          title={`Current theme: ${currentOption.name}${theme === "system" ? " (System)" : ""}`}
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-[var(--border-strong)] shrink-0 shadow-xs"
            style={{
              background: `linear-gradient(135deg, ${currentOption.preview.background} 50%, ${currentOption.preview.accent} 50%)`,
            }}
          />
          <span className="hidden xl:inline text-xs font-medium tracking-tight truncate max-w-[110px]">
            {currentOption.name}
          </span>
          <ChevronDown
            size={12}
            className={`text-[var(--text-secondary)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Popover Theme Picker */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-11 w-72 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-2xl p-2.5 z-50 text-left"
          >
            {/* Header + System toggle */}
            <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-[var(--border-subtle)]">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Theme Palette
              </span>
              <button
                type="button"
                onClick={() => {
                  setTheme("system");
                  setOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  theme === "system"
                    ? "bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Monitor size={11} />
                System
              </button>
            </div>

            {[
              { label: "Minimalist Light", items: lightThemes },
              { label: "Minimalist Dark", items: darkThemes },
            ].map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((option) => {
                    const isActive = theme !== "system" ? theme === option.id : effectiveId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setTheme(option.id);
                          setOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          isActive
                            ? "bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30"
                            : "hover:bg-[var(--surface-secondary)] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 shadow-xs"
                            style={{
                              backgroundColor: option.preview.background,
                              borderColor: option.preview.border,
                            }}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: option.preview.accent }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {option.name}
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)] truncate">
                              {option.subtitle}
                            </p>
                          </div>
                        </div>
                        {isActive && <Check size={14} className="text-[var(--accent-primary)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
