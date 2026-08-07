// Accommodation provider — hotel options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Modes: catalog (search/paginate via q/limit/offset + total) when no selection,
// or selection (filter to `selected-accommodation` ids, in the user's order).

import { fetchDocs } from "../db/client.ts";

/** DocType this provider reads. Must match db/doctypes.json. */
const DOCTYPE = "Proposal Hotel";

/** Fields stored as Frappe JSON (were Postgres text[] columns). */
const JSON_FIELDS = ["images"];

/**
 * Raw Frappe document. Fieldnames are snake_case, and `name` is Frappe's
 * primary key — which is why the hotel's own label is `hotel_name`: a DocType
 * cannot have a field called `name`.
 */
interface HotelDoc {
  name: string;
  hotel_name: string;
  city: string;
  category: number; // star rating (1–5)
  price: number;
  currency: string;
  location: string;
  hotel_url: string;
  description: string;
  images: string[];
}

interface HotelRow {
  id: string;
  name: string;
  city: string;
  category: number;
  price: number;
  currency: string;
  location: string;
  hotelUrl: string;
  description: string;
  images: string[];
}

/**
 * Frappe fieldnames -> the camelCase shape the rest of this template expects.
 * Deliberately kept here rather than in the engine: which DocType field maps
 * to which context key is a template concern, and the engine must stay
 * agnostic about both.
 */
function fromDoc(doc: HotelDoc): HotelRow {
  return {
    id: doc.name,
    name: doc.hotel_name,
    city: doc.city,
    category: Number(doc.category ?? 0),
    price: Number(doc.price ?? 0),
    currency: doc.currency,
    location: doc.location,
    hotelUrl: doc.hotel_url,
    description: doc.description,
    images: Array.isArray(doc.images) ? doc.images : [],
  };
}

// `stars` is exposed as an array so components can `{{#each}}` over it to draw
// one star icon per rating point. `hotel-url` is hyphenated (not `hotelUrl`)
// because that's the literal key the component binds with `{{[hotel-url]}}`.
function shape(hotel: HotelRow) {
  return {
    id: hotel.id,
    name: hotel.name,
    city: hotel.city,
    category: hotel.category,
    price: hotel.price,
    currency: hotel.currency,
    location: hotel.location,
    "hotel-url": hotel.hotelUrl,
    description: hotel.description,
    images: hotel.images,
    hotel: {
      name: hotel.name,
      stars: Array.from({ length: hotel.category }, () => 1),
    },
  };
}

/** Add a 1-based `option` number reflecting the item's position in the list. */
function withOption<T>(rows: T[], start = 0): (T & { option: number })[] {
  return rows.map((row, i) => ({ ...row, option: start + i + 1 }));
}

// Row filter: keep rows whose `city` appears in the destination text (e.g.
// destination "Marrakech, Morocco" matches the row with city "Marrakech").
function forDestination(rows: HotelRow[], context: Record<string, any>): HotelRow[] {
  const destination = String(context.destination ?? "").toLowerCase();
  return rows.filter((row) => destination.includes(row.city.toLowerCase()));
}

export const provider = {
  name: "accommodation",
  description: "Hotel options for the destination.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const docs = await fetchDocs<HotelDoc>(DOCTYPE, JSON_FIELDS);
    const all = forDestination(docs.map(fromDoc), context);

    // Selection mode: return only the chosen hotels, in the user's order.
    const selected = context["selected-accommodation"];
    if (Array.isArray(selected)) {
      const byId = new Map(all.map((x) => [x.id, x]));
      const chosen = selected
        .map((id) => byId.get(String(id)))
        .filter((x): x is HotelRow => Boolean(x))
        .map(shape);
      return { hotels: withOption(chosen) };
    }

    // Catalog mode: optional name search, then paginate.
    const q = String(context.q ?? "").toLowerCase();
    const filtered = q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
    const offset = Number.isFinite(context.offset) ? Number(context.offset) : 0;
    const limit = Number.isFinite(context.limit) ? Number(context.limit) : filtered.length;
    const page = filtered.slice(offset, offset + limit).map(shape);
    return { hotels: withOption(page, offset), total: filtered.length };
  },
};
