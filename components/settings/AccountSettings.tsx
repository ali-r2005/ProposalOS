'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useLocale } from '@/components/LocaleProvider';
import { http, toErrorMessage } from '@/lib/utils/http';
import { Field, NoticeText, SettingsCard, inputClass, primaryButtonClass, secondaryButtonClass, useNotice } from './ui';

const MIN_PASSWORD_LENGTH = 8; // Same rule as app/api/admin/change-password.

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <SettingsCard
        title={t('settings.account.title')}
        action={
          <button type="button" onClick={() => logout()} className={secondaryButtonClass}>
            {t('settings.account.logout')}
          </button>
        }
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--app-accent)] text-lg font-semibold text-white">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-[var(--app-muted)]">{t('settings.account.email')}</div>
            <div className="truncate font-medium text-[var(--app-text)]">{user?.email}</div>
          </div>
        </div>
      </SettingsCard>

      <EmailForm onChanged={() => setTimeout(() => logout(), 2000)} />
      <PasswordForm />
    </div>
  );
}

function EmailForm({ onChanged }: { onChanged: () => void }) {
  const { t } = useLocale();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useNotice();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await http.post('/api/admin/change-email', { newEmail, password });
      setNotice({ type: 'success', text: t('settings.email.success') });
      setNewEmail('');
      setPassword('');
      onChanged();
    } catch (error) {
      setNotice({ type: 'error', text: toErrorMessage(error, t('settings.email.failed')) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard title={t('settings.email.title')} description={t('settings.email.hint')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('settings.email.new')} htmlFor="new-email">
          <input id="new-email" type="email" autoComplete="email" value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)} required className={inputClass} />
        </Field>
        <Field label={t('settings.email.confirmPassword')} htmlFor="email-password">
          <input id="email-password" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
        </Field>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? t('settings.email.submitting') : t('settings.email.submit')}
          </button>
          <NoticeText notice={notice} />
        </div>
      </form>
    </SettingsCard>
  );
}

function PasswordForm() {
  const { t } = useLocale();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useNotice();

  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setNotice({ type: 'error', text: t('settings.password.mismatch') });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await http.post('/api/admin/change-password', { currentPassword: current, newPassword: next });
      setNotice({ type: 'success', text: t('settings.password.success') });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (error) {
      setNotice({ type: 'error', text: toErrorMessage(error, t('settings.password.failed')) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard title={t('settings.password.title')} description={t('settings.password.hint')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('settings.password.current')} htmlFor="current-password">
          <input id="current-password" type="password" autoComplete="current-password" value={current}
            onChange={(e) => setCurrent(e.target.value)} required className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('settings.password.new')}
            htmlFor="new-password"
            hint={t('settings.password.minLength', { min: String(MIN_PASSWORD_LENGTH) })}
          >
            <input id="new-password" type="password" autoComplete="new-password" value={next}
              minLength={MIN_PASSWORD_LENGTH} onChange={(e) => setNext(e.target.value)} required
              aria-invalid={tooShort} className={inputClass} />
          </Field>
          <Field
            label={t('settings.password.confirm')}
            htmlFor="confirm-password"
            hint={mismatch ? t('settings.password.mismatch') : undefined}
          >
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required aria-invalid={mismatch}
              className={`${inputClass} ${mismatch ? 'border-red-500' : ''}`} />
          </Field>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={busy || mismatch || tooShort} className={primaryButtonClass}>
            {busy ? t('settings.password.submitting') : t('settings.password.submit')}
          </button>
          <NoticeText notice={notice} />
        </div>
      </form>
    </SettingsCard>
  );
}
