import path from "path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Shares the same DATABASE_URL as the app's own migrations — one physical
// database, this template's tables just live under their own Postgres schema
// (see schema.ts's `pgSchema(...)`), so nothing here can collide with the
// app's `proposals` table or another template's tables.
// Run via `npx drizzle-kit ... --config=templates/tendencia-event-proposal/db/drizzle.config.ts`
// from the repo root, so process.cwd() resolves correctly.
config({ path: path.resolve(process.cwd(), ".env.local") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add your remote Postgres connection string to .env.local.");
}

// drizzle-kit resolves `schema`/`out` relative to the CLI's cwd (repo root
// when invoked via `npx drizzle-kit --config=.../drizzle.config.ts`), not
// relative to this config file — so these are repo-root-relative, not sibling.
export default defineConfig({
  schema: "./templates/tendencia-event-proposal/db/schema.ts",
  out: "./templates/tendencia-event-proposal/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
