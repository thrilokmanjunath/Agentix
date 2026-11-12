import crypto from 'node:crypto';

export interface BackendJwtPayload {
  sub: string;
  email: string;
  role: string;
  tenant_id?: string;
}

const DEFAULT_EXPIRY_SECONDS = 60 * 60; // 1 hour

function toBase64Url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getSigningSecret(): string {
  const secret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return 'super-secret-agentix-key-2026';
  }
  throw new Error('JWT_SECRET_KEY is not configured in production environment');
}

export function signBackendJwt(
  payload: BackendJwtPayload,
  expiresInSeconds: number = DEFAULT_EXPIRY_SECONDS
): string {
  const secret = getSigningSecret();
  const now = Math.floor(Date.now() / 1000);

  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(
    JSON.stringify({
      sub: payload.sub,
      email: payload.email,
      role: (payload.role || 'user').toLowerCase(),
      tenant_id: payload.tenant_id || 'default',
      iat: now,
      exp: now + expiresInSeconds,
    })
  );

  const signingInput = `${header}.${body}`;
  const signature = toBase64Url(
    crypto.createHmac('sha256', secret).update(signingInput).digest()
  );

  return `${signingInput}.${signature}`;
}
