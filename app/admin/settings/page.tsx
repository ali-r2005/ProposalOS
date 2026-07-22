'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { http } from '@/lib/utils/http';
import { useRouter } from 'next/navigation';

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
    return <div className="p-8 text-[var(--color-text-primary)]">Loading...</div>;
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
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">Admin Settings</h1>
          <p className="text-[var(--color-text-secondary)]">Logged in as: {user.email}</p>
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
          <div className="border border-[var(--color-text-secondary)] rounded-lg p-6">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--color-text-secondary)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--color-text-secondary)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--color-text-secondary)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-[var(--brand-primary)] text-white font-medium rounded-lg disabled:opacity-50"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Change Email Section */}
          <div className="border border-[var(--color-text-secondary)] rounded-lg p-6">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Change Email</h2>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  New Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--color-text-secondary)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Password (to confirm)
                </label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--color-text-secondary)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-[var(--brand-primary)] text-white font-medium rounded-lg disabled:opacity-50"
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
