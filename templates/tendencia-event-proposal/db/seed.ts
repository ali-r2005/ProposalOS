// One-off seed script for this template's tables — the same mock rows the
// providers used to return from a hardcoded array, now the initial content of
// the real tables. Run once after `drizzle-kit migrate` creates the tables:
//
//   node templates/tendencia-event-proposal/db/seed.ts
//
import path from "path";
import { config } from "dotenv";
import { getDb } from "./client.ts";
import { activities, hotels, soirees } from "./schema.ts";

// Run standalone via `node` from the repo root, not through Next — load
// .env.local ourselves. Uses process.cwd() rather than __dirname: this file
// is parsed as an ES module (it uses import/export), and ESM has no __dirname.
config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const db = getDb();

  await db.insert(hotels).values([
    {
      id: "h1", name: "HILTON AL HOUARA RESORT & SPA", city: "Tanger", category: 5, price: 280, currency: "EUR", location: "Route d'Asilah",
      hotelUrl: "https://www.hilton.com/en/hotels/tngahhi-hilton-tangier-al-houara-resort-and-spa/",
      description: "Le Hilton Al Houara Resort & Spa est un hôtel 5 étoiles situé à Tanger, entre l'Atlantique et les montagnes du Rif. Chambres élégantes, spa, piscine extérieure, plage privée et golf à proximité — idéal pour les séjours de luxe et les événements professionnels.",
      images: ["assets/p1.png", "assets/p2.png", "assets/p3.png"],
    },
    {
      id: "h2", name: "FAIRMONT TAZI PALACE", city: "Tanger", category: 5, price: 320, currency: "EUR", location: "Boubana",
      hotelUrl: "https://www.fairmont.com/tangier/",
      description: "Le Fairmont Tazi Palace domine Tanger depuis les hauteurs de Boubana. Ancien palais restauré, il conjugue patrimoine, jardins luxuriants et service haut de gamme, avec des espaces événementiels d'exception.",
      images: ["assets/p4.png", "assets/p5.png", "assets/p6.png"],
    },
    {
      id: "h3", name: "HÔTEL KENZI SOLAZUR", city: "Tanger", category: 4, price: 180, currency: "EUR", location: "Baie de Tanger",
      hotelUrl: "https://www.kenzi-hotels.com/fr/kenzi-solazur",
      description: "Le Kenzi Solazur, 4 étoiles face à la baie de Tanger, offre un excellent rapport qualité-prix : chambres confortables, piscines et accès direct à la plage, parfait pour les groupes.",
      images: ["assets/p7.png", "assets/p1.png", "assets/p2.png"],
    },
    {
      id: "h4", name: "ROYAL MANSOUR", city: "Marrakech", category: 5, price: 600, currency: "EUR", location: "Hivernage",
      hotelUrl: "https://www.royalmansour.com/",
      description: "Le Royal Mansour Marrakech est un palace d'exception composé de riads privés, jardins andalous et spa somptueux. Une adresse mythique alliant artisanat marocain et raffinement absolu.",
      images: ["assets/p3.png", "assets/p4.png", "assets/p5.png"],
    },
    {
      id: "h5", name: "LA MAMOUNIA", city: "Marrakech", category: 5, price: 550, currency: "EUR", location: "Avenue Bab Jdid",
      hotelUrl: "https://www.mamounia.com/",
      description: "La Mamounia, palace légendaire de Marrakech, séduit par ses jardins centenaires, son architecture mauresque et ses restaurants d'exception — un lieu emblématique pour recevoir en grand.",
      images: ["assets/p6.png", "assets/p7.png", "assets/p1.png"],
    },
    {
      id: "h6", name: "RIAD KNIZA", city: "Marrakech", category: 4, price: 220, currency: "EUR", location: "Médina",
      hotelUrl: "https://www.riadkniza.com/",
      description: "Le Riad Kniza, maison d'hôtes 4 étoiles au cœur de la médina, offre une expérience intime et authentique : patios traditionnels, cuisine marocaine réputée et hospitalité familiale.",
      images: ["assets/p2.png", "assets/p3.png", "assets/p4.png"],
    },
  ]).onConflictDoNothing();

  await db.insert(activities).values([
    {
      id: "a1", name: "ATLAS ANIMATE", type: "indoor", category: "collaboratif",
      description: [
        "Dans ce défi créatif, les équipes réalisent des vidéos d'animation qui, une fois assemblées, forment un clip cohérent. Chaque équipe contribue à une partie de l'histoire, nécessitant collaboration et coordination.",
        "L'activité développe des compétences en communication et en gestion de projet tout en stimulant la créativité. Adaptée à vos besoins, elle permet de transmettre des messages tels que la promotion de produits, la mise en avant des objectifs commerciaux ou les valeurs d'entreprise.",
      ],
      video: "https://www.catalyst.ma/activites-teambuilding/team-building/animate",
      meta: "INDOOR - 10 TO 100 - COLLABORATIF",
      images: ["assets/p1.png", "assets/p2.png", "assets/p3.png"],
    },
    {
      id: "a2", name: "TANGER ENIGMA", type: "outdoor", category: "compétitif",
      description: [
        "Un city-game immersif à travers la médina de Tanger : énigmes, défis et exploration pour renforcer la cohésion d'équipe.",
        "Les participants progressent en équipe de point en point, résolvant des épreuves qui mêlent culture locale, observation et esprit de compétition dans une ambiance conviviale.",
      ],
      video: "https://www.catalyst.ma/activites-teambuilding/team-building/enigma",
      meta: "OUTDOOR - 10 TO 200 - COMPÉTITIF",
      images: ["assets/p4.png", "assets/p5.png", "assets/p6.png"],
    },
    {
      id: "a3", name: "ATLAS SPY MISSION", type: "outdoor", category: "compétitif",
      description: [
        "Mission d'espionnage grandeur nature dans les jardins et ruelles de Marrakech : coopération, stratégie et sens de l'observation.",
        "Chaque équipe reçoit une couverture et un objectif secret ; la réussite dépend de la communication, de la répartition des rôles et de la capacité à déjouer les autres agents.",
      ],
      video: "https://www.catalyst.ma/activites-teambuilding/team-building/spy-mission",
      meta: "OUTDOOR - 20 TO 150 - COMPÉTITIF",
      images: ["assets/p7.png", "assets/p1.png", "assets/p2.png"],
    },
    {
      id: "a4", name: "BLOOM AS ONE", type: "indoor", category: "collaboratif",
      description: [
        "Atelier créatif collaboratif autour d'une œuvre collective : chaque équipe contribue à une fresque commune symbolisant les valeurs de l'entreprise.",
        "Au-delà de la peinture, l'expérience met en scène l'écoute, le partage d'une vision et la construction d'un résultat qui n'a de sens qu'assemblé — une métaphore directe du travail d'équipe.",
      ],
      video: "https://www.catalyst.ma/activites-teambuilding/team-building/bloom",
      meta: "INDOOR - 10 TO 120 - COLLABORATIF",
      images: ["assets/p3.png", "assets/p4.png", "assets/p5.png"],
    },
  ]).onConflictDoNothing();

  await db.insert(soirees).values([
    {
      id: "s1", name: "ATLAS CAPITAL GALA", subtitle: "TANGER SPIRIT : CÉLÉBRER & RÉUSSIR",
      description: [
        "Offrez à vos invités une soirée d'exception, pensée comme un voyage sensoriel entre Tanger et l'Espagne. Dans une atmosphère intime et chaleureuse, l'expérience mêle saveurs ibériques réinventées, touches méditerranéennes et une ambiance festive propice à la convivialité et au partage.",
        "Nichée au cœur d'une élégante demeure arabo-andalouse dotée d'une terrasse à ciel ouvert offrant une vue panoramique sur la médina et la baie de Tanger, cette soirée prend place dans un décor authentique et harmonieux, juste en face de la Kasbah.",
        "La proposition culinaire revisite les classiques marocains en les fusionnant avec l'esprit des tapas espagnols : petites portions raffinées, assiettes à partager, notes parfumées et généreuses. Chaque bouchée devient une rencontre entre deux rives.",
        "Pour sublimer l'instant, une animation rythmée par des sonorités chaudes et entraînantes donne vie à la soirée : mélodies andalouses, accents folkloriques marocains et rythmes envoûtants créent un véritable pont culturel, invitant les convives à célébrer, vibrer et réussir ensemble.",
      ],
      image: "assets/p5.png",
    },
    {
      id: "s2", name: "NUIT DES MILLE ET UNE LUMIÈRES", subtitle: "MARRAKECH : L'ÉLÉGANCE ORIENTALE",
      description: [
        "Plongez vos invités dans la magie de Marrakech le temps d'un dîner de gala au cœur d'un palais aux jardins illuminés, où l'élégance orientale se dévoile sous les étoiles.",
        "Dans un décor féerique de lanternes, de tapis et de fontaines, la gastronomie marocaine raffinée se déguste au rythme d'animations andalouses et de spectacles envoûtants.",
        "Des saveurs d'exception, une scénographie somptueuse et un service haut de gamme se conjuguent pour offrir à vos convives une expérience inoubliable, entre tradition et raffinement.",
      ],
      image: "assets/p6.png",
    },
  ]).onConflictDoNothing();

  console.log("Seed complete: hotels, activities, soirees.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
