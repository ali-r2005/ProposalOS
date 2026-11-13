"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { http, toErrorMessage } from "@/lib/utils/http";
import { ContextEditor } from "@/components/ContextValueEditor";
import { useProposalName } from "@/components/useProposalName";

const PANEL_DEFAULT = 420;
const PANEL_MIN = 280;
/** Space always left for the preview. */
const PREVIEW_MIN = 320;
const PANEL_WIDTH_KEY = "proposalEditor.panelWidth";

function clampPanel(width: number): number {
  const max = Math.max(PANEL_MIN, window.innerWidth - PREVIEW_MIN);
  return Math.min(max, Math.max(PANEL_MIN, Math.round(width)));
}

export default function ProposalEditor({ proposalId }: { proposalId: string }) {
  const proposalName = useProposalName(proposalId);
  const [context, setContext] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const [resizing, setResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Restore the width chosen last time (per browser).
  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(PANEL_WIDTH_KEY));
      if (stored) setPanelWidth(clampPanel(stored));
    } catch {
      // Storage unavailable: keep the default width.
    }
  }, []);

  function savePanelWidth(width: number) {
    setPanelWidth(width);
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(width));
    } catch {
      // Storage unavailable: the width just isn't remembered.
    }
  }

  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const left = panelRef.current?.getBoundingClientRect().left ?? 0;
    setResizing(true);
    const onMove = (ev: PointerEvent) => setPanelWidth(clampPanel(ev.clientX - left));
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setResizing(false);
      savePanelWidth(clampPanel(ev.clientX - left));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function resizeWithKeys(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 80 : 20;
    if (e.key === "ArrowLeft") savePanelWidth(clampPanel(panelWidth - step));
    else if (e.key === "ArrowRight") savePanelWidth(clampPanel(panelWidth + step));
    else return;
    e.preventDefault();
  }

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
          <p className="text-xs text-[var(--app-muted)]">{proposalName}</p>
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

      <div className={`flex flex-1 overflow-hidden ${resizing ? "cursor-col-resize select-none" : ""}`}>
        <div
          ref={panelRef}
          className="shrink-0 overflow-y-auto p-4"
          style={{ width: panelWidth }}
        >
          {loading && <p className="text-sm text-[var(--app-muted)]">Loading context…</p>}
          {context && <ContextEditor context={context} onChange={updateKey} />}
        </div>
        {/* Drag to resize the form; double-click resets; arrow keys when focused. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the form panel"
          aria-valuenow={panelWidth}
          tabIndex={0}
          title="Drag to resize · double-click to reset"
          onPointerDown={startResize}
          onDoubleClick={() => savePanelWidth(clampPanel(PANEL_DEFAULT))}
          onKeyDown={resizeWithKeys}
          className={`w-1.5 shrink-0 cursor-col-resize border-r border-[var(--app-border)] transition-colors hover:bg-[var(--app-accent)] focus-visible:bg-[var(--app-accent)] focus-visible:outline-none ${resizing ? "bg-[var(--app-accent)]" : "bg-[var(--app-panel)]"}`}
        />
        <iframe
          key={previewKey}
          title="Proposal preview"
          src={`/api/proposals/${proposalId}`}
          // While dragging, the iframe would swallow the pointer events.
          className={`w-full flex-1 border-0 bg-[#333] ${resizing ? "pointer-events-none" : ""}`}
        />
      </div>
    </div>
  );
}
