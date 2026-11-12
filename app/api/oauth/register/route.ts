import { registerClient } from "@/lib/mcp/oauth";
import { corsPreflight, oauthErrorResponse, oauthJson } from "@/lib/mcp/http";

/**
 * POST /api/oauth/register — dynamic client registration (RFC 7591).
 * Claude registers itself here the first time a user adds the connector.
 * Nothing is stored: the returned client_id is the signed registration.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return oauthJson({ error: "invalid_client_metadata", error_description: "JSON body required" }, 400);
    return oauthJson(registerClient(body), 201);
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export const OPTIONS = corsPreflight;
