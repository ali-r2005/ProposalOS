// Activities provider — shapes the form's `catalogue-activities` records into
// the `activities` collection the activity-detail slide repeats over.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Lists may arrive as real arrays (CRM / API) or as the text typed in the form,
// so both are accepted: description paragraphs are separated by a blank line,
// keywords by commas or new lines.

const MAX_IMAGES = 5;

interface CatalogueActivity {
  "activity-name"?: string;
  description?: string | string[];
  space?: string;
  "number-of-participants"?: string | number;
  type?: string;
  timeframe?: string;
  keywords?: string | string[];
  "activity-logo"?: string;
  images?: string[];
}

function toList(value: string | string[] | undefined, separator: RegExp): string[] {
  const parts = Array.isArray(value) ? value : typeof value === "string" ? value.split(separator) : [];
  return parts.map((part) => String(part).trim()).filter(Boolean);
}

function shape(activity: CatalogueActivity) {
  const images = (Array.isArray(activity.images) ? activity.images : []).filter(Boolean).slice(0, MAX_IMAGES);
  const shaped: Record<string, unknown> = {
    name: activity["activity-name"] ?? "",
    description: toList(activity.description, /\n\s*\n/),
    space: activity.space ?? "",
    "number-of-participants": activity["number-of-participants"] ?? "",
    type: activity.type ?? "",
    timeframe: activity.timeframe ?? "",
    keywords: toList(activity.keywords, /[,\n]/),
    "activity-logo": activity["activity-logo"] ?? "",
    images,
  };
  // The slide has one photo layout per image count; Handlebars can't compare
  // numbers, so expose each slot and a flag for the layout to use.
  for (let n = 1; n <= MAX_IMAGES; n++) {
    shaped[`image-${n}`] = images[n - 1] ?? "";
    shaped[`count-${n}`] = images.length === n;
  }
  return shaped;
}

export const provider = {
  name: "activities",
  description: "Shapes form-submitted activities (paragraph and keyword lists, 1–5 photo layout) for the activity slide.",
  async execute(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const rows = Array.isArray(context["catalogue-activities"]) ? (context["catalogue-activities"] as CatalogueActivity[]) : [];
    return { activities: rows.map(shape) };
  },
};
