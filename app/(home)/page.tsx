import TemplateSelector from "@/components/TemplateSelector";

export default function HomePage() {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="mt-3 text-[var(--app-muted)]">
          Pick a template to build a proposal from form input, providers, and AI.
        </p>
      </header>
      <TemplateSelector />
    </div>
  );
}
