'use client';

import { useState } from 'react';
import { http, toErrorMessage } from '@/lib/utils/http';
import { useLocale } from '@/components/LocaleProvider';

interface McpTokenResponse {
  token: string;
  expiresAt: string;
  ttlDays: number;
  url: string;
}

/** Fixed lifetime of a token, shown before one is generated (see lib/mcp/token.ts). */
const TTL_DAYS = 90;

/**
 * Settings section that issues a personal MCP token, so the user can connect
 * Claude to ProposalOS. The token is shown once and never stored.
 */
export default function McpTokenPanel() {
  const { t } = useLocale();
  const [result, setResult] = useState<McpTokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await http.post<McpTokenResponse>('/api/admin/mcp-token');
      setResult(data);
    } catch (err) {
      setError(toErrorMessage(err, t('settings.mcp.failed')));
    } finally {
      setLoading(false);
    }
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      // Clipboard blocked: the value is still selectable on screen.
    }
  }

  const command = result
    ? `claude mcp add --transport http proposalos ${result.url} --header "Authorization: Bearer ${result.token}"`
    : '';

  const rows = result
    ? [
        { id: 'url', label: t('settings.mcp.url'), value: result.url },
        { id: 'token', label: t('settings.mcp.token'), value: result.token },
        { id: 'command', label: t('settings.mcp.command'), value: command },
      ]
    : [];

  return (
    <div className="border border-[var(--app-border)] rounded-lg p-6">
      <h2 className="text-2xl font-bold text-[var(--app-text)] mb-2">{t('settings.mcp.title')}</h2>
      <p className="text-sm text-[var(--app-muted)] mb-4">{t('settings.mcp.hint', { days: String(TTL_DAYS) })}</p>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      {result ? (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[var(--app-text)]">{row.label}</span>
                <button
                  type="button"
                  onClick={() => copy(row.id, row.value)}
                  className="text-sm text-[var(--app-accent)]"
                >
                  {copied === row.id ? t('settings.mcp.copied') : t('settings.mcp.copy')}
                </button>
              </div>
              <code className="block w-full break-all px-3 py-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-panel)] text-xs text-[var(--app-text)]">
                {row.value}
              </code>
            </div>
          ))}
          <p className="text-sm text-[var(--app-muted)]">
            {t('settings.mcp.expires', { date: new Date(result.expiresAt).toLocaleDateString() })}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 bg-[var(--app-accent)] text-white font-medium rounded-lg disabled:opacity-50"
        >
          {loading ? t('settings.mcp.generating') : t('settings.mcp.generate')}
        </button>
      )}
    </div>
  );
}
