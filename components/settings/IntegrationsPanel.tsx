'use client';

import { useCallback, useEffect, useState } from 'react';
import { http, toErrorMessage } from '@/lib/utils/http';
import { useLocale } from '@/components/LocaleProvider';
import type { IntegrationStatus } from '@/lib/integrations/types';
import { SettingsCard, secondaryButtonClass } from './ui';

const STATE = {
  ok: { label: 'settings.integrations.state.ok', badge: 'bg-green-500/10 text-green-600', dot: 'bg-green-500' },
  down: { label: 'settings.integrations.state.down', badge: 'bg-red-500/10 text-red-600', dot: 'bg-red-500' },
  off: { label: 'settings.integrations.state.off', badge: 'bg-gray-500/10 text-[var(--app-muted)]', dot: 'bg-gray-400' },
} as const;

/**
 * Connected apps (Frappe CRM…) with a live connection check. Checks run when
 * the section opens and on "Test again".
 */
export default function IntegrationsPanel() {
  const { t } = useLocale();
  const [items, setItems] = useState<IntegrationStatus[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await http.get<{ integrations: IntegrationStatus[] }>('/api/integrations');
      setItems(data.integrations);
      setCheckedAt(new Date());
    } catch (err) {
      setError(toErrorMessage(err, t('settings.integrations.failed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <SettingsCard
      title={t('settings.integrations.title')}
      description={t('settings.integrations.hint')}
      action={
        <button type="button" onClick={() => void check()} disabled={loading} className={secondaryButtonClass}>
          {loading ? t('settings.integrations.checking') : t('settings.integrations.retest')}
        </button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!items && loading && (
        <div className="h-20 animate-pulse rounded-lg bg-[var(--app-panel)]" />
      )}

      <ul className="space-y-3">
        {(items ?? []).map((item) => {
          const state = STATE[!item.configured ? 'off' : item.ok ? 'ok' : 'down'];
          return (
            <li key={item.id} className="rounded-lg border border-[var(--app-border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium text-[var(--app-text)]">
                  <span className={`h-2.5 w-2.5 rounded-full ${loading ? 'bg-gray-300 animate-pulse' : state.dot}`} />
                  {item.name}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${state.badge}`}>
                  {t(state.label)}
                  {item.latencyMs !== undefined && item.configured && ` · ${item.latencyMs} ms`}
                </span>
              </div>
              <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                {item.url && (
                  <>
                    <dt className="text-[var(--app-muted)]">{t('settings.integrations.site')}</dt>
                    <dd className="truncate text-[var(--app-text)]">{item.url}</dd>
                  </>
                )}
                {item.account && (
                  <>
                    <dt className="text-[var(--app-muted)]">{t('settings.integrations.accountLabel')}</dt>
                    <dd className="truncate text-[var(--app-text)]">{item.account}</dd>
                  </>
                )}
                {item.missingEnv?.length ? (
                  <>
                    <dt className="text-[var(--app-muted)]">{t('settings.integrations.missingLabel')}</dt>
                    <dd className="font-mono text-xs text-[var(--app-text)]">{item.missingEnv.join(', ')}</dd>
                  </>
                ) : null}
              </dl>
              {item.error && <p className="mt-2 text-sm text-red-600">{item.error}</p>}
            </li>
          );
        })}
      </ul>

      {checkedAt && (
        <p className="mt-3 text-xs text-[var(--app-muted)]">
          {t('settings.integrations.checkedAt', { time: checkedAt.toLocaleTimeString() })}
        </p>
      )}
    </SettingsCard>
  );
}
