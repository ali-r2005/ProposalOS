import { NextResponse } from "next/server";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { runProvider } from "@/lib/providers/provider-loader";
import { requireAuth } from "@/lib/auth/context";
import { EngineError, toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/templates/[id]/options?provider=<name>&destination=...&q=...&limit=20&offset=0
 *
 * Runs a template provider in "catalog" mode and returns whatever it produces
 * (e.g. `{ hotels: [...], total }`). The engine stays agnostic: it just forwards
 * query params into the provider's context and returns the result verbatim.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request);
    const { id } = await params;
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider");
    if (!provider) {
      throw new EngineError("Missing `provider` query parameter", 400);
    }

    // Build a partial context from the remaining query params. `limit`/`offset`
    // are coerced to numbers so providers can paginate; everything else is text.
    const context: Record<string, unknown> = {};
    for (const [key, value] of url.searchParams) {
      if (key === "provider") continue;
      context[key] = key === "limit" || key === "offset" ? Number(value) : value;
    }

    const template = await loadTemplate(id);
    const result = await runProvider(template, provider, context);
    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
