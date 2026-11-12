import { getUserById } from "@/lib/auth/session";
import {
  ACCESS_TOKEN_TTL,
  OAuthError,
  authenticateClient,
  getClient,
  issueRefreshToken,
  redeemCode,
  redeemRefreshToken,
} from "@/lib/mcp/oauth";
import { issueMcpToken } from "@/lib/mcp/token";
import { corsPreflight, oauthErrorResponse, oauthJson, readParams } from "@/lib/mcp/http";

/** client_id/secret from the body (client_secret_post) or a Basic header (client_secret_basic). */
function clientCredentials(request: Request, params: Record<string, string>): { id: string | null; secret: string | null } {
  const header = request.headers.get("Authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString();
    const sep = decoded.indexOf(":");
    if (sep > 0) {
      return {
        id: decodeURIComponent(decoded.slice(0, sep)),
        secret: decodeURIComponent(decoded.slice(sep + 1)),
      };
    }
  }
  return { id: params.client_id ?? null, secret: params.client_secret ?? null };
}

/**
 * POST /api/oauth/token — exchange an authorization code (with PKCE) or a
 * refresh token for an MCP access token. Refresh tokens rotate on every use.
 */
export async function POST(request: Request) {
  try {
    const params = await readParams(request);
    const credentials = clientCredentials(request, params);
    const client = getClient(credentials.id);
    if (!client) throw new OAuthError("invalid_client", "Unknown client", 401);
    authenticateClient(client, credentials.secret);

    let grant: { userId: string; scope: string };
    if (params.grant_type === "authorization_code") {
      grant = redeemCode(params.code ?? "", client, params.redirect_uri ?? null, params.code_verifier ?? null);
    } else if (params.grant_type === "refresh_token") {
      grant = redeemRefreshToken(params.refresh_token ?? "", client);
    } else {
      throw new OAuthError("unsupported_grant_type", "grant_type must be authorization_code or refresh_token");
    }

    // Re-read the user: a deleted user can't get new tokens, and the role is current.
    const user = await getUserById(grant.userId);
    if (!user) throw new OAuthError("invalid_grant", "The user no longer exists");

    const { token } = issueMcpToken(user.id, user.role, ACCESS_TOKEN_TTL);
    return oauthJson({
      access_token: token,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL,
      refresh_token: issueRefreshToken(user.id, client, grant.scope),
      scope: grant.scope,
    });
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export const OPTIONS = corsPreflight;
