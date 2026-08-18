// Divers provider — parses the form's `divers` textarea (a raw JSON string,
// same convention as the `programme` field) and shapes each package into the
// `divers` collection the divers-columns component repeats over. Column
// count (3 or 4) is decided here from each package's item count and passed
// as `grid-columns`, so the component itself never counts or branches.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// No database here — like the other providers in this template, packages come
// from the form/context, not a table.

interface DiversItem {
  title?: string;
  image?: string;
  paragraphes?: string[];
}

interface DiversPackage {
  id?: string;
  title?: string;
  items?: DiversItem[];
}

function shape(pkg: DiversPackage) {
  // Column layout only supports 3 or 4 columns; cap overflow to 4 and skip
  // packages that don't have enough items for either layout.
  const items = (pkg.items ?? []).slice(0, 4);
  return {
    title: pkg.title ?? "",
    "grid-columns": items.length >= 4 ? "grid-cols-4" : "grid-cols-3",
    items,
  };
}

/** Parse the raw `divers` field: an array, a JSON string of one, or (like
 *  `programme`) a `{ "divers": [...] }` wrapper someone naturally pastes
 *  since the field is itself named "divers". */
function parseDivers(raw: unknown): DiversPackage[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string" || !raw.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed) && parsed && typeof parsed === "object" && Array.isArray((parsed as any).divers)) {
    parsed = (parsed as any).divers;
  }
  return Array.isArray(parsed) ? parsed : [];
}

export const provider = {
  name: "divers",
  description: "Parses the raw JSON divers field into 3/4-item packages for divers-columns.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const packages = parseDivers(context.divers);
    const shaped = packages
      .filter((pkg) => Array.isArray(pkg.items) && pkg.items.length >= 3)
      .map(shape);
    return { divers: shaped };
  },
};
