"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HomeSidebar() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Templates" },
    { href: "/history", label: "History" },
  ];

  return (
    <aside className="w-48 shrink-0">
      <Link href="/" className="mb-8 block text-lg font-bold tracking-tight">
        ProposalOS
      </Link>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-[var(--app-accent)] text-white" : "text-[var(--app-muted)] hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
