import { getTableColumns, type Column } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { EngineError } from "@/lib/utils/error-handler";

/**
 * Generic, runtime column metadata for any Drizzle table — this is what lets
 * the CRUD route (and, later, an admin UI) work for *any* template's *any*
 * table without the engine ever hardcoding a column name. `key` is the JS
 * property name used in API payloads (matches what `.values()`/`.set()`
 * expect); `column` is only the underlying DB column name, for display.
 */
export interface ColumnDescriptor {
  key: string;
  column: string;
  dataType: string;
  notNull: boolean;
  primary: boolean;
}

export function describeTable(table: PgTable): ColumnDescriptor[] {
  const columns = getTableColumns(table);
  return Object.entries(columns).map(([key, col]) => ({
    key,
    column: col.name,
    dataType: col.dataType,
    notNull: col.notNull,
    primary: col.primary,
  }));
}

/** The table's primary-key column, as both a queryable Column and its JS key/dataType. */
export function primaryKeyOf(table: PgTable): { key: string; column: Column; dataType: string } {
  const columns = getTableColumns(table);
  for (const [key, column] of Object.entries(columns)) {
    if (column.primary) return { key, column, dataType: column.dataType };
  }
  throw new EngineError(`Table "${table}" has no primary key column`, 500);
}

/** Drop any key that isn't a real column — untrusted request bodies shouldn't
 *  reach `.values()`/`.set()` unfiltered. */
export function sanitizeValues(
  columns: ColumnDescriptor[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const keys = new Set(columns.map((c) => c.key));
  return Object.fromEntries(Object.entries(values).filter(([k]) => keys.has(k)));
}

/** Coerce a URL path param (always a string) to the primary key's real type. */
export function coercePrimaryKey(raw: string, dataType: string): string | number {
  return dataType === "number" ? Number(raw) : raw;
}
