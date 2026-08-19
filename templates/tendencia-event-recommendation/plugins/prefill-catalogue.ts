// Prefill plugin — resolves the CRM Deal's selected products into hotel /
// activity / soirée catalogue records for the "catalogue" form group.
// Plugin contract (strict): export const plugin = { name, description, trigger, execute }.
//
// Triggered from /templates/tendencia-event-recommendation/new?deal=<CRM Deal name>.
// The chain: CRM Deal.products[] -> Item (per product_code) -> branch on
// custom_catalogue_type -> Hotel/Activity/Soiree (by custom_catalogue_reference).
import { getWithRetry } from "./frappe-http.ts";

const FRAPPE_BASE_URL = "https://erp.tendenciaevents.com";

interface CrmDealProduct {
  product_code?: string;
}

interface CrmDeal {
  products?: CrmDealProduct[];
}

interface CatalogueImage {
  image?: string;
}

interface ItemDoc {
  custom_catalogue_type?: "Hotel" | "Activity" | "Soiree" | "Divers";
  custom_catalogue_reference?: string;
}

interface HotelDoc {
  hotel_name?: string;
  city?: string;
  category?: number;
  hotel_url?: string;
  description?: string;
  images?: CatalogueImage[];
}

interface ActivityDoc {
  activity_name?: string;
  type?: string;
  description?: string;
  difficulty?: string;
  images?: CatalogueImage[];
}

interface SoireeDoc {
  soiree_name?: string;
  subtitle?: string;
  description?: string;
  keywords?: string;
  images?: CatalogueImage[];
}

function authHeaders(apiKey: string, apiSecret: string) {
  return { Authorization: `token ${apiKey}:${apiSecret}` };
}

/** Frappe stores uploaded files as absolute-server-relative paths (e.g.
 *  "/private/files/x.jpg"); the browser needs a full URL. */
function resolveImageUrls(images: CatalogueImage[] | undefined): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => img.image)
    .filter((path): path is string => typeof path === "string" && path.length > 0)
    .map((path) => `${FRAPPE_BASE_URL}${path}`);
}

/** \n -> <br> so components can drop the converted string straight into HTML
 *  with a triple-stache, no Handlebars helper needed. */
function toHtmlParagraphs(text: string | undefined): string {
  if (!text) return "";
  return text.replace(/\r\n|\r|\n/g, "<br>");
}

async function fetchItem(
  productCode: string,
  apiKey: string,
  apiSecret: string
): Promise<ItemDoc | null> {
  try {
    const data = await getWithRetry<{ data: ItemDoc }>(
      `${FRAPPE_BASE_URL}/api/resource/Item/${encodeURIComponent(productCode)}`,
      { headers: authHeaders(apiKey, apiSecret), timeoutMs: 15_000 }
    );
    return data.data;
  } catch {
    return null;
  }
}

async function fetchCatalogueDoc<T>(
  doctype: string,
  reference: string,
  apiKey: string,
  apiSecret: string
): Promise<T | null> {
  try {
    const data = await getWithRetry<{ data: T }>(
      `${FRAPPE_BASE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(reference)}`,
      { headers: authHeaders(apiKey, apiSecret), timeoutMs: 15_000 }
    );
    return data.data;
  } catch {
    return null;
  }
}

function shapeHotel(id: string, doc: HotelDoc) {
  return {
    id,
    "hotel-name": doc.hotel_name ?? "",
    city: doc.city ?? "",
    category: doc.category ?? 0,
    "hotel-url": doc.hotel_url ?? "",
    description: toHtmlParagraphs(doc.description),
    images: resolveImageUrls(doc.images),
  };
}

function shapeActivity(id: string, doc: ActivityDoc) {
  return {
    id,
    "activity-name": doc.activity_name ?? "",
    type: doc.type ?? "",
    description: toHtmlParagraphs(doc.description),
    difficulty: doc.difficulty ?? "",
    images: resolveImageUrls(doc.images),
  };
}

function shapeSoiree(id: string, doc: SoireeDoc) {
  return {
    id,
    "soiree-name": doc.soiree_name ?? "",
    subtitle: doc.subtitle ?? "",
    description: toHtmlParagraphs(doc.description),
    keywords: doc.keywords ?? "",
    images: resolveImageUrls(doc.images),
  };
}

export const plugin = {
  name: "prefill-catalogue",
  description: "Resolves the CRM Deal's selected products into hotel/activity/soirée catalogue records.",
  trigger: "onMount" as const,
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
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

    const items = await Promise.all(productCodes.map((code) => fetchItem(code, apiKey, apiSecret)));

    const hotels: ReturnType<typeof shapeHotel>[] = [];
    const activities: ReturnType<typeof shapeActivity>[] = [];
    const soirees: ReturnType<typeof shapeSoiree>[] = [];

    await Promise.all(
      items.map(async (item) => {
        if (!item?.custom_catalogue_reference) return;
        const reference = item.custom_catalogue_reference;

        if (item.custom_catalogue_type === "Hotel") {
          const doc = await fetchCatalogueDoc<HotelDoc>("Hotel", reference, apiKey, apiSecret);
          if (doc) hotels.push(shapeHotel(reference, doc));
        } else if (item.custom_catalogue_type === "Activity") {
          const doc = await fetchCatalogueDoc<ActivityDoc>("Activity", reference, apiKey, apiSecret);
          if (doc) activities.push(shapeActivity(reference, doc));
        } else if (item.custom_catalogue_type === "Soiree") {
          const doc = await fetchCatalogueDoc<SoireeDoc>("Soiree", reference, apiKey, apiSecret);
          if (doc) soirees.push(shapeSoiree(reference, doc));
        }
        // "Divers" intentionally skipped — handled later per the user's instruction.
      })
    );

    const values: Record<string, any> = {};
    if (hotels.length) values["catalogue-hotels"] = hotels;
    if (activities.length) values["catalogue-activities"] = activities;
    if (soirees.length) values["catalogue-soirees"] = soirees;
    return values;
  },
};
