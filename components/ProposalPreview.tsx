"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { http, toErrorMessage } from "@/lib/utils/http";

export default function ProposalPreview({ proposalId }: { proposalId: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Fetch the server-rendered PDF (headless Chrome) and trigger a file download.
  async function exportPdf() {
    setExporting(true);
    setExportError(null);
    try {
      const { data } = await http.get<Blob>(`/api/proposals/${proposalId}/pdf`, {
        responseType: "blob",
        timeout: 90_000,
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${proposalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(toErrorMessage(err, "PDF export failed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold">Proposal preview</h1>
          <p className="text-xs text-[var(--app-muted)]">{proposalId}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/proposal/${proposalId}/edit`}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs"
          >
            Edit proposal
          </Link>
          <Link
            href={`/proposal/${proposalId}/design`}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs"
          >
            Visual editor
          </Link>
          <a
            href={`/api/proposals/${proposalId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs"
          >
            Open in new tab
          </a>
          <button
            type="button"
            onClick={exportPdf}
            disabled={exporting}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs disabled:opacity-40"
          >
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
          <Link
            href="/"
            className="rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            New proposal
          </Link>
        </div>
      </header>
      {exportError && (
        <p className="border-b border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-2 text-xs text-red-400">
          {exportError}
        </p>
      )}
      <iframe
        ref={iframeRef}
        title="Proposal preview"
        src={`/api/proposals/${proposalId}`}
        className="w-full flex-1 border-0 bg-[#333]"
      />
    </div>
  );
}
