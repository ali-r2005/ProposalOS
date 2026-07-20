import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
// Relative import (not the usual `@/...` alias): templates reach this file via
// Node's native dynamic import (see provider-loader.ts), which only
// understands real module resolution — not the tsconfig `@/` path alias.
import { EngineError } from "../utils/error-handler.ts";

/**
 * Single pooled connection to the (remote) Postgres instance, pinned to
 * globalThis so Next.js dev-mode module reloads reuse it instead of opening a
 * fresh pool per reload — same HMR-safety pattern as the old proposal-store
 * Map and the provider-loader's cached imports. This matters more with a
 * remote DB than a local one: hosted Postgres plans cap concurrent
 * connections, often in the single digits on free tiers.
 *
 * Uses the `postgres` (postgres-js) driver rather than `pg`, with `prepare:
 * false` — Supabase's pooler runs PgBouncer in "Transaction" mode, which does
 * not support prepared statements; `pg`/node-postgres relies on them, which
 * silently hangs against that pooler (per Supabase's own Drizzle quickstart).
 */
const globalRef = globalThis as unknown as { __dbClient?: ReturnType<typeof postgres> };

function createClient(): ReturnType<typeof postgres> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new EngineError(
      "DATABASE_URL is not set. Add your remote Postgres connection string to .env.local.",
      500
    );
  }

  // Local/dev databases usually don't terminate TLS; remote hosted providers
  // (Neon, Supabase, RDS, Railway, ...) almost always require it.
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  return postgres(connectionString, {
    prepare: false,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}

/**
 * Lazily creates (and caches) the pooled Drizzle client on first use. Kept as
 * a function rather than a module-level constant so a missing DATABASE_URL
 * throws inside the caller's own try/catch (a route handler) instead of at
 * module-import time, which would crash before any error handling runs.
 */
export function getDb(): PostgresJsDatabase {
  const client = (globalRef.__dbClient ??= createClient());
  return drizzle(client);
}
