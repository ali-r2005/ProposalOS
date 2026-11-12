'use client';

import { useLocale } from '@/components/LocaleProvider';
import ThemeToggle from '@/components/ThemeToggle';

interface Props {
  /** Shown instead of the form when the request can't be trusted. */
  error?: string;
  clientName?: string;
  redirectHost?: string;
  email?: string;
  /** Hidden form fields: the original authorize query plus the consent ticket. */
  fields?: Record<string, string>;
}

/** The "Allow <client> to access ProposalOS?" screen of the OAuth flow. */
export default function OAuthConsent({ error, clientName, redirectHost, email, fields }: Props) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="mx-auto w-full max-w-md px-4">
        <div className="border border-[var(--app-border)] rounded-lg bg-[var(--app-panel)] p-8">
          <h1 className="text-2xl font-bold mb-4">ProposalOS</h1>

          {error || !fields ? (
            <>
              <p className="font-medium mb-2">{t('oauth.errorTitle')}</p>
              <p className="text-sm text-[var(--app-muted)]">{error}</p>
            </>
          ) : (
            <form method="POST" action="/api/oauth/authorize" className="space-y-6">
              {Object.entries(fields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <div className="space-y-3">
                <p className="text-lg font-medium">{t('oauth.title', { client: clientName ?? '' })}</p>
                <p className="text-sm text-[var(--app-muted)]">{t('oauth.loggedInAs', { email: email ?? '' })}</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>{t('oauth.scopeRead')}</li>
                  <li>{t('oauth.scopeWrite')}</li>
                </ul>
                <p className="text-sm text-[var(--app-muted)]">{t('oauth.redirect', { host: redirectHost ?? '' })}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  name="decision"
                  value="deny"
                  className="flex-1 px-4 py-2 border border-[var(--app-border)] rounded-lg font-medium"
                >
                  {t('oauth.deny')}
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="allow"
                  className="flex-1 px-4 py-2 bg-[var(--app-accent)] text-white font-medium rounded-lg"
                >
                  {t('oauth.allow')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
