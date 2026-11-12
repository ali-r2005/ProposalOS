import { createHash, createHmac, timingSafeEqual } from "crypto";
import { EngineError } from "@/lib/utils/error-handler";

/**
 * OAuth 2.1 authorization server for the MCP endpoint (so Claude can connect
 * as a custom connector), built stateless — nothing is stored:
 * - a registered client's id IS its signed registration (redirect URIs, name);
 * - authorization codes, refresh tokens and consent tickets are signed,
 *   short-lived payloads;
 * - access tokens are the same MCP tokens as the personal ones (lib/mcp/token.ts).
 *
 * Each kind of value is signed with its own key derived from MCP_TOKEN_SECRET,
 * so one can never be passed off as another (a refresh token is not an access
 * token, a code is not a client id). Rotating MCP_TOKEN_SECRET revokes all of
 * them, and Claude simply asks the user to connect again.
 * Codes are not one-time (no storage), but PKCE means only the client that
 * started the login can redeem one, within its 5 minutes.
 */

export const OAUTH_SCOPE = "proposals";
export const ACCESS_TOKEN_TTL = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days
const CODE_TTL = 5 * 60;
const CONSENT_TTL = 10 * 60;

type Kind = "client" | "client-secret" | "code" | "refresh" | "consent";
type AuthMethod = "none" | "client_secret_post" | "client_secret_basic";

export class OAuthError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

function key(kind: Kind): Buffer {
  const secret = process.env.MCP_TOKEN_SECRET;
  if (!secret) throw new EngineError("MCP is not configured on this server (MCP_TOKEN_SECRET is missing)", 503);
  return createHmac("sha256", secret).update(`proposalos-oauth:${kind}`).digest();
}

