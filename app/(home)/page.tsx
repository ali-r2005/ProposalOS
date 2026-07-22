'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import TemplateSelector from "@/components/TemplateSelector";

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
      <nav className="mb-10 flex items-center justify-between pb-6 border-b border-[var(--color-text-secondary)]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Logged in as: {user?.email}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/admin/settings"
            className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:opacity-90 transition"
          >
            Settings
          </a>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-[var(--color-text-secondary)] text-[var(--color-text-primary)] font-medium hover:bg-[var(--color-text-secondary)] hover:bg-opacity-10 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <header className="mb-10">
        <h2 className="text-2xl font-bold tracking-tight">Create Proposal</h2>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          Pick a template to build a proposal from form input, providers, and AI.
        </p>
      </header>
      <TemplateSelector />
    </div>
  );
}
