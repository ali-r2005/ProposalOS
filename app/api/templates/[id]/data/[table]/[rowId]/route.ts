import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { loadTemplate } from "@/lib/engine/core/template-loader";
import { loadTemplateTable } from "@/lib/db/template-schema-loader";
import { coercePrimaryKey, describeTable, primaryKeyOf, sanitizeValues } from "@/lib/db/table-introspect";
import { getDb } from "@/lib/db/client";
import { requireAdminRole } from "@/lib/auth/context";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * PUT /api/templates/[id]/data/[table]/[rowId] — generic update by primary key.
 * Body: `{ values: {...} }`, keyed by the table's JS column names.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; table: string; rowId: string }> }
) {
  try {
    requireAdminRole(request);
    const { id, table: tableName, rowId } = await params;
    const template = await loadTemplate(id);
    const table = await loadTemplateTable(template, tableName);
    const columns = describeTable(table);
    const pk = primaryKeyOf(table);

    const body = (await request.json()) as { values?: Record<string, unknown> };
    if (!body.values || typeof body.values !== "object" || Array.isArray(body.values)) {
      return NextResponse.json({ error: "Body must be `{ values: {...} }`" }, { status: 400 });
    }

    const values = sanitizeValues(columns, body.values);
    const pkValue = coercePrimaryKey(rowId, pk.dataType);

    const [row] = await getDb().update(table).set(values).where(eq(pk.column, pkValue)).returning();
    if (!row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }
    return NextResponse.json({ row });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/** DELETE /api/templates/[id]/data/[table]/[rowId] — generic delete by primary key. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; table: string; rowId: string }> }
) {
  try {
    requireAdminRole(request);
    const { id, table: tableName, rowId } = await params;
    const template = await loadTemplate(id);
    const table = await loadTemplateTable(template, tableName);
    const pk = primaryKeyOf(table);
    const pkValue = coercePrimaryKey(rowId, pk.dataType);

    const [row] = await getDb().delete(table).where(eq(pk.column, pkValue)).returning();
    if (!row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
