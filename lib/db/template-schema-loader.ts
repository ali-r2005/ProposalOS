import path from "path";
import { promises as fs } from "fs";
import { pathToFileURL } from "url";
import { is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import type { LoadedTemplate } from "@/lib/engine/types";
import { EngineError } from "@/lib/utils/error-handler";

/**
 * Native dynamic import that webpack must NOT try to bundle — the target is a
 * template-authored `.ts` file discovered at runtime, outside the app's module
 * graph. Same approach as provider-loader.ts.
 */
const nativeImport: (specifier: string) => Promise<any> = new Function(
  "specifier",
  "return import(specifier);"
) as (specifier: string) => Promise<any>;

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load `db/schema.{ts,js,mjs}` from a template and return every exported
 * Drizzle Postgres table, keyed by its export name. The engine only learns
 * *that* a table exists here — it never parses column names, so any template
 * can declare whatever business tables it wants (hotels, activities, rooms,
 * ...) without the engine changing. Each template is expected to scope its
 * tables under its own Postgres schema/namespace (e.g. `pgSchema("tmpl_...")`)
 * so two templates can both have a `hotels` table without colliding.
 */
export async function loadTemplateSchema(template: LoadedTemplate): Promise<Record<string, PgTable>> {
  if (!template.paths.dbDir) return {};

  // On production/serverless, prefer compiled .js over .ts (Node can't execute TS natively)
  const exts = process.env.NODE_ENV === "production" ? [".js", ".mjs", ".ts"] : [".ts", ".js", ".mjs"];

  for (const ext of exts) {
    const file = path.join(template.paths.dbDir, `schema${ext}`);
    if (!(await exists(file))) continue;

    const mod = await nativeImport(pathToFileURL(file).href + `?v=${Date.now()}`);
    // Compiled templates/*.js are CommonJS; Node's ESM interop can't
    // statically detect SWC's custom export helper, so named exports land
    // inside `mod.default` instead of on `mod` directly. Unwrap it.
    const ns = mod.default && typeof mod.default === "object" ? mod.default : mod;
    const tables: Record<string, PgTable> = {};
    for (const [key, value] of Object.entries(ns)) {
      if (is(value, PgTable)) tables[key] = value;
    }
    return tables;
  }

  throw new EngineError(`Template "${template.id}" has a db/ directory but no schema.ts`, 500);
}

/** Look up one table by its exported name (used by the generic CRUD route). */
export async function loadTemplateTable(template: LoadedTemplate, tableName: string): Promise<PgTable> {
  const tables = await loadTemplateSchema(template);
  const table = tables[tableName];
  if (!table) {
    throw new EngineError(`Table "${tableName}" not found in template "${template.id}"`, 404);
  }
  return table;
}
