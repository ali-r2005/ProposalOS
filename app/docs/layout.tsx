import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import DocsSidebar from "@/components/docs/DocsSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { listDocs } from "@/lib/docs/docs";

export const metadata: Metadata = {
  title: { default: "Docs · ProposalOS", template: "%s · ProposalOS Docs" },
  description: "Guides for building ProposalOS templates and working with the engine.",
};

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = await listDocs();

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--app-border)] bg-[var(--app-bg)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/docs" className="flex items-center gap-2 font-bold tracking-tight">
            <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md object-contain" />
            ProposalOS
            <span className="rounded-md border border-[var(--app-border)] px-1.5 py-0.5 text-xs font-medium text-[var(--app-muted)]">
              Docs
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-10 px-4 sm:px-6">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto py-8 lg:block">
          <DocsSidebar docs={docs} />
        </aside>
        <div className="min-w-0 flex-1 py-8 lg:py-10">
          <details className="mb-6 rounded-lg border border-[var(--app-border)] lg:hidden">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">Menu</summary>
            <div className="border-t border-[var(--app-border)] p-2">
              <DocsSidebar docs={docs} />
            </div>
          </details>
          {children}
        </div>
      </div>
    </div>
  );
}
