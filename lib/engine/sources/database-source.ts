import type { BlueprintSection, BusinessContext, LoadedTemplate } from "@/lib/engine/types";
import { runProvider } from "@/lib/providers/provider-loader";
import { devWarn } from "@/lib/utils/error-handler";

/**
 * `database` source: run the template-authored provider named on the section.
 * Providers encapsulate all business/data logic; the engine only invokes them.
 */
export async function resolveDatabase(
  section: BlueprintSection,
  template: LoadedTemplate,
  context: BusinessContext
): Promise<Record<string, unknown>> {
  if (!section.provider) {
    devWarn(`Section "${section.id}" is a database source but names no provider.`);
    return {};
  }
  return runProvider(template, section.provider, context);
}
