// Divers provider — custom sections, services, and auxiliary proposal items.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Each divers package is its own titled bundle of items (like a hotel or an
// activity), not a single shared bucket — the user picks 1+ whole packages
// in the selections form, and each renders its own set of slides.
//
// Two modes, driven by the context:
//   • catalog   — no selection yet: return every package.
//   • selection — `selected-divers` (array of ids) present: return only those,
//                 in the order the user picked them.

import { fetchDocs } from "../db/client.ts";

/** DocType this provider reads. Must match db/doctypes.json. */
const DOCTYPE = "Proposal Divers";

/**
 * `items` is a Frappe JSON field rather than a child table: an item is a
 * free-form bundle of {title, image, paragraphes} whose *shape* selects the
 * layout below, and paragraphes is itself a nested array — which a flat child
 * DocType cannot express without a second level of nesting.
 */
const JSON_FIELDS = ["items"];

export interface Item {
  title?: string;
  image?: string;
  paragraphes?: string[];
}

export interface DiversPackage {
  id: string;
  name: string;
  title: string;
  items: Item[];
}

/** Raw Frappe document — snake_case fieldnames, `name` is the primary key. */
interface DiversDoc {
  name: string;
  package_name: string;
  title: string;
  items: Item[];
}

/** Frappe fieldnames -> the shape this template's components bind to. */
function fromDoc(doc: DiversDoc): DiversPackage {
  return {
    id: doc.name,
    name: doc.package_name,
    title: doc.title,
    items: Array.isArray(doc.items) ? doc.items : [],
  };
}

/**
 * A package's own item shape decides its layout — no engine or template
 * numeric-comparison logic involved, just a plain array field per bucket:
 *   • items have no `paragraphes` → images-only (image gallery, no text)
 *   • items have `paragraphes` and there are exactly 2 → two-columns
 *   • items have `paragraphes` and there are 3+ → three-columns (capped to 3)
 */
function hasParagraphes(pkg: DiversPackage): boolean {
  return pkg.items.some((item) => Array.isArray(item.paragraphes) && item.paragraphes.length > 0);
}

interface DiversBuckets {
  diversImagesOnly?: DiversPackage[];
  diversTwoColumns?: DiversPackage[];
  diversThreeColumns?: DiversPackage[];
}

function bucketDivers(packages: DiversPackage[]): DiversBuckets {
  const diversImagesOnly: DiversPackage[] = [];
  const diversTwoColumns: DiversPackage[] = [];
  const diversThreeColumns: DiversPackage[] = [];
  const divers: DiversBuckets = {};

  for (const pkg of packages) {
    if (!hasParagraphes(pkg)) {
      diversImagesOnly.push({ ...pkg, items: pkg.items.slice(0, 4) });
    } else if (pkg.items.length === 2) {
      diversTwoColumns.push(pkg);
    } else {
      diversThreeColumns.push({ ...pkg, items: pkg.items.slice(0, 3) });
    }
  }

  // Only non-empty buckets are returned: the blueprint repeats a slide per
  // entry in each collection, so an empty key would render an empty slide.
  if (diversImagesOnly.length > 0) divers.diversImagesOnly = diversImagesOnly;
  if (diversTwoColumns.length > 0) divers.diversTwoColumns = diversTwoColumns;
  if (diversThreeColumns.length > 0) divers.diversThreeColumns = diversThreeColumns;

  return divers;
}

export const provider = {
  name: "divers",
  description: "Custom services and divers packages provider.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    // `context.diversPackages` stays supported as an override so a caller can
    // supply packages directly (previews, hand-edited context) without a
    // round-trip to Frappe.
    const allPackages: DiversPackage[] = Array.isArray(context.diversPackages)
      ? context.diversPackages
      : (await fetchDocs<DiversDoc>(DOCTYPE, JSON_FIELDS)).map(fromDoc);

    // Selection mode: filter to the chosen packages, in the user's order.
    const selected = context["selected-divers"];
    const packages = Array.isArray(selected)
      ? (() => {
          const byId = new Map(allPackages.map((x) => [x.id, x]));
          return selected
            .map((id) => byId.get(String(id)))
            .filter((x): x is DiversPackage => Boolean(x));
        })()
      : allPackages;

    return { divers: packages, ...bucketDivers(packages) };
  },
};
