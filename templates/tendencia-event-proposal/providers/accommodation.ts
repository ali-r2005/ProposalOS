// Accommodation provider — hotel options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Modes: catalog (search/paginate via q/limit/offset + total) when no selection,
// or selection (filter to `selected-accommodation` ids, in the user's order).

interface HotelRecord {
  id: string;
  name: string;
  city: string;
  category: number; // star rating (1–5)
  price: number;
  currency: string;
  location: string;
  "hotel-url": string;
  description: string;
  images: string[]; // showcase photos (asset paths or URLs)
}

// `stars` is exposed as an array so components can `{{#each}}` over it to draw
// one star icon per rating point.
function shape(hotel: HotelRecord) {
  return {
    ...hotel,
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

const DATA: HotelRecord[] = [
  {
    id: "h1", name: "HILTON AL HOUARA RESORT & SPA", city: "Tanger", category: 5, price: 280, currency: "EUR", location: "Route d'Asilah",
    "hotel-url": "https://www.hilton.com/en/hotels/tngahhi-hilton-tangier-al-houara-resort-and-spa/",
    description: "Le Hilton Al Houara Resort & Spa est un hôtel 5 étoiles situé à Tanger, entre l'Atlantique et les montagnes du Rif. Chambres élégantes, spa, piscine extérieure, plage privée et golf à proximité — idéal pour les séjours de luxe et les événements professionnels.",
    images: ["assets/p1.png", "assets/p2.png", "assets/p3.png"],
  },
  {
    id: "h2", name: "FAIRMONT TAZI PALACE", city: "Tanger", category: 5, price: 320, currency: "EUR", location: "Boubana",
    "hotel-url": "https://www.fairmont.com/tangier/",
    description: "Le Fairmont Tazi Palace domine Tanger depuis les hauteurs de Boubana. Ancien palais restauré, il conjugue patrimoine, jardins luxuriants et service haut de gamme, avec des espaces événementiels d'exception.",
    images: ["assets/p4.png", "assets/p5.png", "assets/p6.png"],
  },
  {
    id: "h3", name: "HÔTEL KENZI SOLAZUR", city: "Tanger", category: 4, price: 180, currency: "EUR", location: "Baie de Tanger",
    "hotel-url": "https://www.kenzi-hotels.com/fr/kenzi-solazur",
    description: "Le Kenzi Solazur, 4 étoiles face à la baie de Tanger, offre un excellent rapport qualité-prix : chambres confortables, piscines et accès direct à la plage, parfait pour les groupes.",
    images: ["assets/p7.png", "assets/p1.png", "assets/p2.png"],
  },
  {
    id: "h4", name: "ROYAL MANSOUR", city: "Marrakech", category: 5, price: 600, currency: "EUR", location: "Hivernage",
    "hotel-url": "https://www.royalmansour.com/",
    description: "Le Royal Mansour Marrakech est un palace d'exception composé de riads privés, jardins andalous et spa somptueux. Une adresse mythique alliant artisanat marocain et raffinement absolu.",
    images: ["assets/p3.png", "assets/p4.png", "assets/p5.png"],
  },
  {
    id: "h5", name: "LA MAMOUNIA", city: "Marrakech", category: 5, price: 550, currency: "EUR", location: "Avenue Bab Jdid",
    "hotel-url": "https://www.mamounia.com/",
    description: "La Mamounia, palace légendaire de Marrakech, séduit par ses jardins centenaires, son architecture mauresque et ses restaurants d'exception — un lieu emblématique pour recevoir en grand.",
    images: ["assets/p6.png", "assets/p7.png", "assets/p1.png"],
  },
  {
    id: "h6", name: "RIAD KNIZA", city: "Marrakech", category: 4, price: 220, currency: "EUR", location: "Médina",
    "hotel-url": "https://www.riadkniza.com/",
    description: "Le Riad Kniza, maison d'hôtes 4 étoiles au cœur de la médina, offre une expérience intime et authentique : patios traditionnels, cuisine marocaine réputée et hospitalité familiale.",
    images: ["assets/p2.png", "assets/p3.png", "assets/p4.png"],
  },
];

// DB-style row filter: keep rows whose `city` appears in the destination text
// (e.g. destination "Marrakech, Morocco" matches the row with city "Marrakech").
// Equivalent to `WHERE lower($destination) LIKE '%' || lower(city) || '%'`.
function forDestination(context: Record<string, any>): HotelRecord[] {
  const destination = String(context.destination ?? "").toLowerCase();
  return DATA.filter((row) => destination.includes(row.city.toLowerCase()));
}

export const provider = {
  name: "accommodation",
  description: "Hotel options for the destination — catalog + selection (mock data).",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const all = forDestination(context);

    // Selection mode: return only the chosen hotels, in the user's order.
    const selected = context["selected-accommodation"];
    if (Array.isArray(selected)) {
      const byId = new Map(all.map((x) => [x.id, x]));
      const chosen = selected
        .map((id) => byId.get(String(id)))
        .filter((x): x is HotelRecord => Boolean(x))
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
