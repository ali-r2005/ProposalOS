import { NextResponse } from "next/server";
import { OAuthError } from "./oauth";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * Response helpers for the OAuth/MCP endpoints. They are called by MCP
 * clients, some of them in a browser (e.g. the MCP Inspector), so they allow
 * any origin: none of them rely on cookies.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function oauthJson(body: unknown, status = 200, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...extra },
  });
}

/** RFC 6749 error body for OAuth errors; anything else becomes server_error. */
export function oauthErrorResponse(error: unknown): NextResponse {
  if (error instanceof OAuthError) {
    return oauthJson({ error: error.code, error_description: error.message }, error.status);
  }
  const { message, status } = toErrorResponse(error);
  return oauthJson({ error: "server_error", error_description: message }, status >= 500 ? status : 500);
}

/** OAuth endpoints get form-encoded bodies; accept JSON too. */
export async function readParams(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("Content-Type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(body).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  }
  const form = new URLSearchParams(await request.text());
  return Object.fromEntries(form);
}
