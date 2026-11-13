import { NextResponse } from "next/server";
import { listProposals } from "@/lib/proposal-store";
import { requireAuth } from "@/lib/auth/context";
import { timingSafeEqual } from "node:crypto";
import { toErrorResponse } from "@/lib/utils/error-handler";

const CONTEXT_PREFIX = "context.";

/** True when the request carries the `CRM_API_TOKEN` bearer token. */
function hasIntegrationToken(request: Request): boolean {
  const expected = process.env.CRM_API_TOKEN;
  const header = request.headers.get("Authorization");
  if (!expected || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7).trim());
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/**
 * The app's own login token, or the fixed `CRM_API_TOKEN` (an env var you
 * choose), so a server such as a CRM can list proposals. That token works on
 * this read-only route only. Unset = only logged-in users.
 */
function authenticate(request: Request): void {
  if (hasIntegrationToken(request)) return;
  requireAuth(request);
}

/**
 * GET /api/proposals?templateId=&limit=&offset=&context.<key>=<value>
 * Lists saved proposals (metadata only, no html/context) newest-first.
 * Optionally scoped to a single template, and to proposals whose context has
 * the given top-level values (e.g. `context.deal=CRM-DEAL-2026-00045`).
 * Backs both the per-template and global history views.
 */
export async function GET(request: Request) {
  try {
    authenticate(request);

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId") ?? undefined;
    // Bad or missing paging params fall back to sane values instead of reaching SQL as NaN.
    const limit = Math.min(Math.max(Math.trunc(Number(searchParams.get("limit"))) || 50, 1), 100);
    const offset = Math.max(Math.trunc(Number(searchParams.get("offset"))) || 0, 0);

    const context: Record<string, string> = {};
    for (const [name, value] of searchParams) {
      const key = name.slice(CONTEXT_PREFIX.length);
      if (name.startsWith(CONTEXT_PREFIX) && key) context[key] = value;
    }

    const { rows, total } = await listProposals({ templateId, context, limit, offset });
    // `filter` echoes the context filter that was applied, so a caller can
    // tell it apart from an older server that ignored it and listed everything.
    return NextResponse.json({ rows, total, filter: context });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
