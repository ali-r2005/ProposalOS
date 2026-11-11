import type { Metadata } from "next";
import PresenterView from "@/components/present/PresenterView";

// Fallback until PresenterView sets the title in the viewer's language.
export const metadata: Metadata = { title: "Presenter view · ProposalOS" };

/** The presenter's private dashboard. Opens the audience window itself. */
export default async function PresentPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  return <PresenterView proposalId={proposalId} />;
}
