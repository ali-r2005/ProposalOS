'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Shared building blocks for the settings page sections. */

export const inputClass =
  'w-full px-3 py-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-panel)] text-[var(--app-text)] ' +
  'focus:outline-none focus:border-[var(--app-accent)] disabled:opacity-50';

export const primaryButtonClass =
  'px-4 py-2 bg-[var(--app-accent)] text-white text-sm font-medium rounded-lg transition hover:opacity-90 disabled:opacity-50';

export const secondaryButtonClass =
  'px-3 py-1.5 text-sm border border-[var(--app-border)] rounded-lg text-[var(--app-text)] transition ' +
  'hover:border-[var(--app-accent)] disabled:opacity-50';

export function SettingsCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[var(--app-border)] rounded-xl">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--app-text)]">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--app-muted)]">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--app-text)] mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-[var(--app-muted)]">{hint}</p>}
    </div>
  );
}

export type Notice = { type: 'success' | 'error'; text: string } | null;

export function NoticeText({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      role={notice.type === 'error' ? 'alert' : 'status'}
      className={`text-sm ${notice.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
    >
      {notice.text}
    </p>
  );
}

/** A section-local message; success messages fade after a few seconds. */
export function useNotice(): [Notice, (next: Notice) => void] {
  const [notice, setNotice] = useState<Notice>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: Notice) => {
    if (timer.current) clearTimeout(timer.current);
    setNotice(next);
    if (next?.type === 'success') timer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return [notice, show];
}
