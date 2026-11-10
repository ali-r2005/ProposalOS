import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDoc, listDocs } from "@/lib/docs/docs";

// Every page is generated at build time from docs/*.md; unknown slugs 404.
export const dynamicParams = false;

interface DocPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const docs = await listDocs();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc(slug);
  return doc ? { title: doc.title, description: doc.description } : {};
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const [doc, docs] = await Promise.all([getDoc(slug), listDocs()]);
  if (!doc) notFound();

  const index = docs.findIndex((d) => d.slug === slug);
  const previous = index > 0 ? docs[index - 1] : null;
  const next = index >= 0 && index < docs.length - 1 ? docs[index + 1] : null;

  return (
    <div className="flex gap-10">
      <main className="min-w-0 max-w-3xl flex-1">
        <nav className="mb-4 text-sm text-[var(--app-muted)]" aria-label="Breadcrumb">
          <Link href="/docs" className="hover:text-[var(--app-text)]">
            Docs
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--app-text)]">{doc.title}</span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{doc.title}</h1>

        <article className="docs-prose mt-6" dangerouslySetInnerHTML={{ __html: doc.html }} />

        {(previous || next) && (
          <div className="mt-16 grid gap-4 border-t border-[var(--app-border)] pt-8 sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/docs/${previous.slug}`}
                className="rounded-xl border border-[var(--app-border)] p-4 transition hover:border-[var(--app-accent)]"
              >
                <span className="text-xs text-[var(--app-muted)]">← Previous</span>
                <span className="mt-1 block font-semibold">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/docs/${next.slug}`}
                className="rounded-xl border border-[var(--app-border)] p-4 text-right transition hover:border-[var(--app-accent)]"
              >
                <span className="text-xs text-[var(--app-muted)]">Next →</span>
                <span className="mt-1 block font-semibold">{next.title}</span>
              </Link>
            )}
          </div>
        )}
      </main>

      {doc.headings.length > 0 && (
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto pb-8 xl:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">On this page</p>
          <ul className="space-y-1.5 border-l border-[var(--app-border)] text-sm">
            {doc.headings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  className={`-ml-px block border-l border-transparent text-[var(--app-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-text)] ${
                    heading.level === 3 ? "pl-7" : "pl-4"
                  }`}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
