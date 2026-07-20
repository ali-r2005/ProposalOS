import { NextResponse } from "next/server";
import { getProposal, updateProposal } from "@/lib/proposal-store";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { renderFromContext } from "@/lib/engine/core/pipeline";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/proposals/[id]/context — return the merged context object that
 * produced this proposal, so the editor can load it for hand-editing.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const proposal = await getProposal(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    return NextResponse.json({ context: proposal.context, templateId: proposal.templateId });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/proposals/[id]/context — accept an edited context object, re-render
 * the presentation straight from it (no providers/AI re-run) and persist the
 * refreshed html so the preview/PDF routes pick it up immediately.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const proposal = await getProposal(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const body = (await request.json()) as { context?: Record<string, unknown> };
    if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) {
      return NextResponse.json({ error: "Body must be `{ context: {...} }`" }, { status: 400 });
    }

    const template = await loadTemplate(proposal.templateId);
    const { html, slides } = await renderFromContext(template, body.context);
    await updateProposal(id, html, body.context);

    return NextResponse.json({ success: true, slides });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
