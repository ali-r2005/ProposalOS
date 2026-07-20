import ProposalForm from "@/components/ProposalForm";

export default async function NewProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-8">
      <ProposalForm templateId={id} />
    </div>
  );
}
