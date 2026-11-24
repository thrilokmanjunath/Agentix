'use client';

export interface DesktopInfo {
  port: number;
  token: string;
  data_dir: string;
  pid: number;
  is_ready: boolean;
  platform: string;
  version: string;
}

let cachedDesktopInfo: DesktopInfo | null = null;
let probePromise: Promise<DesktopInfo | null> | null = null;

/**
 * Returns true if the frontend is currently running inside the Tauri native desktop webview.
 */
export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__
  );
}

/**
 * Resolves desktop sidecar runtime information (port, session token, data directory).
 */
export async function getDesktopInfo(): Promise<DesktopInfo | null> {
  if (!isDesktopApp()) return null;
  if (cachedDesktopInfo && cachedDesktopInfo.is_ready) return cachedDesktopInfo;

  if (probePromise) return probePromise;

  probePromise = (async () => {
    try {
      // Dynamic import to avoid SSR errors in Next.js
      const { invoke } = await import('@tauri-apps/api/core');
      const info = await invoke<DesktopInfo>('get_desktop_info');
      if (info && info.port > 0) {
        cachedDesktopInfo = info;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('agentix_desktop_port', String(info.port));
          sessionStorage.setItem('agentix_desktop_token', info.token);
        }
      }
      return info;
    } catch {
      // If invoke is unavailable or still starting up, fallback to session storage
      if (typeof window !== 'undefined') {
        const storedPort = sessionStorage.getItem('agentix_desktop_port');
        const storedToken = sessionStorage.getItem('agentix_desktop_token');
        if (storedPort && storedToken) {
          return {
            port: parseInt(storedPort, 10),
            token: storedToken,
            data_dir: '',
            pid: 0,
            is_ready: true,
            platform: 'desktop',
            version: '1.0.0',
          };
        }
      }
      return null;
    } finally {
      probePromise = null;
    }
  })();

  return probePromise;
}

/**
 * Returns the authorization headers required to communicate with the desktop sidecar.
 */
export async function getDesktopHeaders(): Promise<Record<string, string>> {
  const info = await getDesktopInfo();
  if (info && info.token) {
    return { 'X-Agentix-Token': info.token };
  }
  return {};
}

/**
 * Opens the application data directory in Finder (macOS) or File Explorer (Windows).
 */
export async function openDesktopDataFolder(): Promise<void> {
  if (!isDesktopApp()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_data_folder');
  } catch (err) {
    console.error('Failed to open data folder via Tauri IPC:', err);
  }
}
