import type { BlueprintSection, BusinessContext, LoadedTemplate } from "@/lib/engine/types";
import { resolveStatic } from "./static-source";
import { resolveManual } from "./manual-source";
import { resolveDatabase } from "./database-source";
import { resolveAi } from "./ai-source";

/**
 * Route a section to its source resolver and return the data it contributes to
 * the context. The engine has no knowledge of what any source *means*.
 */
export async function resolveSource(
  section: BlueprintSection,
  template: LoadedTemplate,
  context: BusinessContext
): Promise<Record<string, unknown>> {
  switch (section.source) {
    case "static":
      return resolveStatic(section);
    case "manual":
      return resolveManual();
    case "database":
      return resolveDatabase(section, template, context);
    case "ai":
      return resolveAi(section, template, context);
    default:
      return {};
  }
}
