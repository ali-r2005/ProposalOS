import TemplateSelector from "@/components/TemplateSelector";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">ProposalOS</h1>
        <p className="mt-3 text-[var(--app-muted)]">
          An agnostic presentation generation engine. Pick a template to build a
          proposal from form input, providers, and AI.
        </p>
      </header>
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--app-muted)]">
          Templates
        </h2>
        <TemplateSelector />
      </section>
    </main>
  );
}
