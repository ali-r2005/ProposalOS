"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { http, toErrorMessage } from "@/lib/utils/http";
import type { TemplateSummary } from "@/lib/engine/types";

interface ProposalRow {
  id: string;
  templateId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * List of previously generated proposals. Used both scoped to a single
 * template (`/templates/[id]/history`) and globally across all templates
 * (`/history`) — the `templateId` prop is the only difference.
 */
export default function ProposalHistory({ templateId }: { templateId?: string }) {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [templateNames, setTemplateNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    http
      .get<{ rows?: ProposalRow[]; total?: number; error?: string }>("/api/proposals", {
        params: templateId ? { templateId } : {},
      })
      .then(({ data }) => {
        if (data.rows) {
          setRows(data.rows);
          setTotal(data.total ?? data.rows.length);
        } else {
          setError(data.error ?? "Failed to load history");
        }
      })
      .catch((err) => setError(toErrorMessage(err, "Failed to load history")))
      .finally(() => setLoading(false));
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  // Only the global view mixes templates together, so only it needs the name map.
  useEffect(() => {
    if (templateId) return;
    http
      .get<TemplateSummary[]>("/api/templates")
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setTemplateNames(Object.fromEntries(data.map((t) => [t.id, t.name])));
        }
      })
      .catch(() => {});
  }, [templateId]);

  async function remove(id: string) {
    if (!confirm("Delete this proposal? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await http.delete(`/api/proposals/${id}`);
      load();
    } catch (err) {
      setError(toErrorMessage(err, "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && rows.length === 0) return <p className="text-[var(--app-muted)]">Loading…</p>;
  if (error && rows.length === 0) return <p className="text-red-400">Error: {error}</p>;
  if (rows.length === 0) return <p className="text-[var(--app-muted)]">No proposals yet.</p>;

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--app-muted)]">
        {total} proposal{total === 1 ? "" : "s"}
      </p>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--app-panel)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              {!templateId && <th className="px-4 py-2 font-medium">Template</th>}
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Updated</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--app-border)]">
                <td className="px-4 py-2">{row.title || `Untitled — ${formatDate(row.createdAt)}`}</td>
                {!templateId && (
                  <td className="px-4 py-2 text-[var(--app-muted)]">
                    {templateNames[row.templateId] ?? row.templateId}
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-2 text-[var(--app-muted)]">{formatDate(row.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-[var(--app-muted)]">{formatDate(row.updatedAt)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <Link href={`/proposal/${row.id}`} className="mr-3 text-[var(--app-accent)]">
                    Open
                  </Link>
                  <button
                    type="button"
                    disabled={deletingId === row.id}
                    onClick={() => remove(row.id)}
                    className="text-red-400 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
