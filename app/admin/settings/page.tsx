'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { http } from '@/lib/utils/http';
import { useLocale } from '@/components/LocaleProvider';

export default function AdminSettingsPage() {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Change email form
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  if (!user) {
    return <div className="p-8 text-[var(--app-text)]">{t('settings.loading')}</div>;
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('settings.password.mismatch') });
      setLoading(false);
      return;
    }

    try {
      await http.post('/api/admin/change-password', {
        currentPassword,
        newPassword,
      });

      setMessage({ type: 'success', text: t('settings.password.success') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t('settings.password.failed'),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await http.post('/api/admin/change-email', {
        newEmail,
        password: emailPassword,
      });

      setMessage({ type: 'success', text: t('settings.email.success') });
      setNewEmail('');
      setEmailPassword('');
      setTimeout(() => logout(), 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t('settings.email.failed'),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--app-text)] mb-2">{t('settings.title')}</h1>
        <p className="text-[var(--app-muted)]">{t('settings.loggedInAs', { email: user.email })}</p>
      </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          {/* Change Password Section */}
          <div className="border border-[var(--app-border)] rounded-lg p-6">
            <h2 className="text-2xl font-bold text-[var(--app-text)] mb-4">{t('settings.password.title')}</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  {t('settings.password.current')}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-panel)] text-[var(--app-text)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  {t('settings.password.new')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-panel)] text-[var(--app-text)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  {t('settings.password.confirm')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-panel)] text-[var(--app-text)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-[var(--app-accent)] text-white font-medium rounded-lg disabled:opacity-50"
              >
                {loading ? t('settings.password.submitting') : t('settings.password.submit')}
              </button>
            </form>
          </div>

          {/* Change Email Section */}
          <div className="border border-[var(--app-border)] rounded-lg p-6">
            <h2 className="text-2xl font-bold text-[var(--app-text)] mb-4">{t('settings.email.title')}</h2>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  {t('settings.email.new')}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-panel)] text-[var(--app-text)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  {t('settings.email.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-panel)] text-[var(--app-text)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-[var(--app-accent)] text-white font-medium rounded-lg disabled:opacity-50"
              >
                {loading ? t('settings.email.submitting') : t('settings.email.submit')}
              </button>
            </form>
          </div>
        </div>
    </div>
  );
}
