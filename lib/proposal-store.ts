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
  /** Content language; null = the template's default. */
  lang: string | null;
  html: string;
  context: BusinessContext;
}

export async function saveProposal(
  proposalId: string,
  templateId: string,
  html: string,
  context: BusinessContext,
  title?: string,
  lang?: string
): Promise<void> {
  await getDb()
    .insert(proposals)
    .values({ id: proposalId, templateId, html, context, title: title ?? null, lang: lang ?? null });
}

/** Lightweight row for history views — no html/context, so listing stays cheap. */
export interface ProposalListItem {
  id: string;
  templateId: string;
  title: string | null;
  lang: string | null;
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
      lang: proposals.lang,
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
  return { templateId: row.templateId, lang: row.lang, html: row.html, context: row.context as BusinessContext };
}

/**
 * Metadata for a single proposal — the same columns listProposals returns,
 * without pulling the html/context blobs the editor headers don't need.
 */
export async function getProposalMeta(
  proposalId: string
): Promise<ProposalListItem | undefined> {
  const [row] = await getDb()
    .select({
      id: proposals.id,
      templateId: proposals.templateId,
      title: proposals.title,
      lang: proposals.lang,
      createdAt: proposals.createdAt,
      updatedAt: proposals.updatedAt,
    })
    .from(proposals)
    .where(eq(proposals.id, proposalId))
    .limit(1);
  return row;
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
  return { templateId: row.templateId, lang: row.lang, html: row.html, context: row.context as BusinessContext };
}

/**
 * Private presenter notes for a proposal, keyed by slide. Kept out of
 * StoredProposal so the HTML/share routes never load them.
 * Returns undefined when the proposal doesn't exist.
 */
export async function getSpeakerNotes(proposalId: string): Promise<Record<string, string> | undefined> {
  const [row] = await getDb()
    .select({ notes: proposals.speakerNotes })
    .from(proposals)
    .where(eq(proposals.id, proposalId))
    .limit(1);
  if (!row) return undefined;
  return row.notes ?? {};
}

/**
 * Set (or, with empty text, remove) one slide's note. Updates only that key,
 * so two windows editing different slides can't overwrite each other.
 * Returns false when the proposal doesn't exist.
 */
export async function setSpeakerNote(proposalId: string, slideKey: string, text: string): Promise<boolean> {
  const notes = sql`coalesce(${proposals.speakerNotes}, '{}'::jsonb)`;
  const next = text
    ? sql`${notes} || jsonb_build_object(${slideKey}::text, ${text}::text)`
    : sql`${notes} - ${slideKey}::text`;
  const [row] = await getDb()
    .update(proposals)
    .set({ speakerNotes: next })
    .where(eq(proposals.id, proposalId))
    .returning({ id: proposals.id });
  return Boolean(row);
}
