'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Shield, LogOut, X, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';

type Session = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  userAgent?: string;
  ipAddress?: string;
};

type UserProfile = {
  id?: string;
  name?: string;
  email?: string;
};

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('veska_token') ?? '';
}

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
    'x-tenant-id': TENANT_ID,
  };
}

// ── Toast ────────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error';

function Toast({ message, kind, onClose }: { message: string; kind: ToastKind; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white transition-all ${
        kind === 'success' ? 'bg-emerald-600' : 'bg-red-600'
      }`}
    >
      {kind === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileSection({ profile }: { profile: UserProfile }) {
  return (
    <SectionCard title="Profile" icon={<User size={15} />}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xl select-none">
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{profile.name ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{profile.email ?? '—'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Display name</label>
            <p className="text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              {profile.name ?? '—'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email address</label>
            <p className="text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              {profile.email ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Password change ───────────────────────────────────────────────────────────

function PasswordSection({ onToast }: { onToast: (msg: string, kind: ToastKind) => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      onToast('Password must be at least 8 characters.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/me/password`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        onToast(data.message ?? 'Failed to update password.', 'error');
        return;
      }
      onToast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      onToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="Change Password" icon={<Lock size={15} />}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Current password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">New password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="Min. 8 characters"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm new password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {loading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          Update password
        </button>
      </form>
    </SectionCard>
  );
}

// ── MFA section ───────────────────────────────────────────────────────────────

type MfaSetupData = { secret: string; qrCodeUrl: string };

function MfaSection({ onToast }: { onToast: (msg: string, kind: ToastKind) => void }) {
  const [mfaEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function handleSetupMfa() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/mfa/setup`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        onToast(data.message ?? 'Failed to start MFA setup.', 'error');
        return;
      }
      const data = (await res.json()) as MfaSetupData;
      setSetupData(data);
      setShowModal(true);
    } catch {
      onToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SectionCard title="Two-Factor Authentication" icon={<Smartphone size={15} />}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 font-medium">
              MFA is currently{' '}
              <span className={mfaEnabled ? 'text-emerald-600' : 'text-gray-400'}>
                {mfaEnabled ? 'enabled' : 'disabled'}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Add an extra layer of security to your account using an authenticator app.
            </p>
          </div>
          {!mfaEnabled && (
            <button
              onClick={() => void handleSetupMfa()}
              disabled={loading}
              className="flex-shrink-0 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Set up MFA
            </button>
          )}
        </div>
      </SectionCard>

      {/* QR Code modal */}
      {showModal && setupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Scan QR code</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Scan this QR code with your authenticator app (e.g. Google Authenticator, Authy).
            </p>
            {setupData.qrCodeUrl ? (
              <div className="flex justify-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setupData.qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
              </div>
            ) : null}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Manual entry secret</p>
              <p className="text-xs font-mono text-gray-800 break-all">{setupData.secret}</p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sessions list ─────────────────────────────────────────────────────────────

function SessionsSection({ onToast }: { onToast: (msg: string, kind: ToastKind) => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/sessions`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as Session[];
        setSessions(data);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  async function handleRevoke(sessionId: string) {
    setRevoking(sessionId);
    try {
      const res = await fetch(`${API_BASE}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        onToast('Failed to revoke session.', 'error');
        return;
      }
      onToast('Session revoked.', 'success');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      onToast('Network error. Please try again.', 'error');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <SectionCard title="Active Sessions" icon={<Shield size={15} />}>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No active sessions found.</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-400 border-b border-gray-100">
                <th className="pb-2 pr-4">IP Address</th>
                <th className="pb-2 pr-4">User Agent</th>
                <th className="pb-2 pr-4">Created</th>
                <th className="pb-2 pr-4">Last active</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 pr-4 text-gray-700">{session.ipAddress ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-gray-500 max-w-[200px] truncate" title={session.userAgent}>
                    {session.userAgent ?? '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                    {new Date(session.lastUsedAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => void handleRevoke(session.id)}
                      disabled={revoking === session.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                    >
                      {revoking === session.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// ── Sign out ──────────────────────────────────────────────────────────────────

function SignOutSection({ onToast }: { onToast: (msg: string, kind: ToastKind) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // proceed regardless
    } finally {
      localStorage.removeItem('veska_token');
      document.cookie = 'veska_session=; path=/; max-age=0';
      router.push('/login');
    }
  }

  return (
    <SectionCard title="Sign Out" icon={<LogOut size={15} />}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Sign out of your account on this device.</p>
        <button
          onClick={() => void handleSignOut()}
          disabled={loading}
          className="flex-shrink-0 flex items-center gap-2 border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
          ) : (
            <LogOut size={14} />
          )}
          Sign out
        </button>
      </div>
    </SectionCard>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AccountSettingsClient() {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const [profile, setProfile] = useState<UserProfile>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('veska_user');
      if (raw) {
        const parsed = JSON.parse(raw) as UserProfile;
        setProfile(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  function showToast(message: string, kind: ToastKind) {
    setToast({ message, kind });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onClose={() => setToast(null)}
        />
      )}

      <div>
        <h1 className="text-xl font-semibold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile, security, and active sessions.</p>
      </div>

      <ProfileSection profile={profile} />
      <PasswordSection onToast={showToast} />
      <MfaSection onToast={showToast} />
      <SessionsSection onToast={showToast} />
      <SignOutSection onToast={showToast} />
    </div>
  );
}