function mac(kind: Kind, data: string): string {
  return createHmac("sha256", key(kind)).update(data).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function seal(kind: Kind, payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(kind, body)}`;
}

/** Verify a sealed value; returns null when forged, of another kind, or expired. */
function open<T extends { exp?: number }>(kind: Kind, value: string): T | null {
  const [body, sig, extra] = value.split(".");
  if (!body || !sig || extra !== undefined || !safeEqual(sig, mac(kind, body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    if (payload.exp !== undefined && payload.exp < now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const now = () => Math.floor(Date.now() / 1000);

/** Short stable reference to a client inside other tokens (client ids are long). */
const clientRef = (clientId: string) => createHash("sha256").update(clientId).digest("base64url").slice(0, 22);

// ---------------------------------------------------------------- clients

export interface OAuthClient {
  clientId: string;
  name: string;
  redirectUris: string[];
  authMethod: AuthMethod;
}

interface ClientPayload {
  exp?: number;
  n: string;
  r: string[];
  a: AuthMethod;
  iat: number;
}

/** Claude and other clients may only send codes to https URLs, or to localhost for desktop/CLI apps. */
function isAllowedRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

/** Dynamic client registration (RFC 7591). */
export function registerClient(body: Record<string, unknown>): Record<string, unknown> {
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === "string") : [];
  if (!redirectUris.length || redirectUris.length > 10) {
    throw new OAuthError("invalid_redirect_uri", "redirect_uris must list 1 to 10 URIs");
  }
  const bad = redirectUris.find((u) => !isAllowedRedirect(u));
  if (bad) throw new OAuthError("invalid_redirect_uri", `Redirect URI not allowed: ${bad}`);

  const requested = body.token_endpoint_auth_method;
  const authMethod: AuthMethod =
    requested === "client_secret_post" || requested === "client_secret_basic" ? requested : "none";
  const name = typeof body.client_name === "string" && body.client_name.trim() ? body.client_name.trim().slice(0, 80) : "MCP client";

  const issuedAt = now();
  const clientId = seal("client", { n: name, r: redirectUris, a: authMethod, iat: issuedAt } satisfies ClientPayload);
  return {
    client_id: clientId,
    ...(authMethod !== "none" ? { client_secret: mac("client-secret", clientId), client_secret_expires_at: 0 } : {}),
    client_id_issued_at: issuedAt,
    client_name: name,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: authMethod,
    scope: OAUTH_SCOPE,
  };
}

export function getClient(clientId: string | null | undefined): OAuthClient | null {
  if (!clientId) return null;
  const p = open<ClientPayload>("client", clientId);
  if (!p) return null;
  return { clientId, name: p.n, redirectUris: p.r, authMethod: p.a };
}

/** Check the client's secret when it registered as a confidential client. */
export function authenticateClient(client: OAuthClient, secret: string | null): void {
  if (client.authMethod === "none") return;
  if (!secret || !safeEqual(secret, mac("client-secret", client.clientId))) {
    throw new OAuthError("invalid_client", "Client authentication failed", 401);
  }
}

// ---------------------------------------------------------------- authorize

export interface AuthorizeRequest {
  client: OAuthClient;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  scope: string;
}

/**
 * Validate the /oauth/authorize query. Problems with the client or the
 * redirect URI must be shown on the page (never redirect to an unverified
 * URI); other problems are returned to the client via the redirect.
 */
export function parseAuthorizeRequest(params: URLSearchParams):
  | { ok: true; request: AuthorizeRequest }
  | { ok: false; showError: string }
  | { ok: false; redirectError: { redirectUri: string; state: string | null; error: string; description: string } } {
  const client = getClient(params.get("client_id"));
  if (!client) return { ok: false, showError: "Unknown or expired client. Remove the connector in Claude and add it again." };

  const redirectUri = params.get("redirect_uri") ?? (client.redirectUris.length === 1 ? client.redirectUris[0] : "");
  if (!client.redirectUris.includes(redirectUri)) {
    return { ok: false, showError: "This redirect address was not registered by the client." };
  }

  const state = params.get("state");
  const fail = (error: string, description: string) => ({
    ok: false as const,
    redirectError: { redirectUri, state, error, description },
  });
  if (params.get("response_type") !== "code") return fail("unsupported_response_type", "Only response_type=code is supported");
  const codeChallenge = params.get("code_challenge") ?? "";
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) return fail("invalid_request", "A PKCE code_challenge is required");
  if (params.get("code_challenge_method") !== "S256") return fail("invalid_request", "code_challenge_method must be S256");

  return { ok: true, request: { client, redirectUri, codeChallenge, state, scope: OAUTH_SCOPE } };
}

export function redirectWith(redirectUri: string, values: Record<string, string | null>): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(values)) if (v !== null) url.searchParams.set(k, v);
  return url.toString();
}

interface ConsentPayload {
  u: string;
  c: string;
  ru: string;
  cc: string;
  exp: number;
}

/** Ticket embedded in the consent form, binding the decision to this user and this request (CSRF protection). */
export function issueConsentTicket(userId: string, req: AuthorizeRequest): string {
  return seal("consent", {
    u: userId,
    c: clientRef(req.client.clientId),
    ru: req.redirectUri,
    cc: req.codeChallenge,
    exp: now() + CONSENT_TTL,
  } satisfies ConsentPayload);
}

export function checkConsentTicket(ticket: string, userId: string, req: AuthorizeRequest): boolean {
  const p = open<ConsentPayload>("consent", ticket);
  return !!p && p.u === userId && p.c === clientRef(req.client.clientId) && p.ru === req.redirectUri && p.cc === req.codeChallenge;
}

interface CodePayload {
  u: string;
  c: string;
  ru: string;
  cc: string;
  s: string;
  exp: number;
}

export function issueCode(userId: string, req: AuthorizeRequest): string {
  return seal("code", {
    u: userId,
    c: clientRef(req.client.clientId),
    ru: req.redirectUri,
    cc: req.codeChallenge,
    s: req.scope,
    exp: now() + CODE_TTL,
  } satisfies CodePayload);
}

// ---------------------------------------------------------------- token

/** Redeem an authorization code (with its PKCE verifier) for the user id it was issued to. */
export function redeemCode(code: string, client: OAuthClient, redirectUri: string | null, verifier: string | null): { userId: string; scope: string } {
  const p = open<CodePayload>("code", code);
  if (!p || p.c !== clientRef(client.clientId)) throw new OAuthError("invalid_grant", "Invalid or expired authorization code");
  if (redirectUri !== null && redirectUri !== p.ru) throw new OAuthError("invalid_grant", "redirect_uri does not match");
  if (!verifier || createHash("sha256").update(verifier).digest("base64url") !== p.cc) {
    throw new OAuthError("invalid_grant", "PKCE verification failed");
  }
  return { userId: p.u, scope: p.s };
}

interface RefreshPayload {
  u: string;
  c: string;
  s: string;
  exp: number;
}

export function issueRefreshToken(userId: string, client: OAuthClient, scope: string): string {
  return seal("refresh", { u: userId, c: clientRef(client.clientId), s: scope, exp: now() + REFRESH_TOKEN_TTL } satisfies RefreshPayload);
}

export function redeemRefreshToken(token: string, client: OAuthClient): { userId: string; scope: string } {
  const p = open<RefreshPayload>("refresh", token);
  if (!p || p.c !== clientRef(client.clientId)) throw new OAuthError("invalid_grant", "Invalid or expired refresh token");
  return { userId: p.u, scope: p.s };
}

// ---------------------------------------------------------------- metadata

export function protectedResourceMetadata(origin: string): Record<string, unknown> {
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: [OAUTH_SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "ProposalOS",
  };
}

export function authorizationServerMetadata(origin: string): Record<string, unknown> {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    scopes_supported: [OAUTH_SCOPE],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true,
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
  };
}

/** Where a 401 from /api/mcp tells clients to start discovery (RFC 9728). */
export const resourceMetadataUrl = (origin: string) => `${origin}/.well-known/oauth-protected-resource/api/mcp`;
