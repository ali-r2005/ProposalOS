import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { loadTemplateTable } from "@/lib/db/template-schema-loader";
import { describeTable, sanitizeValues } from "@/lib/db/table-introspect";
import { getDb } from "@/lib/db/client";
import { requireAdminRole } from "@/lib/auth/context";
import { toErrorResponse } from "@/lib/utils/error-handler";

const DEFAULT_LIMIT = 1000;

/**
 * GET /api/templates/[id]/data/[table] — generic list for any template-owned
 * table. Works for any template's any table: it resolves `table` against
 * whatever that template's own db/schema.ts exports (see
 * template-schema-loader.ts) and never hardcodes a column name.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  try {
    requireAdminRole(request);
    const { id, table: tableName } = await params;
    const template = await loadTemplate(id);
    const table = await loadTemplateTable(template, tableName);
    const columns = describeTable(table);

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const [rows, countRows] = await Promise.all([
      getDb().select().from(table).limit(limit).offset(offset),
      getDb().select({ count: sql<number>`count(*)::int` }).from(table),
    ]);

    return NextResponse.json({ rows, total: countRows[0]?.count ?? rows.length, columns });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/templates/[id]/data/[table] — generic create.
 * Body: `{ values: {...} }`, keyed by the table's JS column names.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  try {
    requireAdminRole(request);
    const { id, table: tableName } = await params;
    const template = await loadTemplate(id);
    const table = await loadTemplateTable(template, tableName);
    const columns = describeTable(table);

    const body = (await request.json()) as { values?: Record<string, unknown> };
    if (!body.values || typeof body.values !== "object" || Array.isArray(body.values)) {
      return NextResponse.json({ error: "Body must be `{ values: {...} }`" }, { status: 400 });
    }

    const values = sanitizeValues(columns, body.values);
    const [row] = await getDb().insert(table).values(values).returning();
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
