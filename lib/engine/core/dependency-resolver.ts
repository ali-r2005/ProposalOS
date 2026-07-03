import type { BlueprintSection } from "@/lib/engine/types";

/**
 * Order sections so that any section which `dependsOn` another runs after it.
 * Dependencies may name either a section id or a provider name. Cycles and
 * unknown references fall back to the blueprint's declared order.
 */
export function orderSections(sections: BlueprintSection[]): BlueprintSection[] {
  const byKey = new Map<string, BlueprintSection>();
  for (const section of sections) {
    byKey.set(section.id, section);
    if (section.provider) byKey.set(section.provider, section);
  }

  const ordered: BlueprintSection[] = [];
  const visited = new Set<string>();
  const inProgress = new Set<string>();

  const visit = (section: BlueprintSection): void => {
    if (visited.has(section.id) || inProgress.has(section.id)) return;
    inProgress.add(section.id);

    for (const dep of section.dependsOn ?? []) {
      const target = byKey.get(dep);
      if (target && target.id !== section.id) visit(target);
    }

    inProgress.delete(section.id);
    visited.add(section.id);
    ordered.push(section);
  };

  for (const section of sections) visit(section);
  return ordered;
}
