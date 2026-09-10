import { NextResponse } from "next/server";
import { getProposal } from "@/lib/proposal-store";
import { requireAuth } from "@/lib/auth/context";
import { createShareSignature } from "@/lib/share/link";
import { toErrorResponse } from "@/lib/utils/error-handler";

const MIN_TTL_HOURS = 1;
const MAX_TTL_DAYS = 90;

/**
 * POST /api/proposals/[id]/share — mint a stateless, signed public link that
 * expires after the requested number of days. No row is written; the link's
 * own query params (expiry + signature) are the only state.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    requireAuth(request);

    const proposal = await getProposal(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const ttlDays = Number(body?.ttlDays);
    if (!Number.isFinite(ttlDays) || ttlDays * 24 < MIN_TTL_HOURS || ttlDays > MAX_TTL_DAYS) {
      return NextResponse.json(
        { error: `ttlDays must be between ${MIN_TTL_HOURS / 24} and ${MAX_TTL_DAYS}` },
        { status: 400 }
      );
    }

    const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
    const signature = createShareSignature(id, expiresAt);

    const origin = new URL(request.url).origin;
    //i will add a field of dealId
    const dealId = body?.dealId; 
    const url = `${origin}/p/${id}?expires=${expiresAt}&sig=${signature}&dealId=${dealId}`;

    return NextResponse.json({ url, expiresAt });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
