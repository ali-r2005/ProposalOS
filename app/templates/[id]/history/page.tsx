import ProposalHistory from "@/components/ProposalHistory";

export default async function TemplateHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProposalHistory templateId={id} />;
}
