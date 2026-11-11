import { NextResponse } from "next/server";
import { getSpeakerNotes, setSpeakerNote } from "@/lib/proposal-store";
import { requireAuth } from "@/lib/auth/context";
import { toErrorResponse } from "@/lib/utils/error-handler";

const MAX_KEY = 300;
const MAX_NOTE = 20_000;

/**
 * GET /api/proposals/[id]/notes — the presenter's private notes,
 * `{ notes: { "<slideKey>": "text" } }`. Authenticated only: the public share
 * route never exposes them.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    requireAuth(request);
    const notes = await getSpeakerNotes(id);
    if (!notes) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    return NextResponse.json({ notes });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PATCH /api/proposals/[id]/notes — body `{ key, text }`. Sets one slide's
 * note; an empty `text` removes it.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    requireAuth(request);
    const body = (await request.json().catch(() => null)) as { key?: unknown; text?: unknown } | null;
    const key = body?.key;
    const text = body?.text;
    if (typeof key !== "string" || !key || key.length > MAX_KEY || typeof text !== "string") {
      return NextResponse.json({ error: "Body must be `{ key: string, text: string }`" }, { status: 400 });
    }
    if (text.length > MAX_NOTE) {
      return NextResponse.json({ error: `Notes are limited to ${MAX_NOTE} characters per slide` }, { status: 400 });
    }

    const found = await setSpeakerNote(id, key, text.trim() ? text : "");
    if (!found) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
