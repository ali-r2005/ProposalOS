"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TemplateNav({ templateId }: { templateId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/templates/${templateId}/new`, label: "New proposal" },
    { href: `/templates/${templateId}/admin`, label: "Manage data" },
  ];

  return (
    <header className="border-b border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-sm text-[var(--app-muted)] hover:text-white">
          ← Templates
        </Link>
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--app-accent)] text-white"
                    : "text-[var(--app-muted)] hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
