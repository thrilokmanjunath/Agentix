'use client';

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;
let inFlightTokenPromise: Promise<string | null> | null = null;

/**
 * Resolves the FastAPI backend origin for browser-side calls.
 * - Uses NEXT_PUBLIC_API_URL when configured.
 * - On non-local hosts, defaults to same-origin ('') so Next.js rewrites (/api/v1/*) handle proxying.
 * - On localhost/127.0.0.1 without NEXT_PUBLIC_API_URL, defaults to local dev port 8000.
 */
export function getClientBackendBase(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (configured) {
    return configured.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
  }
  return '';
}

export function clearBackendAuthToken(): void {
  cachedToken = null;
  cachedTokenExpiresAt = 0;
  inFlightTokenPromise = null;
}

export async function getBackendAuthToken(forceRefresh = false): Promise<string | null> {
  const now = Date.now();
  if (!forceRefresh && cachedToken && now < cachedTokenExpiresAt - 30_000) {
    return cachedToken;
  }

  if (!forceRefresh && inFlightTokenPromise) {
    return inFlightTokenPromise;
  }

  inFlightTokenPromise = (async () => {
    try {
      const res = await fetch('/api/auth/token', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!res.ok) {
        cachedToken = null;
        cachedTokenExpiresAt = 0;
        return null;
      }
      const data = await res.json();
      if (data?.token) {
        cachedToken = String(data.token);
        const ttlSec = typeof data.expiresIn === 'number' ? data.expiresIn : 3600;
        cachedTokenExpiresAt = Date.now() + ttlSec * 1000;
        return cachedToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      inFlightTokenPromise = null;
    }
  })();

  return inFlightTokenPromise;
}

export async function getBackendAuthHeaders(
  extraHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
  const token = await getBackendAuthToken();
  if (token) {
    return {
      ...extraHeaders,
      Authorization: `Bearer ${token}`,
    };
  }
  return { ...extraHeaders };
}

export async function backendFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const base = getClientBackendBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

  const token = await getBackendAuthToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });
  if (res.status === 401 && token) {
    // Retry once with a fresh token in case session/token rotated
    const refreshed = await getBackendAuthToken(true);
    if (refreshed && refreshed !== token) {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set('Authorization', `Bearer ${refreshed}`);
      return fetch(url, { ...init, headers: retryHeaders });
    }
  }
  return res;
}
