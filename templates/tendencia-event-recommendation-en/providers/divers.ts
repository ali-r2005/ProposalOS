// Divers provider — shapes the form's `divers` record-list (package title +
// nested items, filled by hand or by the prefill-catalogue plugin from a
// Frappe Divers doctype) into the `divers` collection the divers-columns
// component repeats over. Column count (3 or 4) is decided here from each
// package's item count and passed as `grid-columns`, so the component itself
// never counts or branches.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// No database here — like the other providers in this template, packages come
// from the form/context, not a table.

interface DiversFormItem {
  "diver-item-title"?: string;
  image?: string;
  paragraphes?: string;
}

interface DiversFormPackage {
  "diver-title"?: string;
  items?: DiversFormItem[];
}

/** \n -> <br> so the component can drop the converted string straight into
 *  HTML with a triple-stache, no Handlebars helper needed — same convention
 *  as the other providers' description fields. */
function toHtmlParagraph(text: string | undefined): string {
  if (!text) return "";
  return text.replace(/\r\n|\r|\n/g, "<br>");
}

const GRID_COLUMNS_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

function shape(pkg: DiversFormPackage) {
  // Column layout supports 1-4 columns; cap overflow to 4.
  const items = (pkg.items ?? []).slice(0, 4).map((item) => ({
    title: item["diver-item-title"] ?? "",
    image: item.image ?? "",
    paragraphes: toHtmlParagraph(item.paragraphes),
  }));
  return {
    title: pkg["diver-title"] ?? "",
    "grid-columns": GRID_COLUMNS_CLASS[items.length] ?? "grid-cols-1",
    items,
  };
}

export const provider = {
  name: "divers",
  description: "Shapes divers packages (1 to 4 items each) for the divers-columns component.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const packages: DiversFormPackage[] = Array.isArray(context.divers) ? context.divers : [];
    const shaped = packages
      .filter((pkg) => Array.isArray(pkg.items) && pkg.items.length >= 1)
      .map(shape);
    return { divers: shaped };
  },
};
