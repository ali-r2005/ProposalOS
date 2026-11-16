"use server";

import { http, toErrorMessage } from "@/lib/utils/http";

const FRAPPE_BASE_URL = process.env.FRAPPE_CRM_URL || "https://erp.tendenciaevents.com";

/** Server action: records a public proposal-link view against the CRM deal. */
export async function trackProposalClick(
  dealId: string,
  userAgent?: string
): Promise<{ success: boolean }> {
  if (!dealId) return { success: false };

  try {
    const now = new Date();
    const timestamp = now.toISOString().replace("T", " ").substring(0, 19);

    await http.post(
      `${FRAPPE_BASE_URL}/api/method/record_proposal_click`,
      { deal_id: dealId, timestamp, user_agent: userAgent || "" },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to register proposal click:", toErrorMessage(error, "unknown error"));
    return { success: false };
  }
}
