import { NextResponse } from "next/server";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { loadForms } from "@/lib/forms/form-generator";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/templates/[id]/forms
 * Load ALL form JSON files from the template and return them as form groups:
 * `{ forms: [{ id, title, fields }] }`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await loadTemplate(id);
    const forms = await loadForms(template);
    return NextResponse.json({ forms });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
