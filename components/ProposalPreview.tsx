"use client";

import Link from "next/link";

export default function ProposalPreview({ proposalId }: { proposalId: string }) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold">Proposal preview</h1>
          <p className="text-xs text-[var(--app-muted)]">{proposalId}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* add an link to the editor */}
          <Link
            href={`/proposals/${proposalId}/edit`}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs"
          >
            Edit proposal
          </Link>
          <a
            href={`/api/proposals/${proposalId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs"
          >
            Open in new tab
          </a>
          <Link
            href="/"
            className="rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            New proposal
          </Link>
        </div>
      </header>
      <iframe
        title="Proposal preview"
        src={`/api/proposals/${proposalId}`}
        className="w-full flex-1 border-0 bg-[#333]"
      />
    </div>
  );
}
