import crypto from 'node:crypto';

const KEY_LENGTH = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !password) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, hexDigest] = parts;
  if (!salt || !hexDigest) return false;
  try {
    const expected = Buffer.from(hexDigest, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length, SCRYPT_PARAMS);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
