import { NextResponse } from "next/server";
import { generatePresentation } from "@/lib/engine/core/pipeline";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { loadForms } from "@/lib/forms/form-generator";
import { validateFormInput } from "@/lib/forms/form-validator";
import { saveProposal } from "@/lib/proposal-store";
import { EngineError, toErrorResponse } from "@/lib/utils/error-handler";

/**
 * POST /api/generate
 * Body: { templateId, formInput }
 * Runs the engine and returns { success, html, proposalId, slides }.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      templateId?: string;
      formInput?: Record<string, unknown>;
      title?: string;
    };

    if (!body.templateId) {
      throw new EngineError("Missing `templateId` in request body", 400);
    }
    const formInput = body.formInput ?? {};

    // Structural validation against the template's declared required fields.
    const template = await loadTemplate(body.templateId);
    const forms = await loadForms(template).catch(() => []);
    const validation = validateFormInput(forms, formInput);
    if (!validation.valid) {
      const error = validation.invalid.length
        ? "Some fields have too many selections"
        : "Missing required fields";
      return NextResponse.json(
        { success: false, error, missing: validation.missing, invalid: validation.invalid },
        { status: 400 }
      );
    }

    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : undefined;

    const result = await generatePresentation(body.templateId, formInput);
    await saveProposal(result.proposalId, body.templateId, result.html, result.context, title);

    // The merged context can be large and is only needed server-side by the
    // editor (fetched separately) — don't ship it back in the generate response.
    const { context: _context, ...publicResult } = result;
    return NextResponse.json(publicResult);
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
