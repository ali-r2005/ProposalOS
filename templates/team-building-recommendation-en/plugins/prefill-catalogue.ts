// Prefill plugin (EN) — resolves the CRM Deal's selected products into activity
// records for the "activities" form step. Same as team-building-recommendation's
// prefill-catalogue, except that the name, description and keywords come from the
// Activity's English translation (translations[] child table, language "en"),
// falling back to the base (French) values when no English row exists.
// Plugin contract (strict): export const plugin = { name, description, trigger, execute }.
//
// Triggered from /templates/team-building-recommendation-en/new?deal=<CRM Deal name>.
// The chain: CRM Deal.products[] -> Item (per product_code) -> catalogue type +
// reference -> Activity. The type/reference is read from the Item itself, and
// from its Item Group only when the Item has none: activities often sit in a
// shared group ("TEAM BUILDING") that carries no reference of its own.
import { getWithRetry, FRAPPE_BASE_URL } from "./frappe-http.ts";

interface CrmDealProduct {
  product_code?: string;
}

interface CrmDeal {
  products?: CrmDealProduct[];
}

interface CatalogueImage {
  image?: string;
}

interface CatalogueLink {
  custom_catalogue_type?: "Hotel" | "Activity" | "Soiree" | "Divers";
  custom_catalogue_reference?: string | number;
}

interface ItemDoc extends CatalogueLink {
  item_group?: string;
}

interface ActivityDoc {
  activity_name?: string;
  type?: string;
  description?: string;
  activity_logo?: string;
  activity_keywords?: string;
  number_of_participants?: string;
  space?: string;
  timeframe?: string;
  images?: CatalogueImage[];
  translations?: Translation[];
}

interface Translation {
  language: string;
  activity_name?: string;
  description?: string;
  keywords?: string;
}

const PREFERRED_LANGUAGE = "en";

/** The translation row for the template's language, or null when there is none. */
function getPreferredTranslation(translations: Translation[] | undefined): Translation | null {
  if (!Array.isArray(translations)) return null;
  return translations.find((translation) => translation.language === PREFERRED_LANGUAGE) ?? null;
}

function authHeaders(apiKey: string, apiSecret: string) {
  return { Authorization: `token ${apiKey}:${apiSecret}` };
}

/** Frappe stores uploaded files as server-relative paths ("/files/x.jpg" or
 *  "/private/files/x.jpg"); the browser needs a full URL. */
function resolveFileUrl(path: string | undefined): string {
  if (!path) return "";
  return path.startsWith("/") ? `${FRAPPE_BASE_URL}${path}` : path;
}

function resolveImageUrls(images: CatalogueImage[] | undefined): string[] {
  if (!Array.isArray(images)) return [];
  return images.map((img) => resolveFileUrl(img.image)).filter(Boolean);
}

async function fetchDoc<T>(doctype: string, name: string, apiKey: string, apiSecret: string): Promise<T | null> {
  try {
    const data = await getWithRetry<{ data: T }>(
      `${FRAPPE_BASE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { headers: authHeaders(apiKey, apiSecret), timeoutMs: 15_000 }
    );
    return data.data;
  } catch {
    return null;
  }
}

// Shaped to match the `catalogue-activities` item fields in form/3-activities.json.
// The description keeps its line breaks: the activities provider splits it into
// paragraphs on blank lines (no \n -> <br> here, unlike the other template).
function shapeActivity(id: string, doc: ActivityDoc) {
  const translation = getPreferredTranslation(doc.translations);
  return {
    id,
    "activity-name": translation?.activity_name || doc.activity_name || "",
    description: translation?.description || doc.description || "",
    space: doc.space ?? "",
    "number-of-participants": doc.number_of_participants ?? "",
    type: doc.type ?? "",
    timeframe: doc.timeframe ?? "",
    keywords: translation?.keywords || doc.activity_keywords || "",
    "activity-logo": resolveFileUrl(doc.activity_logo),
    images: resolveImageUrls(doc.images),
  };
}

export const plugin = {
  name: "prefill-catalogue",
  description: "Resolves the CRM Deal's selected products into activity records (English translation).",
  trigger: "onMount" as const,
  async execute(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const dealId = context.deal;
    if (!dealId || typeof dealId !== "string") return {};

    const apiKey = process.env.FRAPPE_CRM_API_KEY;
    const apiSecret = process.env.FRAPPE_CRM_API_SECRET;
    if (!apiKey || !apiSecret) return {};

    const deal = await getWithRetry<{ data: CrmDeal }>(
      `${FRAPPE_BASE_URL}/api/resource/CRM%20Deal/${encodeURIComponent(dealId)}`,
      { headers: authHeaders(apiKey, apiSecret), timeoutMs: 15_000 }
    );
    const productCodes = (deal.data.products ?? [])
      .map((p) => p.product_code)
      .filter((code): code is string => typeof code === "string" && code.length > 0);

    const items = await Promise.all(productCodes.map((code) => fetchDoc<ItemDoc>("Item", code, apiKey, apiSecret)));

    // Items without their own catalogue link fall back to their Item Group;
    // several products often share a group, so fetch each group once.
    const groupNames = [
      ...new Set(
        items
          .filter((item) => item && !item.custom_catalogue_type && item.item_group)
          .map((item) => item!.item_group!)
      ),
    ];
    const groups = await Promise.all(groupNames.map((name) => fetchDoc<CatalogueLink>("Item Group", name, apiKey, apiSecret)));
    const groupByName = new Map(groupNames.map((name, i) => [name, groups[i]]));

    const links = items.map((item) =>
      item?.custom_catalogue_type ? item : item?.item_group ? groupByName.get(item.item_group) : null
    );

    // Several products can point at the same Activity — keep each one once, in deal order.
    const references = [
      ...new Set(
        links
          .filter((link) => link?.custom_catalogue_type === "Activity" && link.custom_catalogue_reference)
          .map((link) => String(link!.custom_catalogue_reference))
      ),
    ];
    const docs = await Promise.all(references.map((ref) => fetchDoc<ActivityDoc>("Activity", ref, apiKey, apiSecret)));

    const activities = docs.flatMap((doc, i) => (doc ? [shapeActivity(references[i], doc)] : []));
    return activities.length ? { "catalogue-activities": activities } : {};
  },
};
