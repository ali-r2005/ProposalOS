import type { BusinessContext, LoadedTemplate } from "@/lib/engine/types";
import { resolveSource } from "@/lib/engine/sources";
import { orderSections } from "./dependency-resolver";
import { devLog } from "@/lib/utils/error-handler";

/**
 * Build the single merged context for a run: start from the user's form input,
 * then fold in every section's source data (providers, AI, static) in
 * dependency order. The result is a flat bag the components read from.
 */
export async function buildContext(
  template: LoadedTemplate,
  formInput: Record<string, unknown>
): Promise<BusinessContext> {
  const context: BusinessContext = { ...formInput };

  for (const section of orderSections(template.blueprint.sections)) {
    const result = await resolveSource(section, template, context);
    if (result && typeof result === "object") {
      Object.assign(context, result);
    }
  }

  devLog(`Context built with keys: ${Object.keys(context).join(", ")}`);
  return context;
}
