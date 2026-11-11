import { NextResponse } from "next/server";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { loadForms } from "@/lib/forms/form-generator";
import { requireAuth } from "@/lib/auth/context";
import { templateLanguages } from "@/lib/engine/i18n/language";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * GET /api/templates/[id]/forms
 * Load ALL form JSON files from the template and return them as form groups:
 * `{ forms: [{ id, title, fields }], languages }` — `languages` lists the
 * content languages a proposal can be generated in, default first.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request);
    const { id } = await params;
    const template = await loadTemplate(id);
    const forms = await loadForms(template);
    return NextResponse.json({ forms, languages: templateLanguages(template.manifest) });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
