'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TemplateSidebar({ templateId }: { templateId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/templates/${templateId}/new`, label: 'New proposal' },
    { href: `/templates/${templateId}/history`, label: 'History' },
    { href: `/templates/${templateId}/admin`, label: 'Manage data' },
  ];

  return (
    <aside className="w-48 shrink-0">
      <Link
        href="/"
        className="mb-8 block text-sm text-[var(--app-muted)] transition hover:text-[var(--app-accent)]"
      >
        ← Templates
      </Link>
      <nav className="flex flex-col gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
