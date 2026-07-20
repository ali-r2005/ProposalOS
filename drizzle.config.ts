import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit's CLI only auto-loads `.env` — load Next.js's `.env.local` too so
// there's a single source of truth for DATABASE_URL.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add your remote Postgres connection string to .env.local.");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
