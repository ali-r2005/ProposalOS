import ProposalPreview from "@/components/ProposalPreview";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  return <ProposalPreview proposalId={proposalId} />;
}
