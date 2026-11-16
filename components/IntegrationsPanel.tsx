'use client';

import { useCallback, useEffect, useState } from 'react';
import { http, toErrorMessage } from '@/lib/utils/http';
import { useLocale } from '@/components/LocaleProvider';
import type { IntegrationStatus } from '@/lib/integrations/types';

const STATE_LABEL = {
  ok: 'settings.integrations.state.ok',
  down: 'settings.integrations.state.down',
  off: 'settings.integrations.state.off',
} as const;

/**
 * Settings section listing the connected apps (Frappe CRM…) with a live
 * connection check. Checks run when the page opens and on "Test again".
 */
export default function IntegrationsPanel() {
  const { t } = useLocale();
  const [items, setItems] = useState<IntegrationStatus[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await http.get<{ integrations: IntegrationStatus[] }>('/api/integrations');
      setItems(data.integrations);
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
    <div className="border border-[var(--app-border)] rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--app-text)] mb-1">
            {t('settings.integrations.title')}
          </h2>
          <p className="text-sm text-[var(--app-muted)]">{t('settings.integrations.hint')}</p>
        </div>
        <button
          type="button"
          onClick={() => void check()}
          disabled={loading}
          className="shrink-0 px-3 py-1.5 text-sm border border-[var(--app-border)] rounded-lg text-[var(--app-text)] disabled:opacity-50"
        >
          {loading ? t('settings.integrations.checking') : t('settings.integrations.retest')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-3">
        {(items ?? []).map((item) => {
          const state = !item.configured ? 'off' : item.ok ? 'ok' : 'down';
          const dot = state === 'ok' ? 'bg-green-500' : state === 'down' ? 'bg-red-500' : 'bg-gray-400';
          return (
            <li key={item.id} className="flex items-start gap-3 rounded-lg bg-[var(--app-panel)] p-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${loading ? 'bg-gray-300 animate-pulse' : dot}`} />
              <div className="min-w-0 text-sm">
                <div className="font-medium text-[var(--app-text)]">
                  {item.name}
                  <span className="ml-2 font-normal text-[var(--app-muted)]">
                    {t(STATE_LABEL[state])}
                    {item.latencyMs !== undefined && ` · ${item.latencyMs} ms`}
                  </span>
                </div>
                {item.url && <div className="truncate text-[var(--app-muted)]">{item.url}</div>}
                {item.account && (
                  <div className="text-[var(--app-muted)]">
                    {t('settings.integrations.account', { account: item.account })}
                  </div>
                )}
                {item.missingEnv?.length ? (
                  <div className="text-[var(--app-muted)]">
                    {t('settings.integrations.missingEnv', { vars: item.missingEnv.join(', ') })}
                  </div>
                ) : null}
                {item.error && <div className="text-red-600">{item.error}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
