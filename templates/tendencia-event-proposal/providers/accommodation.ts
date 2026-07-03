// Accommodation provider — returns hotels for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.

interface HotelRecord {
  id: string;
  name: string;
  city: string;
  category: number; // star rating (1–5)
  price: number;
  currency: string;
  location: string;
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

const DATA: Record<string, HotelRecord[]> = {
  tangier: [
    { id: "h1", name: "HILTON AL HOUARA RESORT & SPA", city: "Tanger", category: 5, price: 280, currency: "EUR", location: "Route d'Asilah" },
    { id: "h2", name: "FAIRMONT TAZI PALACE", city: "Tanger", category: 5, price: 320, currency: "EUR", location: "Boubana" },
    { id: "h3", name: "HÔTEL KENZI SOLAZUR", city: "Tanger", category: 4, price: 180, currency: "EUR", location: "Baie de Tanger" },
  ],
  marrakech: [
    { id: "h4", name: "ROYAL MANSOUR", city: "Marrakech", category: 5, price: 600, currency: "EUR", location: "Hivernage" },
    { id: "h5", name: "LA MAMOUNIA", city: "Marrakech", category: 5, price: 550, currency: "EUR", location: "Avenue Bab Jdid" },
    { id: "h6", name: "RIAD KNIZA", city: "Marrakech", category: 4, price: 220, currency: "EUR", location: "Médina" },
  ],
};

export const provider = {
  name: "accommodation",
  description: "Fetches hotel options for the event destination (mock data).",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const destination = String(context.destination ?? "").toLowerCase();
    const key = Object.keys(DATA).find((city) => destination.includes(city)) ?? "tangier";
    const hotels = DATA[key].map(shape);
    return { hotels };
  },
};
