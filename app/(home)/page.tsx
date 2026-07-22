'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import TemplateSelector from "@/components/TemplateSelector";
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/auth/login');
  }

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="mb-10 flex items-center justify-between pb-6 border-b border-[var(--app-border)]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Logged in as: {user?.email}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a
            href="/admin/settings"
            className="px-4 py-2 rounded-lg bg-[var(--app-accent)] text-white font-medium hover:opacity-90 transition"
          >
            Settings
          </a>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-[var(--app-border)] text-[var(--app-text)] font-medium hover:border-[var(--app-accent)] transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
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
