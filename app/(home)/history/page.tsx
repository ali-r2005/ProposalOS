import ProposalHistory from "@/components/ProposalHistory";

export default function GlobalHistoryPage() {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="mt-3 text-[var(--app-muted)]">All proposals generated across every template.</p>
      </header>
      <ProposalHistory />
    </div>
  );
}
