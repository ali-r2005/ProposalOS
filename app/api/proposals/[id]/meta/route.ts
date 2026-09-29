import { NextResponse } from "next/server";
import { getProposalMeta } from "@/lib/proposal-store";
import { requireAuth } from "@/lib/auth/context";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/proposals/[id]/meta — proposal metadata without the html/context
 * payload. The sibling `[id]` route returns the rendered document itself, so
 * it has nowhere to carry a title; the editor headers need just the name.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    requireAuth(request);

    const proposal = await getProposalMeta(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json({ proposal });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
