"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { ALL_THEME_IDS, isDarkTheme } from "@/lib/themes";

function ThemeSync() {
  const { theme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    const active = theme === "system" ? resolvedTheme : theme || resolvedTheme;
    const dark = isDarkTheme(active);
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  }, [theme, resolvedTheme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      themes={ALL_THEME_IDS}
      defaultTheme="alabaster"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}
