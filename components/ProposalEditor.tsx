"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { http, toErrorMessage } from "@/lib/utils/http";
import { ContextEditor } from "@/components/ContextValueEditor";

export default function ProposalEditor({ proposalId }: { proposalId: string }) {
  const [context, setContext] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    http
      .get<{ context?: Record<string, unknown>; error?: string }>(
        `/api/proposals/${proposalId}/context`
      )
      .then(({ data }) => {
        if (data.context) setContext(data.context);
        else setError(data.error ?? "Failed to load context");
      })
      .catch((err) => setError(toErrorMessage(err, "Failed to load context")))
      .finally(() => setLoading(false));
  }, [proposalId]);

  function updateKey(key: string, value: unknown) {
    setContext((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function save() {
    if (!context) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { data } = await http.put<{ success?: boolean; error?: string }>(
        `/api/proposals/${proposalId}/context`,
        { context },
        { validateStatus: () => true }
      );
      if (!data.success) {
        setError(data.error ?? "Save failed");
        return;
      }
      setSaved(true);
      // Force the preview iframe to refetch the re-rendered html.
      setPreviewKey((k) => k + 1);
    } catch (err) {
      setError(toErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold">Edit proposal</h1>
          <p className="text-xs text-[var(--app-muted)]">{proposalId}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/proposal/${proposalId}`}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs"
          >
            Back to preview
          </Link>
          <Link
            href={`/proposal/${proposalId}/design`}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs"
          >
            Visual editor
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving || !context}
            className="rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save & refresh preview"}
          </button>
        </div>
      </header>

      {error && (
        <p className="border-b border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[420px] shrink-0 overflow-y-auto border-r border-[var(--app-border)] p-4">
          {loading && <p className="text-sm text-[var(--app-muted)]">Loading context…</p>}
          {context && <ContextEditor context={context} onChange={updateKey} />}
        </div>
        <iframe
          key={previewKey}
          title="Proposal preview"
          src={`/api/proposals/${proposalId}`}
          className="w-full flex-1 border-0 bg-[#333]"
        />
      </div>
    </div>
  );
}
