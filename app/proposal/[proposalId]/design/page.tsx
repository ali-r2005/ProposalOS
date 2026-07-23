import ProposalDesignEditor from "@/components/ProposalDesignEditor";

export default async function ProposalDesignPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  return <ProposalDesignEditor proposalId={proposalId} />;
}
