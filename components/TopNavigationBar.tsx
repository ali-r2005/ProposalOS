'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_LINKS = [
  { href: '/', label: 'Templates' },
  { href: '/history', label: 'History' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function TopNavigationBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push('/auth/login');
  }

  return (
    <header className="border-b border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-[var(--app-text)]">
            <Image src="/logo.png" alt="ProposalOS" width={50} height={50} className="h-30 w-30 rounded-lg object-contain" />
            ProposalOS
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="hidden text-sm text-[var(--app-muted)] sm:inline">{user.email}</span>
          )}
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-sm font-medium text-[var(--app-text)] transition hover:border-[var(--app-accent)]"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
