'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useLocale } from '@/components/LocaleProvider';
import AccountSettings from '@/components/settings/AccountSettings';
import PreferencesSettings from '@/components/settings/PreferencesSettings';
import McpTokenPanel from '@/components/settings/McpTokenPanel';
import IntegrationsPanel from '@/components/settings/IntegrationsPanel';

const SECTIONS = [
  { id: 'account', label: 'settings.nav.account', hint: 'settings.nav.accountHint' },
  { id: 'preferences', label: 'settings.nav.preferences', hint: 'settings.nav.preferencesHint' },
  { id: 'claude', label: 'settings.nav.claude', hint: 'settings.nav.claudeHint' },
  { id: 'integrations', label: 'settings.nav.integrations', hint: 'settings.nav.integrationsHint' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function sectionFromHash(): SectionId {
  if (typeof window === 'undefined') return 'account';
  const hash = window.location.hash.slice(1);
  return SECTIONS.some((s) => s.id === hash) ? (hash as SectionId) : 'account';
}

/** Settings, split into sections. The open section is kept in the URL hash (#integrations). */
export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [active, setActive] = useState<SectionId>('account');

  useEffect(() => {
    setActive(sectionFromHash());
    const onHash = () => setActive(sectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function open(id: SectionId) {
    setActive(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  if (!user) {
    return <div className="p-8 text-[var(--app-text)]">{t('settings.loading')}</div>;
  }

  const current = SECTIONS.find((s) => s.id === active)!;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--app-text)]">{t('settings.title')}</h1>
        <p className="mt-1 text-[var(--app-muted)]">{t('settings.loggedInAs', { email: user.email })}</p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <nav aria-label={t('settings.title')} className="md:w-56 md:shrink-0">
          <ul className="flex gap-1 overflow-x-auto md:sticky md:top-6 md:flex-col">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => open(section.id)}
                  aria-current={active === section.id ? 'page' : undefined}
                  className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    active === section.id
                      ? 'bg-[var(--app-panel)] text-[var(--app-accent)]'
                      : 'text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {t(section.label)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--app-text)]">{t(current.label)}</h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">{t(current.hint)}</p>
          </div>
          {active === 'account' && <AccountSettings />}
          {active === 'preferences' && <PreferencesSettings />}
          {active === 'claude' && <McpTokenPanel />}
          {active === 'integrations' && <IntegrationsPanel />}
        </div>
      </div>
    </div>
  );
}
