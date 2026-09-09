import { NextResponse } from "next/server";
import { deleteProposal, getProposal } from "@/lib/proposal-store";
import { requireAuth } from "@/lib/auth/context";
import { verifyShareSignature } from "@/lib/share/link";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/proposals/[id] — return the generated presentation as an HTML
 * document, suitable for embedding directly in a preview iframe.
 *
 * Two ways in: the normal authenticated session, or a valid `expires`+`sig`
 * pair minted by POST .../share — the public /p/[id] page passes those
 * through so a lead can view the proposal without logging in.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const url = new URL(request.url);
    const expiresParam = url.searchParams.get("expires");
    const signature = url.searchParams.get("sig");

    if (expiresParam && signature) {
      if (!verifyShareSignature(id, Number(expiresParam), signature)) {
        return NextResponse.json({ error: "Share link is invalid or expired" }, { status: 403 });
      }
    } else {
      requireAuth(request);
    }

    const proposal = await getProposal(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return new NextResponse(proposal.html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/** DELETE /api/proposals/[id] — remove a saved proposal, used by the history views. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    requireAuth(request);

    const deleted = await deleteProposal(id);
    if (!deleted) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
