"use client";

import { useCallback, useEffect, useState } from "react";
import { http, toErrorMessage } from "@/lib/utils/http";
import type { ColumnDescriptor } from "@/lib/db/table-introspect";
import { ContextEditor } from "@/components/ContextValueEditor";

type Row = Record<string, unknown>;

function defaultFor(dataType: string): unknown {
  switch (dataType) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "json":
      return {};
    default:
      return "";
  }
}

/** Compact single-line preview for a table cell — the full value opens in the editor panel. */
function preview(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.length ? `[${value.length} item${value.length === 1 ? "" : "s"}]` : "[]";
  if (typeof value === "object") return JSON.stringify(value);
  const s = String(value);
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

/**
 * Generic admin UI for any template's own database tables. It never knows
 * what a "hotel" or "activity" is — the table list, columns, and row editor
 * are all driven by runtime introspection from the CRUD API, reusing the
 * same type-driven ContextEditor built for the context editor.
 */
export default function TemplateAdmin({ templateId }: { templateId: string }) {
  const [tables, setTables] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnDescriptor[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    http
      .get<{ tables?: string[]; error?: string }>(`/api/templates/${templateId}/data`)
      .then(({ data }) => {
        if (data.tables) {
          setTables(data.tables);
          setActiveTable(data.tables[0] ?? null);
        } else {
          setError(data.error ?? "Failed to load tables");
        }
      })
      .catch((err) => setError(toErrorMessage(err, "Failed to load tables")))
      .finally(() => setLoading(false));
  }, [templateId]);

  const loadRows = useCallback(() => {
    if (!activeTable) return;
    setLoading(true);
    http
      .get<{ rows?: Row[]; total?: number; columns?: ColumnDescriptor[]; error?: string }>(
        `/api/templates/${templateId}/data/${activeTable}`
      )
      .then(({ data }) => {
        if (data.rows) {
          setRows(data.rows);
          setTotal(data.total ?? data.rows.length);
          setColumns(data.columns ?? []);
        } else {
          setError(data.error ?? "Failed to load rows");
        }
      })
      .catch((err) => setError(toErrorMessage(err, "Failed to load rows")))
      .finally(() => setLoading(false));
  }, [templateId, activeTable]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const pkKey = columns.find((c) => c.primary)?.key;

  function openNew() {
    setIsNew(true);
    setDraft(Object.fromEntries(columns.map((c) => [c.key, defaultFor(c.dataType)])));
    setSaveError(null);
  }

  function openEdit(row: Row) {
    setIsNew(false);
    setDraft({ ...row });
    setSaveError(null);
  }

  function closeEditor() {
    setDraft(null);
  }

  async function save() {
    if (!draft || !activeTable) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (isNew) {
        const { data } = await http.post<{ row?: Row; error?: string }>(
          `/api/templates/${templateId}/data/${activeTable}`,
          { values: draft },
          { validateStatus: () => true }
        );
        if (!data.row) {
          setSaveError(data.error ?? "Create failed");
          return;
        }
      } else {
        const pkValue = pkKey ? draft[pkKey] : undefined;
        const { data } = await http.put<{ row?: Row; error?: string }>(
          `/api/templates/${templateId}/data/${activeTable}/${encodeURIComponent(String(pkValue))}`,
          { values: draft },
          { validateStatus: () => true }
        );
        if (!data.row) {
          setSaveError(data.error ?? "Update failed");
          return;
        }
      }
      setDraft(null);
      loadRows();
    } catch (err) {
      setSaveError(toErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!activeTable || !pkKey) return;
    if (!confirm("Delete this row?")) return;
    try {
      await http.delete(`/api/templates/${templateId}/data/${activeTable}/${encodeURIComponent(String(row[pkKey]))}`);
      loadRows();
    } catch (err) {
      setError(toErrorMessage(err, "Delete failed"));
    }
  }

  if (loading && tables.length === 0) return <p className="text-[var(--app-muted)]">Loading…</p>;
  if (error && tables.length === 0) return <p className="text-red-400">Error: {error}</p>;
  if (tables.length === 0) {
    return <p className="text-[var(--app-muted)]">This template has no data tables.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {tables.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTable(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              t === activeTable
                ? "bg-[var(--app-accent)] text-white"
                : "border border-[var(--app-border)] text-[var(--app-muted)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--app-muted)]">
          {total} row{total === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-white"
        >
          + New row
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--app-panel)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-2 font-medium">
                  {c.key}
                </th>
              ))}
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-[var(--app-border)]">
                {columns.map((c) => (
                  <td key={c.key} className="max-w-[240px] truncate px-4 py-2">
                    {preview(row[c.key])}
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <button type="button" onClick={() => openEdit(row)} className="mr-3 text-[var(--app-accent)]">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(row)} className="text-red-400">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-[var(--app-muted)]">
                  No rows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {isNew ? `New ${activeTable}` : `Edit ${activeTable}`}
              </h3>
              <button type="button" onClick={closeEditor} className="text-sm text-[var(--app-muted)]">
                ✕
              </button>
            </div>
            <ContextEditor context={draft} onChange={(key, value) => setDraft((d) => (d ? { ...d, [key]: value } : d))} />
            {saveError && <p className="mt-4 text-sm text-red-400">{saveError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-lg bg-[var(--app-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? "Saving…" : isNew ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
