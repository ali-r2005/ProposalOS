import type { Blueprint, BlueprintSection, ExpansionConfig, ExpansionStrategy } from "@/lib/engine/types";
import { parseYaml } from "@/lib/utils/yaml-parser";
import { EngineError } from "@/lib/utils/error-handler";

const VALID_SOURCES = new Set(["static", "manual", "database", "ai"]);
const VALID_STRATEGIES = new Set<ExpansionStrategy>(["single", "repeat", "chunk"]);

/** Normalise the two accepted expansion shapes into a config object. */
export function normaliseExpansion(
  expansion: BlueprintSection["expansion"] | undefined
): ExpansionConfig {
  if (!expansion) return { strategy: "single" };
  if (typeof expansion === "string") {
    return { strategy: VALID_STRATEGIES.has(expansion) ? expansion : "single" };
  }
  const strategy = VALID_STRATEGIES.has(expansion.strategy) ? expansion.strategy : "single";
  return { ...expansion, strategy };
}

/**
 * Parse and validate `blueprint.yaml`. Validation is structural only —
 * the engine has no opinion about what any section *means*.
 */
export function parseBlueprint(source: string): Blueprint {
  const raw = parseYaml<{ sections?: unknown }>(source);

  if (!raw || typeof raw !== "object" || !Array.isArray(raw.sections)) {
    throw new EngineError("blueprint.yaml must define a `sections` array", 500);
  }

  const seen = new Set<string>();
  const sections: BlueprintSection[] = raw.sections.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new EngineError(`Blueprint section #${index} is not an object`, 500);
    }
    const s = entry as Record<string, unknown>;

    if (typeof s.id !== "string" || !s.id) {
      throw new EngineError(`Blueprint section #${index} is missing an "id"`, 500);
    }
    if (seen.has(s.id)) {
      throw new EngineError(`Duplicate blueprint section id: "${s.id}"`, 500);
    }
    seen.add(s.id);

    if (typeof s.component !== "string" || !s.component) {
      throw new EngineError(`Section "${s.id}" is missing a "component"`, 500);
    }
    if (typeof s.source !== "string" || !VALID_SOURCES.has(s.source)) {
      throw new EngineError(
        `Section "${s.id}" has invalid source "${String(s.source)}" (expected static|manual|database|ai)`,
        500
      );
    }

    return {
      id: s.id,
      component: s.component,
      source: s.source as BlueprintSection["source"],
      provider: typeof s.provider === "string" ? s.provider : undefined,
      prompt: typeof s.prompt === "string" ? s.prompt : undefined,
      expansion: normaliseExpansion(s.expansion as BlueprintSection["expansion"]),
      dependsOn: Array.isArray(s.dependsOn) ? (s.dependsOn as string[]) : undefined,
      static: (s.static as Record<string, unknown>) ?? undefined,
    };
  });

  return { sections };
}
