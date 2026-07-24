import { EngineError } from '@/lib/utils/error-handler';
import { verifyAccessToken } from './session';
import type { TokenPayload } from './token';

function extractCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * The access token normally travels as an `Authorization: Bearer` header (set by
 * the axios client once logged in), but requests the browser issues itself —
 * `<iframe src>`, `<a href>`, "open in new tab" — never carry custom headers.
 * For those, fall back to the httpOnly `accessToken` cookie set alongside the
 * refresh cookie at login/refresh time.
 */
export function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return extractCookie(request, 'accessToken');
}

export function requireAuth(request: Request): TokenPayload {
  const token = extractTokenFromRequest(request);
  if (!token) {
    throw new EngineError('Unauthorized: missing token', 401);
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    throw new EngineError('Unauthorized: invalid token', 401);
  }

  return payload;
}

export function requireAdminRole(request: Request): TokenPayload {
  const payload = requireAuth(request);
  if (payload.role !== 'admin') {
    throw new EngineError('Forbidden: admin role required', 403);
  }
  return payload;
}
