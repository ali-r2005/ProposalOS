import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import OAuthConsent from "@/components/OAuthConsent";
import { issueConsentTicket, parseAuthorizeRequest, redirectWith } from "@/lib/mcp/oauth";
import { userFromRefreshCookie } from "@/lib/mcp/token";

export const dynamic = "force-dynamic";

/**
 * GET /oauth/authorize — OAuth authorization endpoint. Validates the request,
 * makes sure the user is logged in to ProposalOS (sends them to the login page
 * and back otherwise), then asks them to allow the client. The decision is
 * posted to /api/oauth/authorize.
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value !== undefined) params.set(k, value);
  }

  const parsed = parseAuthorizeRequest(params);
  if (!parsed.ok) {
    if ("redirectError" in parsed) {
      const { redirectUri, state, error, description } = parsed.redirectError;
      redirect(redirectWith(redirectUri, { error, error_description: description, state }));
    }
    return <OAuthConsent error={parsed.showError} />;
  }

  const user = await userFromRefreshCookie((await cookies()).get("refreshToken")?.value);
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/oauth/authorize?${params.toString()}`)}`);
  }

  const { request } = parsed;
  return (
    <OAuthConsent
      clientName={request.client.name}
      redirectHost={new URL(request.redirectUri).host}
      email={user.email}
      fields={{ ...Object.fromEntries(params), ticket: issueConsentTicket(user.id, request) }}
    />
  );
}
