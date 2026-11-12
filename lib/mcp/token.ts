import { decodeToken, encodeToken } from "@/lib/auth/token";
import { getUserById, refreshAccessToken, verifyAccessToken, type AuthUser } from "@/lib/auth/session";
import { EngineError } from "@/lib/utils/error-handler";

/**
 * Access tokens for the MCP endpoint: both the personal tokens from Settings
 * (90 days) and the short ones issued by the OAuth flow (lib/mcp/oauth.ts).
 *
 * Same HMAC token format as the app's access tokens, but signed with a
 * separate secret and a long lifetime, so:
 * - an app access token can never be used as an MCP token (and vice versa);
 * - rotating MCP_TOKEN_SECRET revokes every MCP token at once without logging
 *   anyone out of the app.
 * There is deliberately no fallback secret: without MCP_TOKEN_SECRET the MCP
 * endpoint is off.
 */
export const MCP_TOKEN_TTL_DAYS = 90;

function secret(): string {
  const value = process.env.MCP_TOKEN_SECRET;
  if (!value) {
    throw new EngineError("MCP is not configured on this server (MCP_TOKEN_SECRET is missing)", 503);
  }
  return value;
}

/** Issue an MCP access token. Personal tokens last 90 days; OAuth passes a short `ttlSeconds`. */
export function issueMcpToken(
  userId: string,
  role: string,
  ttlSeconds = MCP_TOKEN_TTL_DAYS * 24 * 60 * 60
): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { token: encodeToken({ userId, role, expiresAt }, secret()), expiresAt };
}

/**
 * The user logged in to the app in this browser, from the httpOnly refresh
 * cookie (same check as /api/auth/refresh). Used by the OAuth consent page,
 * which is opened in the browser, outside the app's axios client.
 */
export async function userFromRefreshCookie(refreshToken: string | undefined): Promise<AuthUser | null> {
  if (!refreshToken) return null;
  const access = await refreshAccessToken(refreshToken);
  const payload = access ? verifyAccessToken(access) : null;
  return payload ? getUserById(payload.userId) : null;
}

/**
 * Verify a bearer token and return the user it belongs to. The user is re-read
 * on every call so a deleted user's tokens stop working straight away.
 */
export async function authenticateMcpRequest(request: Request): Promise<{ user: AuthUser; token: string; expiresAt: number }> {
  const header = request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new EngineError("Unauthorized: missing bearer token", 401);

  const payload = decodeToken(token, secret());
  if (!payload) throw new EngineError("Unauthorized: invalid or expired token", 401);

  const user = await getUserById(payload.userId);
  if (!user) throw new EngineError("Unauthorized: user no longer exists", 401);

  return { user, token, expiresAt: payload.expiresAt };
}
