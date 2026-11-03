"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={`w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 text-[var(--text-secondary)] flex items-center justify-center opacity-70 ${className}`}
        aria-label="Toggle theme"
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/70 hover:bg-[var(--surface-hover)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all flex items-center justify-center relative cursor-pointer shadow-sm ${className}`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light (Pearl Teal)" : "dark (Obsidian Teal)"} theme`}
    >
      {isDark ? (
        <Sun size={17} className="transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon size={17} className="transition-transform duration-200 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}
