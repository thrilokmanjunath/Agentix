import { auth } from '@/auth';
import { signBackendJwt } from '@/lib/backendJwt';

/**
 * Resolves the FastAPI backend origin for Next.js server routes and config.
 * Falls back to http://127.0.0.1:8000 ONLY outside production.
 */
export function getServerBackendBase(): string {
  const configured = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (configured) {
    return configured.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:8000';
  }
  return '';
}

export async function getServerBackendAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return {};
    }
    const token = signBackendJwt({
      sub: session.user.id,
      email: session.user.email,
      role: ((session.user as { role?: string }).role || 'USER').toLowerCase(),
      tenant_id: 'default',
    });
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}
