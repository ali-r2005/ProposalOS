import { authorizationServerMetadata } from "@/lib/mcp/oauth";
import { corsPreflight, oauthJson } from "@/lib/mcp/http";

/**
 * Authorization server metadata (RFC 8414). Served at
 * /.well-known/oauth-authorization-server via a rewrite in next.config.js.
 */
export function GET(request: Request) {
  return oauthJson(authorizationServerMetadata(new URL(request.url).origin));
}

export const OPTIONS = corsPreflight;
