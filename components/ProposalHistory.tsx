"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { http, toErrorMessage } from "@/lib/utils/http";
import type { TemplateSummary } from "@/lib/engine/types";
import { useLocale } from "@/components/LocaleProvider";

interface ProposalRow {
  id: string;
  templateId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * List of previously generated proposals. Used both scoped to a single
 * template (`/templates/[id]/history`) and globally across all templates
 * (`/history`) — the `templateId` prop is the only difference.
 */
export default function ProposalHistory({ templateId }: { templateId?: string }) {
  const { t } = useLocale();
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [templateNames, setTemplateNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [templateId]);

  const load = useCallback(() => {
    setLoading(true);
    http
      .get<{ rows?: ProposalRow[]; total?: number; error?: string }>("/api/proposals", {
        params: { ...(templateId ? { templateId } : {}), limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      })
      .then(({ data }) => {
        if (data.rows) {
          const count = data.total ?? data.rows.length;
          // Deleting the last row of the last page leaves it empty — step back to the new last page.
          if (data.rows.length === 0 && page > 0) {
            setPage(Math.max(Math.ceil(count / PAGE_SIZE) - 1, 0));
            return;
          }
          setRows(data.rows);
          setTotal(count);
          setError(null);
        } else {
          setError(data.error ?? "Failed to load history");
        }
      })
      .catch((err) => setError(toErrorMessage(err, t("history.loadFailed"))))
      .finally(() => setLoading(false));
  }, [templateId, page, t]);

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
    if (!confirm(t("history.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      await http.delete(`/api/proposals/${id}`);
      load();
    } catch (err) {
      setError(toErrorMessage(err, t("history.deleteFailed")));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && rows.length === 0) return <p className="text-[var(--app-muted)]">{t("history.loading")}</p>;
  if (error && rows.length === 0) return <p className="text-red-400">{t("history.error", { message: error })}</p>;
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  if (rows.length === 0) return <p className="text-[var(--app-muted)]">{t("history.empty")}</p>;

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--app-muted)]">
        {t(total === 1 ? "history.count" : "history.count.plural", { count: total })}
      </p>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--app-panel)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">{t("history.column.name")}</th>
              {!templateId && <th className="px-4 py-2 font-medium">{t("history.column.template")}</th>}
              <th className="px-4 py-2 font-medium">{t("history.column.created")}</th>
              <th className="px-4 py-2 font-medium">{t("history.column.updated")}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--app-border)]">
                <td className="px-4 py-2">
                  {row.title || t("history.untitled", { date: formatDate(row.createdAt) })}
                </td>
                {!templateId && (
                  <td className="px-4 py-2 text-[var(--app-muted)]">
                    {templateNames[row.templateId] ?? row.templateId}
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-2 text-[var(--app-muted)]">{formatDate(row.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-[var(--app-muted)]">{formatDate(row.updatedAt)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <Link href={`/proposal/${row.id}`} className="mr-3 text-[var(--app-accent)]">
                    {t("history.open")}
                  </Link>
                  <button
                    type="button"
                    disabled={deletingId === row.id}
                    onClick={() => remove(row.id)}
                    className="text-red-400 disabled:opacity-40"
                  >
                    {t("history.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 disabled:opacity-40"
          >
            {t("history.prev")}
          </button>
          <span className="text-[var(--app-muted)]">{t("history.page", { page: page + 1, pages })}</span>
          <button
            type="button"
            disabled={page >= pages - 1 || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 disabled:opacity-40"
          >
            {t("history.next")}
          </button>
        </div>
      )}
    </div>
  );
}
