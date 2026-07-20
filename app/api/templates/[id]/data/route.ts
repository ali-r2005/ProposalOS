import { NextResponse } from "next/server";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { loadTemplateSchema } from "@/lib/db/template-schema-loader";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/templates/[id]/data — list the table names this template's own
 * db/schema.ts exports, so an admin UI can build its table list without
 * knowing anything about the template's business domain.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const template = await loadTemplate(id);
    const tables = await loadTemplateSchema(template);
    return NextResponse.json({ tables: Object.keys(tables) });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
