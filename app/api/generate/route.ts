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
      return NextResponse.json(
        { success: false, error: "Missing required fields", missing: validation.missing },
        { status: 400 }
      );
    }

    const result = await generatePresentation(body.templateId, formInput);
    saveProposal(result.proposalId, body.templateId, result.html);

    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
