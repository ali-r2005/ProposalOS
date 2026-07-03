import type { BlueprintSection } from "./section";

/** Parsed `blueprint.yaml` — the ordered execution plan for a template. */
export interface Blueprint {
  sections: BlueprintSection[];
}
