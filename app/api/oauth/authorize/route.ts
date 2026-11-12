import { NextResponse } from "next/server";
import { checkConsentTicket, issueCode, parseAuthorizeRequest, redirectWith } from "@/lib/mcp/oauth";
import { userFromRefreshCookie } from "@/lib/mcp/token";

function cookie(request: Request, name: string): string | undefined {
  const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function plainError(message: string, status: number): Response {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

/**
 * POST /api/oauth/authorize — the consent form's target. Re-validates the
 * request, checks the logged-in user and the consent ticket (so another site
 * can't submit this form on the user's behalf), then sends the browser back to
 * the client with a code (allow) or access_denied (deny).
 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const sentFrom = request.headers.get("Origin");
  if (sentFrom && sentFrom !== origin) return plainError("Cross-site request refused", 403);

  const form = await request.formData();
  const params = new URLSearchParams();
  for (const [k, v] of form) if (typeof v === "string") params.set(k, v);

  const parsed = parseAuthorizeRequest(params);
  if (!parsed.ok) {
    if ("showError" in parsed) return plainError(parsed.showError, 400);
    const { redirectUri, state, error, description } = parsed.redirectError;
    return NextResponse.redirect(redirectWith(redirectUri, { error, error_description: description, state }), 303);
  }
  const { request: req } = parsed;

  const user = await userFromRefreshCookie(cookie(request, "refreshToken"));
  if (!user) return plainError("Your ProposalOS session has ended. Go back to Claude and connect again.", 401);
  if (!checkConsentTicket(params.get("ticket") ?? "", user.id, req)) {
    return plainError("This approval page has expired. Go back to Claude and connect again.", 400);
  }

  const target =
    params.get("decision") === "allow"
      ? redirectWith(req.redirectUri, { code: issueCode(user.id, req), state: req.state, iss: origin })
      : redirectWith(req.redirectUri, { error: "access_denied", error_description: "The user denied access", state: req.state });
  return NextResponse.redirect(target, 303);
}
