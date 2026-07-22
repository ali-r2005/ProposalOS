import { createHmac } from 'crypto';

export interface TokenPayload {
  userId: string;
  role: string;
  expiresAt: number;
}

export function encodeToken(payload: TokenPayload, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function decodeToken(token: string, secret: string): TokenPayload | null {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;

    const expectedSig = createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
