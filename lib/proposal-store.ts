import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { proposals } from "@/lib/db/schema";
import type { BusinessContext } from "@/lib/engine/types";

/**
 * Persistence for generated presentations, backed by Postgres (see
 * lib/db/schema.ts). The merged `context` is kept alongside the HTML (not
 * just the HTML) so the editor can load it, let the user change values, and
 * re-render straight from the edited context — without re-running
 * providers/AI, which would otherwise clobber hand-edits or re-roll fetched
 * data.
 */
export interface StoredProposal {
  templateId: string;
  html: string;
  context: BusinessContext;
}

export async function saveProposal(
  proposalId: string,
  templateId: string,
  html: string,
  context: BusinessContext
): Promise<void> {
  await getDb().insert(proposals).values({ id: proposalId, templateId, html, context });
}

export async function getProposal(proposalId: string): Promise<StoredProposal | undefined> {
  const [row] = await getDb().select().from(proposals).where(eq(proposals.id, proposalId)).limit(1);
  if (!row) return undefined;
  return { templateId: row.templateId, html: row.html, context: row.context as BusinessContext };
}

/** Overwrite the html + context of an existing proposal (used by the editor). */
export async function updateProposal(
  proposalId: string,
  html: string,
  context: BusinessContext
): Promise<StoredProposal | undefined> {
  const [row] = await getDb()
    .update(proposals)
    .set({ html, context, updatedAt: new Date() })
    .where(eq(proposals.id, proposalId))
    .returning();
  if (!row) return undefined;
  return { templateId: row.templateId, html: row.html, context: row.context as BusinessContext };
}
