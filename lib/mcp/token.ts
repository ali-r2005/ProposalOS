import { decodeToken, encodeToken } from "@/lib/auth/token";
import { getUserById, type AuthUser } from "@/lib/auth/session";
import { EngineError } from "@/lib/utils/error-handler";

/**
 * Personal access tokens for the MCP endpoint (phase 1, before OAuth).
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

export function issueMcpToken(userId: string, role: string): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + MCP_TOKEN_TTL_DAYS * 24 * 60 * 60;
  return { token: encodeToken({ userId, role, expiresAt }, secret()), expiresAt };
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
