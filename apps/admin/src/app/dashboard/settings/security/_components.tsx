'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Key,
  LogOut,
  Smartphone,
  ChevronRight,
  Copy,
  Palette,
} from 'lucide-react';
import { useTheme, type Theme } from '@/components/theme-provider.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('veska_token') ?? '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, show };
}

function Toast({ toast }: { toast: { msg: string; type: 'success' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg ${
        toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'
      }`}
    >
      {toast.msg}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Two-Factor Authentication
// ---------------------------------------------------------------------------
type MfaStep = 'idle' | 'setup' | 'verify' | 'done';

function TwoFactorSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [step, setStep] = useState<MfaStep>('idle');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Mock initial status fetch
  useEffect(() => {
    fetch(`${API_BASE}/auth/mfa/status`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setMfaEnabled(d.enabled ?? false))
      .catch(() => setMfaEnabled(false));
  }, []);

  async function handleSetup() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/setup`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const d = (await res.json()) as { otpAuthUrl?: string; qrCodeDataUrl?: string; secret?: string; message?: string };
      if (!res.ok) { showToast(d.message ?? 'Setup failed', 'error'); return; }
      setQrCodeDataUrl(d.qrCodeDataUrl ?? '');
      setSecret(d.secret ?? '');
      setStep('setup');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ token: verifyCode }),
      });
      const d = (await res.json()) as { ok?: boolean; backupCodes?: string[]; message?: string; error?: string };
      if (!res.ok) { showToast(d.error ?? d.message ?? 'Invalid code', 'error'); return; }
      setBackupCodes(d.backupCodes ?? []);
      setMfaEnabled(true);
      setStep('done');
      showToast('2FA enabled successfully');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/disable`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ token: disableCode }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) { showToast(d.error ?? d.message ?? 'Failed to disable 2FA', 'error'); return; }
      setMfaEnabled(false);
      setStep('idle');
      setShowDisableModal(false);
      setDisableCode('');
      showToast('2FA disabled');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  }

  function copyBackupCodes() {
    void navigator.clipboard.writeText(backupCodes.join('\n'));
    showToast('Backup codes copied');
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Smartphone size={18} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Two-Factor Authentication</h2>
          <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
        </div>
        <div className="ml-auto">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              mfaEnabled
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${mfaEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
            {mfaEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Idle state */}
      {step === 'idle' && !mfaEnabled && (
        <button
          onClick={() => void handleSetup()}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Key size={14} />}
          Enable 2FA
        </button>
      )}

      {/* Setup: show QR */}
      {step === 'setup' && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
          </p>
          <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="w-48 h-48 rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-lg text-xs text-gray-400">
                Loading QR code…
              </div>
            )}
            {secret && (
              <div className="w-full max-w-xs">
                <p className="text-xs text-gray-500 mb-1 text-center">Or enter this key manually:</p>
                <p className="text-xs text-gray-700 break-all text-center font-mono bg-white border border-gray-200 rounded px-2 py-1 select-all">
                  {secret}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setStep('verify')}
            className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Next: Enter code
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Verify code */}
      {step === 'verify' && (
        <form onSubmit={(e) => void handleVerify(e)} className="space-y-4 max-w-xs">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              6-digit verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="000000"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || verifyCode.length !== 6}
              className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Verify & activate
            </button>
            <button
              type="button"
              onClick={() => setStep('setup')}
              className="text-sm text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Back
            </button>
          </div>
        </form>
      )}

      {/* Done: backup codes */}
      {step === 'done' && backupCodes.length > 0 && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-medium text-amber-800 mb-1">Save your backup codes</p>
            <p className="text-xs text-amber-700">
              Store these in a safe place. Each code can only be used once.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code) => (
              <div
                key={code}
                className="font-mono text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center"
              >
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={copyBackupCodes}
            className="inline-flex items-center gap-2 text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Copy size={14} />
            Copy backup codes
          </button>
        </div>
      )}

      {/* Disable button when enabled */}
      {mfaEnabled && step !== 'setup' && step !== 'verify' && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowDisableModal(true)}
            className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Disable 2FA
          </button>
        </div>
      )}

      {/* Disable confirmation modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Disable two-factor authentication?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter your current authentication code to confirm.
            </p>
            <form onSubmit={(e) => void handleDisable(e)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {useBackupCode ? 'Backup code' : 'Verification code'}
                </label>
                <input
                  type="text"
                  inputMode={useBackupCode ? 'text' : 'numeric'}
                  maxLength={useBackupCode ? 8 : 6}
                  required
                  autoFocus
                  value={disableCode}
                  onChange={(e) => setDisableCode(useBackupCode ? e.target.value : e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={useBackupCode ? 'ABCDEFGH' : '000000'}
                />
              </div>
              <button
                type="button"
                onClick={() => { setUseBackupCode((v) => !v); setDisableCode(''); }}
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
              </button>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || disableCode.length < (useBackupCode ? 1 : 6)}
                  className="flex-1 text-sm bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  Yes, disable
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDisableModal(false); setDisableCode(''); setUseBackupCode(false); }}
                  className="flex-1 text-sm border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Active Sessions
// ---------------------------------------------------------------------------
interface Session {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastSeen: string;
  isCurrent: boolean;
}

function ActiveSessionsSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/sessions`, { headers: authHeaders() });
      const d = (await res.json()) as Session[] | { sessions?: Session[] };
      const list = Array.isArray(d) ? d : (d.sessions ?? []);
      setSessions(list);
    } catch {
      // keep empty on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  async function revokeSession(id: string) {
    setRevoking(id);
    try {
      const res = await fetch(`${API_BASE}/auth/sessions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) { showToast('Failed to revoke session', 'error'); return; }
      setSessions((s) => s.filter((x) => x.id !== id));
      showToast('Session revoked');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAll() {
    setRevoking('all');
    try {
      const res = await fetch(`${API_BASE}/auth/sessions/revoke-all`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) { showToast('Failed to revoke sessions', 'error'); return; }
      setSessions((s) => s.filter((x) => x.isCurrent));
      showToast('All other sessions revoked');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setRevoking(null);
    }
  }

  function truncate(str: string, n: number) {
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  function fmt(iso: string) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <LogOut size={18} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Active Sessions</h2>
          <p className="text-xs text-gray-500">Devices and browsers currently signed in</p>
        </div>
        {sessions.filter((s) => !s.isCurrent).length > 0 && (
          <button
            onClick={() => void revokeAll()}
            disabled={revoking === 'all'}
            className="ml-auto text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {revoking === 'all' && <span className="w-3 h-3 border border-red-400 border-t-red-600 rounded-full animate-spin" />}
            Revoke all other sessions
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-gray-400">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="text-sm text-gray-500 py-4 text-center">No active sessions found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">IP Address</th>
                <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Browser / Device</th>
                <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Created</th>
                <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Last seen</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map((s) => (
                <tr key={s.id} className={s.isCurrent ? 'bg-green-50/40' : ''}>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-700">{s.ipAddress}</td>
                  <td className="py-3 pr-4 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      {truncate(s.userAgent, 48)}
                      {s.isCurrent && (
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{fmt(s.createdAt)}</td>
                  <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{fmt(s.lastSeen)}</td>
                  <td className="py-3 text-right">
                    {!s.isCurrent && (
                      <button
                        onClick={() => void revokeSession(s.id)}
                        disabled={revoking === s.id}
                        className="text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center gap-1 ml-auto"
                      >
                        {revoking === s.id ? (
                          <span className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        ) : (
                          <LogOut size={11} />
                        )}
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 3: SSO Configuration
// ---------------------------------------------------------------------------
type SsoProvider = 'google' | 'github' | 'microsoft' | 'oidc';

interface SsoConfig {
  provider: SsoProvider;
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  enabled: boolean;
}

const PROVIDER_LABELS: Record<SsoProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  microsoft: 'Microsoft',
  oidc: 'Custom OIDC',
};

function SsoConfigSection({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [config, setConfig] = useState<SsoConfig>({
    provider: 'google',
    clientId: '',
    clientSecret: '',
    discoveryUrl: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/auth/sso/config`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d: Partial<SsoConfig>) => {
        setConfig((prev) => ({ ...prev, ...d }));
      })
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/auth/sso/config`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(config),
      });
      const d = (await res.json()) as { message?: string };
      if (!res.ok) { showToast(d.message ?? 'Failed to save SSO config', 'error'); return; }
      showToast('SSO configuration saved');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Shield size={18} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">SSO Configuration</h2>
          <p className="text-xs text-gray-500">Configure single sign-on for your organization</p>
        </div>
        {/* Enabled toggle */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">Enabled</span>
          <button
            type="button"
            onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              config.enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                config.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-4">Loading SSO configuration…</div>
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4 max-w-lg">
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Provider</label>
            <select
              value={config.provider}
              onChange={(e) => setConfig((c) => ({ ...c, provider: e.target.value as SsoProvider }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {(Object.keys(PROVIDER_LABELS) as SsoProvider[]).map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client ID</label>
            <input
              type="text"
              value={config.clientId}
              onChange={(e) => setConfig((c) => ({ ...c, clientId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="your-client-id"
            />
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client Secret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={config.clientSecret}
                onChange={(e) => setConfig((c) => ({ ...c, clientSecret: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Discovery URL — only for Custom OIDC */}
          {config.provider === 'oidc' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Discovery URL
              </label>
              <input
                type="url"
                value={config.discoveryUrl}
                onChange={(e) => setConfig((c) => ({ ...c, discoveryUrl: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://your-idp.example.com/.well-known/openid-configuration"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Save configuration
          </button>
        </form>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Theme Section
// ---------------------------------------------------------------------------
const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use light mode' },
  { value: 'dark',  label: 'Dark',  description: 'Always use dark mode' },
  { value: 'system', label: 'System', description: 'Follow your OS preference' },
];

function ThemeSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Palette size={18} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Theme</h2>
          <p className="text-xs text-gray-500">Choose your preferred color scheme</p>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap">
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex flex-col gap-0.5 px-4 py-3 rounded-xl border text-left transition-colors ${
              theme === opt.value
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs text-gray-500">{opt.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------
export function SecuritySettingsClient() {
  const { toast, show: showToast } = useToast();

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Toast toast={toast} />

      <div className="flex items-center gap-3 mb-8">
        <Shield size={22} className="text-indigo-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Security</h1>
      </div>

      <div className="space-y-6">
        <ThemeSection />
        <TwoFactorSection showToast={showToast} />
        <ActiveSessionsSection showToast={showToast} />
        <SsoConfigSection showToast={showToast} />
      </div>
    </div>
  );
}
