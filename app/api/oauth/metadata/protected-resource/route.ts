import { protectedResourceMetadata } from "@/lib/mcp/oauth";
import { corsPreflight, oauthJson } from "@/lib/mcp/http";

/**
 * Protected resource metadata (RFC 9728) for /api/mcp. Served at
 * /.well-known/oauth-protected-resource[/api/mcp] via a rewrite in next.config.js.
 */
export function GET(request: Request) {
  return oauthJson(protectedResourceMetadata(new URL(request.url).origin));
}

export const OPTIONS = corsPreflight;
