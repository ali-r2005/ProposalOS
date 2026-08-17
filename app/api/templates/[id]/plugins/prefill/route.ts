import { NextResponse } from "next/server";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { runPlugins } from "@/lib/plugins/plugin-loader";
import { requireAuth } from "@/lib/auth/context";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/templates/[id]/plugins/prefill?<any query params>
 *
 * Runs every manifest-listed plugin with trigger "onMount" and returns the
 * merged result. Used by ProposalForm to pre-fill field values on mount.
 * The engine stays agnostic: query params are forwarded into the plugin
 * context verbatim (same pattern as the `options` route for providers) — it
 * never inspects or hardcodes what a param like `deal` means.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request);
    const { id } = await params;
    const url = new URL(request.url);
    const context: Record<string, unknown> = Object.fromEntries(url.searchParams);

    const template = await loadTemplate(id);
    const result = await runPlugins(template, "onMount", context);
    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
