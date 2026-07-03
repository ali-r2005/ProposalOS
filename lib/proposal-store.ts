/**
 * Minimal in-memory store for generated presentations. Phase 1 has no database
 * (persistence is explicitly out of scope), so generated HTML lives in-process
 * keyed by proposal id, long enough for the preview page to fetch it.
 */
interface StoredProposal {
  templateId: string;
  html: string;
  createdAt: number;
}

// Pin to globalThis so the store survives Next.js dev module re-evaluation /
// HMR within the same server process (module-level state alone does not).
const globalRef = globalThis as unknown as { __proposalStore?: Map<string, StoredProposal> };
const store: Map<string, StoredProposal> = (globalRef.__proposalStore ??= new Map());
const MAX_ENTRIES = 50;

export function saveProposal(proposalId: string, templateId: string, html: string): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(proposalId, { templateId, html, createdAt: Date.now() });
}

export function getProposal(proposalId: string): StoredProposal | undefined {
  return store.get(proposalId);
}
