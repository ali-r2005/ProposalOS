// Accommodation provider — shapes the form's `catalogue-hotels` records (filled
// by the prefill-catalogue plugin from the CRM Deal, editable by the user) into
// the `hotels` collection the accommodation-* components expect.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Unlike the Drizzle-backed template's accommodation.ts, this template has no
// database — the "catalogue" IS the form input, already resolved by the plugin
// before the wizard renders. This provider only reshapes it, never fetches.

interface CatalogueHotel {
  id?: string;
  "hotel-name"?: string;
  city?: string;
  category?: number;
  "hotel-url"?: string;
  description?: string;
  images?: string[];
}

// `stars` is exposed as an array so components can `{{#each}}` over it to draw
// one star icon per rating point — same convention as the Drizzle template's
// accommodation provider.
function shape(hotel: CatalogueHotel, index: number) {
  const category = Number(hotel.category) || 0;
  return {
    id: hotel.id ?? String(index),
    option: index + 1,
    city: hotel.city ?? "",
    category,
    "hotel-url": hotel["hotel-url"] ?? "",
    description: hotel.description ?? "",
    images: Array.isArray(hotel.images) ? hotel.images : [],
    hotel: {
      name: hotel["hotel-name"] ?? "",
      stars: Array.from({ length: category }, () => 1),
    },
  };
}

export const provider = {
  name: "accommodation",
  description: "Shapes form-submitted catalogue hotels for the accommodation components.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const rows: CatalogueHotel[] = Array.isArray(context["catalogue-hotels"])
      ? context["catalogue-hotels"]
      : [];
    return { hotels: rows.map(shape) };
  },
};
