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
      console.log("I'm here in the useEffect and dealId is:", dealId);
      trackProposalClick(dealId);
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
