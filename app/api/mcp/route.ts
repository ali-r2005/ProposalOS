import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";
import { authenticateMcpRequest } from "@/lib/mcp/token";
import { resourceMetadataUrl } from "@/lib/mcp/oauth";
import { CORS_HEADERS, corsPreflight } from "@/lib/mcp/http";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * /api/mcp — the ProposalOS MCP server (Streamable HTTP, stateless).
 * Claude (Claude Code, the desktop app, or a claude.ai custom connector)
 * connects here with `Authorization: Bearer <MCP token>`. The token comes
 * from POST /api/admin/mcp-token (Settings page).
 *
 * Stateless: each request builds its own server + transport, so it works on
 * serverless functions where requests don't share memory.
 */
export const runtime = "nodejs";
// create_proposal runs providers and AI; give it the same room as generation.
export const maxDuration = 300;

async function handle(request: Request): Promise<Response> {
  let auth: Awaited<ReturnType<typeof authenticateMcpRequest>>;
  try {
    auth = await authenticateMcpRequest(request);
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    // The 401 header is how Claude finds the OAuth login (RFC 9728 discovery).
    const challenge = `Bearer realm="proposalos", resource_metadata="${resourceMetadataUrl(new URL(request.url).origin)}"`;
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message }, id: null },
      { status, headers: { ...CORS_HEADERS, ...(status === 401 ? { "WWW-Authenticate": challenge } : {}) } }
    );
  }

  const origin = new URL(request.url).origin;
  const server = createMcpServer(origin, auth.user);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request, {
      authInfo: { token: auth.token, clientId: auth.user.id, scopes: [], expiresAt: auth.expiresAt },
    });
    for (const [k, v] of Object.entries(CORS_HEADERS)) response.headers.set(k, v);
    return response;
  } catch (error) {
    const { message } = toErrorResponse(error);
    return NextResponse.json({ jsonrpc: "2.0", error: { code: -32603, message }, id: null }, { status: 500, headers: CORS_HEADERS });
  } finally {
    // With JSON responses the reply is complete once handleRequest returns.
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
export const OPTIONS = corsPreflight;
