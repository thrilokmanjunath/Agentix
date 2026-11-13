import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { signBackendJwt } from '@/lib/backendJwt';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Prioritize authentic backend token issued by FastAPI
  const directBackendToken = (session as any)?.backendAccessToken;
  if (directBackendToken && typeof directBackendToken === 'string') {
    return NextResponse.json(
      { token: directBackendToken, expiresIn: 3600 },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  // 2. Cryptographic JWT signing fallback
  try {
    const token = signBackendJwt({
      sub: session.user.id,
      email: session.user.email,
      role: ((session.user as { role?: string }).role || 'USER').toLowerCase(),
      tenant_id: 'default',
    });

    return NextResponse.json(
      { token, expiresIn: 3600 },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    console.error('[AuthToken] Failed to sign backend JWT:', err);
    return NextResponse.json(
      { error: 'Backend authentication is not configured' },
      { status: 500 }
    );
  }
}
