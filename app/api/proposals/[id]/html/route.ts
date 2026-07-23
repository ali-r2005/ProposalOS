import { NextResponse } from "next/server";
import { getProposal, updateProposal } from "@/lib/proposal-store";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { wrapPresentation } from "@/lib/engine/renderer/theme-loader";
import type { RenderedSlide } from "@/lib/engine/types";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * PUT /api/proposals/[id]/html — accept slides hand-edited visually (GrapesJS)
 * and re-assemble the final document through the same `wrapPresentation`
 * shell used at generation time, so theme tokens/runtime script tags stay
 * consistent. The proposal's `context` is left untouched — this is a visual
 * edit on top of already-rendered output, not a re-render from context.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const proposal = await getProposal(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const body = (await request.json()) as { slides?: RenderedSlide[] };
    if (!Array.isArray(body.slides)) {
      return NextResponse.json({ error: "Body must be `{ slides: [...] }`" }, { status: 400 });
    }

    const template = await loadTemplate(proposal.templateId);
    const html = wrapPresentation(template, body.slides);
    await updateProposal(id, html, proposal.context);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
