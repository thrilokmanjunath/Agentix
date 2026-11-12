export type ThemeId =
  | "light"
  | "alabaster"
  | "nordic"
  | "dark"
  | "carbon"
  | "midnight";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  subtitle: string;
  mode: "light" | "dark";
  category: string;
  description: string;
  preview: {
    background: string;
    surface: string;
    secondary: string;
    border: string;
    text: string;
    muted: string;
    accent: string;
    accentForeground: string;
  };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "alabaster",
    name: "Warm Alabaster",
    subtitle: "Default Editorial Minimal",
    mode: "light",
    category: "Signature Default",
    description: "Refined architectural alabaster limestone canvas with warm ivory panels and muted sage accents.",
    preview: {
      background: "#F7F5EF",
      surface: "#FFFEFA",
      secondary: "#F0EEE7",
      border: "#E5E1D7",
      text: "#292820",
      muted: "#777468",
      accent: "#777F69",
      accentForeground: "#FFFEFA",
    },
  },
  {
    id: "carbon",
    name: "Carbon Onyx",
    subtitle: "Pure Monochrome Dark",
    mode: "dark",
    category: "Signature Dark",
    description: "Zero-distraction matte OLED carbon with crisp neutral zinc elevation and platinum accents.",
    preview: {
      background: "#09090B",
      surface: "#121215",
      secondary: "#1B1B20",
      border: "#27272A",
      text: "#FAFAFA",
      muted: "#A1A1AA",
      accent: "#F4F4F5",
      accentForeground: "#09090B",
    },
  },
  {
    id: "light",
    name: "Pearl Teal",
    subtitle: "Glass Accent",
    mode: "light",
    category: "Alternative Light",
    description: "Crisp pearl canvas with elevated glass panels and understated oceanic teal accents.",
    preview: {
      background: "#F5FAF9",
      surface: "#FFFFFF",
      secondary: "#EAF5F2",
      border: "#DCEAE7",
      text: "#123B3B",
      muted: "#527C7A",
      accent: "#168B83",
      accentForeground: "#FFFFFF",
    },
  },
  {
    id: "nordic",
    name: "Nordic Frost",
    subtitle: "Swiss Cool Minimal",
    mode: "light",
    category: "Alternative Light",
    description: "Clinical porcelain surfaces with hairline slate borders and restrained cobalt accents.",
    preview: {
      background: "#F8FAFC",
      surface: "#FFFFFF",
      secondary: "#F1F5F9",
      border: "#E2E8F0",
      text: "#0F172A",
      muted: "#475569",
      accent: "#2563EB",
      accentForeground: "#FFFFFF",
    },
  },
  {
    id: "dark",
    name: "Obsidian Teal",
    subtitle: "Signature Dark Glass",
    mode: "dark",
    category: "Alternative Dark",
    description: "Deep abyssal obsidian canvas with frosted dark teal surfaces and luminous aqua highlights.",
    preview: {
      background: "#091B1F",
      surface: "#10282D",
      secondary: "#163238",
      border: "#29494E",
      text: "#F0FFFB",
      muted: "#9CC2BD",
      accent: "#36B5A7",
      accentForeground: "#041B1E",
    },
  },
  {
    id: "carbon",
    name: "Carbon Onyx",
    subtitle: "Pure Monochrome",
    mode: "dark",
    category: "Minimal",
    description: "Zero-distraction matte OLED carbon with crisp neutral zinc elevation and platinum accents.",
    preview: {
      background: "#09090B",
      surface: "#121215",
      secondary: "#1B1B20",
      border: "#27272A",
      text: "#FAFAFA",
      muted: "#A1A1AA",
      accent: "#F4F4F5",
      accentForeground: "#09090B",
    },
  },
  {
    id: "midnight",
    name: "Midnight Slate",
    subtitle: "Architectural Sapphire",
    mode: "dark",
    category: "Executive",
    description: "Deep indigo-charcoal canvas crafted for extended telemetry review and high-contrast precision.",
    preview: {
      background: "#0B101B",
      surface: "#121927",
      secondary: "#1A2336",
      border: "#253149",
      text: "#F8FAFC",
      muted: "#94A3B8",
      accent: "#60A5FA",
      accentForeground: "#081326",
    },
  },
];

export const ALL_THEME_IDS: string[] = THEME_OPTIONS.map((t) => t.id);

export const DARK_THEME_IDS = new Set<string>(
  THEME_OPTIONS.filter((t) => t.mode === "dark").map((t) => t.id)
);

export function isDarkTheme(themeId?: string | null): boolean {
  if (!themeId) return false;
  return DARK_THEME_IDS.has(themeId);
}

export function getThemeOption(themeId?: string | null): ThemeOption {
  return THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0];
}
