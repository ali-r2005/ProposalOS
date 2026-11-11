import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/engine/core/template-loader";
import { requireAuth } from "@/lib/auth/context";
import type { TemplateSummary } from "@/lib/engine/types";
import { templateLanguages } from "@/lib/engine/i18n/language";
import { toErrorResponse } from "@/lib/utils/error-handler";

/** GET /api/templates — list available templates. */
export async function GET(request: Request) {
  try {
    requireAuth(request);

    const manifests = await listTemplates();
    const summaries: TemplateSummary[] = manifests.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      version: m.version,
      lang: m.lang,
      languages: templateLanguages(m),
    }));
    return NextResponse.json(summaries);
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
