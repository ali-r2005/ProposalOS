import Link from "next/link";
import { listDocs } from "@/lib/docs/docs";

export const dynamic = "force-static";

export default async function DocsIndexPage() {
  const docs = await listDocs();

  return (
    <main className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Documentation</h1>
      <p className="mt-3 text-lg text-[var(--app-muted)]">
        Guides for building proposal templates and working with the ProposalOS engine.
      </p>

      {docs.length === 0 ? (
        <p className="mt-10 text-[var(--app-muted)]">No documentation yet.</p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {docs.map((doc) => (
            <li key={doc.slug}>
              <Link
                href={`/docs/${doc.slug}`}
                className="group flex h-full flex-col rounded-xl border border-[var(--app-border)] p-5 transition hover:border-[var(--app-accent)] hover:bg-[var(--app-panel)]"
              >
                <span className="font-semibold group-hover:text-[var(--app-accent)]">{doc.title}</span>
                {doc.description && (
                  <span className="mt-2 text-sm leading-relaxed text-[var(--app-muted)]">{doc.description}</span>
                )}
                <span className="mt-4 text-sm font-medium text-[var(--app-accent)]">Read →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
