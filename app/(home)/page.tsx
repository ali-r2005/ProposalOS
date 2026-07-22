import TemplateSelector from "@/components/TemplateSelector";

export default function HomePage() {
  return (
    <div>
      <header className="mb-10">
        <h2 className="text-2xl font-bold tracking-tight">Create Proposal</h2>
        <p className="mt-3 text-[var(--app-muted)]">
          Pick a template to build a proposal from form input, providers, and AI.
        </p>
      </header>
      <TemplateSelector />
    </div>
  );
}
