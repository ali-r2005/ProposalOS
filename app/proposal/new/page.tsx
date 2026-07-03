import { Suspense } from "react";
import Link from "next/link";
import ProposalForm from "@/components/ProposalForm";

export default function NewProposalPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-[var(--app-muted)] hover:text-white">
        ← Back to templates
      </Link>
      <div className="mt-6 rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-8">
        <Suspense fallback={<p className="text-[var(--app-muted)]">Loading…</p>}>
          <ProposalForm />
        </Suspense>
      </div>
    </main>
  );
}
