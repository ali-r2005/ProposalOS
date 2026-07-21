import { desc, eq, sql } from "drizzle-orm";
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
  context: BusinessContext,
  title?: string
): Promise<void> {
  await getDb()
    .insert(proposals)
    .values({ id: proposalId, templateId, html, context, title: title ?? null });
}

/** Lightweight row for history views — no html/context, so listing stays cheap. */
export interface ProposalListItem {
  id: string;
  templateId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listProposals(
  opts: { templateId?: string; limit?: number; offset?: number } = {}
): Promise<{ rows: ProposalListItem[]; total: number }> {
  const db = getDb();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const filter = opts.templateId ? eq(proposals.templateId, opts.templateId) : undefined;

  const rows = await db
    .select({
      id: proposals.id,
      templateId: proposals.templateId,
      title: proposals.title,
      createdAt: proposals.createdAt,
      updatedAt: proposals.updatedAt,
    })
    .from(proposals)
    .where(filter)
    .orderBy(desc(proposals.updatedAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(proposals)
    .where(filter);

  return { rows, total: count };
}

/** Returns true if a row was deleted, false if it didn't exist. */
export async function deleteProposal(proposalId: string): Promise<boolean> {
  const [row] = await getDb()
    .delete(proposals)
    .where(eq(proposals.id, proposalId))
    .returning({ id: proposals.id });
  return Boolean(row);
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
