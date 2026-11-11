import AudienceView from "@/components/present/AudienceView";

/** What the client sees: the current slide only, kept in sync with the presenter. */
export default async function AudiencePage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  return <AudienceView proposalId={proposalId} />;
}
