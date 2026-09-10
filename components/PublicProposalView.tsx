"use client";

import { useEffect } from "react";
import { trackProposalClick } from "@/lib/frappe/track-proposal";

export default function PublicProposalView({
  proposalId,
  expires,
  sig,
  dealId,
}: {
  proposalId: string;
  expires?: string;
  sig?: string;
  dealId?: string;
}) {
  useEffect(() => {
    if (dealId) {
      // Capture the browser's User Agent
      const userAgent = navigator.userAgent;
      
      // Call the Next.js Server Action
      trackProposalClick(dealId, userAgent)
        .then((res) => {
          if (res.success) {
            console.log("Click logged successfully via Next.js Server");
          }
        })
        .catch((err) => console.error(err));
    }
  }, [dealId]);

  if (!expires || !sig) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#333] text-center text-white">
        <p className="text-sm">This link is missing or malformed.</p>
      </div>
    );
  }

  const src = `/api/proposals/${proposalId}?expires=${encodeURIComponent(expires)}&sig=${encodeURIComponent(sig)}`;

  return (
    <div className="h-screen bg-[#333]">
      <iframe title="Proposal" src={src} className="h-full w-full border-0" />
    </div>
  );
}
