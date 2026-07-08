import type { BusinessContext } from "@/lib/engine/types";

/**
 * Minimal in-memory store for generated presentations. Phase 1 has no database
 * (persistence is explicitly out of scope), so generated HTML lives in-process
 * keyed by proposal id, long enough for the preview page to fetch it.
 *
 * The merged `context` is kept alongside the HTML (not just the HTML) so the
 * editor can load it, let the user change values, and re-render straight from
 * the edited context — without re-running providers/AI, which would otherwise
 * clobber hand-edits or re-roll fetched data.
 */
interface StoredProposal {
  templateId: string;
  html: string;
  context: BusinessContext;
  createdAt: number;
}

// Pin to globalThis so the store survives Next.js dev module re-evaluation /
// HMR within the same server process (module-level state alone does not).
const globalRef = globalThis as unknown as { __proposalStore?: Map<string, StoredProposal> };
const store: Map<string, StoredProposal> = (globalRef.__proposalStore ??= new Map());
const MAX_ENTRIES = 50;

export function saveProposal(
  proposalId: string,
  templateId: string,
  html: string,
  context: BusinessContext
): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(proposalId, { templateId, html, context, createdAt: Date.now() });
}

export function getProposal(proposalId: string): StoredProposal | undefined {
  return store.get(proposalId);
}

/** Overwrite the html + context of an existing proposal (used by the editor). */
export function updateProposal(
  proposalId: string,
  html: string,
  context: BusinessContext
): StoredProposal | undefined {
  const existing = store.get(proposalId);
  if (!existing) return undefined;
  const updated: StoredProposal = { ...existing, html, context };
  store.set(proposalId, updated);
  return updated;
}
