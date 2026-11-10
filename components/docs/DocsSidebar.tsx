'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DocsSidebarProps {
  docs: { slug: string; title: string }[];
}

export default function DocsSidebar({ docs }: DocsSidebarProps) {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `block rounded-lg px-3 py-2 text-sm transition ${
      active
        ? 'bg-[var(--app-panel)] font-semibold text-[var(--app-accent)]'
        : 'text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--app-text)]'
    }`;

  return (
    <nav aria-label="Documentation">
      <Link href="/docs" className={linkClass(pathname === '/docs')}>
        Overview
      </Link>
      <p className="mb-1 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">Guides</p>
      <ul className="space-y-0.5">
        {docs.map((doc) => {
          const href = `/docs/${doc.slug}`;
          return (
            <li key={doc.slug}>
              <Link href={href} className={linkClass(pathname === href)}>
                {doc.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
