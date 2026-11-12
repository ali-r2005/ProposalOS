import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/context";
import { issueMcpToken, MCP_TOKEN_TTL_DAYS } from "@/lib/mcp/token";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * POST /api/admin/mcp-token — issue a personal access token for the MCP
 * endpoint, for the logged-in user. The token is not stored: it is shown once,
 * and every token is revoked together by rotating MCP_TOKEN_SECRET.
 */
export async function POST(request: Request) {
  try {
    const payload = requireAuth(request);
    const { token, expiresAt } = issueMcpToken(payload.userId, payload.role);
    const origin = new URL(request.url).origin;
    return NextResponse.json({
      token,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      ttlDays: MCP_TOKEN_TTL_DAYS,
      url: `${origin}/api/mcp`,
    });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
