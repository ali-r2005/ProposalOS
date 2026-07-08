import ProposalEditor from "@/components/ProposalEditor";

export default async function ProposalEditPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  return <ProposalEditor proposalId={proposalId} />;
}
