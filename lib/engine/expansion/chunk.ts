import type { BusinessContext, ExpansionConfig } from "@/lib/engine/types";

/**
 * `chunk`: split a context collection into groups of `size`, one slide each.
 * The current group is exposed as `items` (plus `index`).
 * A missing or empty collection yields no slides — the section is optional,
 * not a single blank placeholder.
 */
export function expandChunk(
  context: BusinessContext,
  config: ExpansionConfig
): BusinessContext[] {
  const collection = config.collection ? context[config.collection] : undefined;
  const size = Math.max(1, config.size ?? 1);

  if (!Array.isArray(collection) || collection.length === 0) {
    return [];
  }

  const slides: BusinessContext[] = [];
  for (let i = 0; i < collection.length; i += size) {
    slides.push({ ...context, items: collection.slice(i, i + size), index: slides.length });
  }
  return slides;
}
