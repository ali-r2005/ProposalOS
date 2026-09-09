"use client";

import { useState } from "react";
import { http, toErrorMessage } from "@/lib/utils/http";

const TTL_OPTIONS = [
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export default function ShareProposalModal({
  proposalId,
  onClose,
}: {
  proposalId: string;
  onClose: () => void;
}) {
  const [ttlDays, setTtlDays] = useState(7);
  const [dealID, setDealID] = useState(""); // State for dealID
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generateLink() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const { data } = await http.post<{ url: string }>(
        `/api/proposals/${proposalId}/share`,
        { ttlDays , dealID }
      );
      setUrl(data.url);
    } catch (err) {
      setError(toErrorMessage(err, "Could not generate the link"));
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Share proposal</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--app-muted)] hover:text-current"
          >
            Close
          </button>
        </div>

        {!url && (
          <>
            <p className="mb-3 text-xs text-[var(--app-muted)]">
              Anyone with this link can view the proposal until it expires — no login needed.
            </p>
            <label className="mb-1 block text-xs text-[var(--app-muted)]">Link expires after</label>
            <select
              value={ttlDays}
              onChange={(e) => setTtlDays(Number(e.target.value))}
              className="mb-4 w-full rounded-lg border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-xs"
            >
              {TTL_OPTIONS.map((opt) => (
                <option key={opt.days} value={opt.days}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-xs text-[var(--app-muted)]">Deal ID</label>
            <input
              type="text"
              value={dealID}
              onChange={(e) => setDealID(e.target.value)}
              className="mb-4 w-full rounded-lg border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-xs"
              placeholder="Enter Deal ID"
            />
            {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
            <button
              type="button"
              onClick={generateLink}
              disabled={loading}
              className="w-full rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {loading ? "Generating…" : "Generate link"}
            </button>
          </>
        )}

        {url && (
          <>
            <label className="mb-1 block text-xs text-[var(--app-muted)]">Public link</label>
            <div className="mb-3 flex items-center gap-2">
              <input
                readOnly
                value={url}
                className="w-full rounded-lg border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setUrl(null)}
              className="text-xs text-[var(--app-muted)] hover:text-current"
            >
              Generate a different link
            </button>
          </>
        )}
      </div>
    </div>
  );
}
