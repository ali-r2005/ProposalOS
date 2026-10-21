import { NextResponse } from "next/server";
import { listProposals } from "@/lib/proposal-store";
import { requireAuth } from "@/lib/auth/context";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/proposals?templateId=&limit=&offset=
 * Lists saved proposals (metadata only, no html/context) newest-first.
 * Optionally scoped to a single template. Backs both the per-template and
 * global history views.
 */
export async function GET(request: Request) {
  try {
    requireAuth(request);

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId") ?? undefined;
    // Bad or missing paging params fall back to sane values instead of reaching SQL as NaN.
    const limit = Math.min(Math.max(Math.trunc(Number(searchParams.get("limit"))) || 50, 1), 100);
    const offset = Math.max(Math.trunc(Number(searchParams.get("offset"))) || 0, 0);

    const { rows, total } = await listProposals({ templateId, limit, offset });
    return NextResponse.json({ rows, total });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
