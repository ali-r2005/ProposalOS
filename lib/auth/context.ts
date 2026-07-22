import { EngineError } from '@/lib/utils/error-handler';
import { verifyAccessToken } from './session';
import type { TokenPayload } from './token';

export function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
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
