import type { BlueprintSection } from "@/lib/engine/types";

/**
 * `static` source: data is baked into the blueprint (or the component itself).
 * Returns any inline `static` block declared on the section, else nothing.
 */
export function resolveStatic(section: BlueprintSection): Record<string, unknown> {
  return section.static ?? {};
}
