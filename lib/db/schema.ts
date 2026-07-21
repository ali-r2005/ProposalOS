import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Engine-owned persistence for generated presentations — replaces the old
 * in-memory Map in proposal-store.ts. Static and known ahead of time, unlike
 * template-owned schemas (templates/[id]/db/schema.ts), which the engine
 * discovers at runtime and never hardcodes column names for.
 */
export const proposals = pgTable("proposals", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull(),
  title: text("title"),
  html: text("html").notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
