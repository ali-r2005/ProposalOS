import { NextResponse } from "next/server";
import { listProposals } from "@/lib/proposal-store";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/proposals?templateId=&limit=&offset=
 * Lists saved proposals (metadata only, no html/context) newest-first.
 * Optionally scoped to a single template. Backs both the per-template and
 * global history views.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? 50);
    const offset = Number(searchParams.get("offset") ?? 0);

    const { rows, total } = await listProposals({ templateId, limit, offset });
    return NextResponse.json({ rows, total });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
