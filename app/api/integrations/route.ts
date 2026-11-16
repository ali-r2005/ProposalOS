import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/context";
import { checkIntegrations } from "@/lib/integrations/registry";
import { toErrorResponse } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

/** GET /api/integrations: pings every integration and reports its status. */
export async function GET(request: Request) {
  try {
    requireAuth(request);
    return NextResponse.json({ integrations: await checkIntegrations() });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
