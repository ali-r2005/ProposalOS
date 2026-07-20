import { integer, pgSchema, text } from "drizzle-orm/pg-core";

// Every table lives under this template's own Postgres schema/namespace, so
// it can never collide with another template's tables in the same database
// (e.g. a different template's own "hotels" table with different columns).
// Must be exported (not just used locally) — drizzle-kit only emits a
// `CREATE SCHEMA` statement for a pgSchema it can see as a top-level export.
export const schema = pgSchema("tmpl_tendencia_event_proposal");

export const hotels = schema.table("hotels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  category: integer("category").notNull(), // star rating (1-5)
  price: integer("price").notNull(),
  currency: text("currency").notNull(),
  location: text("location").notNull(),
  hotelUrl: text("hotel_url").notNull(),
  description: text("description").notNull(),
  images: text("images").array().notNull(),
});

export const activities = schema.table("activities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "indoor" | "outdoor"
  category: text("category").notNull(), // e.g. "collaboratif" | "compétitif"
  description: text("description").array().notNull(), // one entry per paragraph
  video: text("video").notNull(),
  meta: text("meta").notNull(),
  images: text("images").array().notNull(),
});

export const soirees = schema.table("soirees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull(),
  description: text("description").array().notNull(), // one entry per paragraph
  image: text("image").notNull(),
});
