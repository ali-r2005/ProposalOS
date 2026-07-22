'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { http } from '@/lib/utils/http';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminSettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
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
    return <div className="p-8 text-[var(--app-text)]">Loading...</div>;
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    try {
      await http.post('/api/admin/change-password', {
        currentPassword,
        newPassword,
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to change password',
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

      setMessage({ type: 'success', text: 'Email changed successfully! Please log in again.' });
      setNewEmail('');
      setEmailPassword('');
      setTimeout(() => logout(), 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to change email',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <a href="/" className="text-sm text-[var(--app-muted)] hover:text-[var(--app-accent)] transition">
              ← Back to templates
            </a>
            <h1 className="text-4xl font-bold text-[var(--app-text)] mt-2 mb-2">Admin Settings</h1>
            <p className="text-[var(--app-muted)]">Logged in as: {user.email}</p>
          </div>
          <ThemeToggle />
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
            <h2 className="text-2xl font-bold text-[var(--app-text)] mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  Current Password
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
                  New Password
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
                  Confirm New Password
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
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Change Email Section */}
          <div className="border border-[var(--app-border)] rounded-lg p-6">
            <h2 className="text-2xl font-bold text-[var(--app-text)] mb-4">Change Email</h2>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
                  New Email
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
                  Password (to confirm)
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
                {loading ? 'Changing...' : 'Change Email'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
