'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Smartphone } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Step = 'credentials' | 'mfa';

export function LoginClient() {
  const router = useRouter();

  // Credentials step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // MFA step
  const [step, setStep] = useState<Step>('credentials');
  const [tempToken, setTempToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        token?: string;
        mfaRequired?: boolean;
        tempToken?: string;
        message?: string;
        user?: { id: string; tenantId: string; permissions?: string[]; role?: string };
      };

      if (!res.ok) {
        setError(data.message ?? 'Invalid email or password.');
        return;
      }

      if (data.mfaRequired && data.tempToken) {
        setTempToken(data.tempToken);
        setStep('mfa');
        return;
      }

      if (data.token) {
        localStorage.setItem('veska_token', data.token);
        document.cookie = `veska_session=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        if (data.user) {
          localStorage.setItem('veska_user', JSON.stringify(data.user));
        }
        router.push('/dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/mfa/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code: mfaCode }),
      });
      const data = (await res.json()) as {
        token?: string;
        message?: string;
        user?: { id: string; tenantId: string; permissions?: string[]; role?: string };
      };

      if (!res.ok) {
        setError(data.message ?? 'Invalid verification code.');
        return;
      }

      if (data.token) {
        localStorage.setItem('veska_token', data.token);
        document.cookie = `veska_session=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        if (data.user) {
          localStorage.setItem('veska_user', JSON.stringify(data.user));
        }
        router.push('/dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSsoClick(provider: string) {
    showToast(`SSO configured by your admin`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="w-full max-w-sm bg-white shadow-lg rounded-2xl p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Veska</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'credentials' ? 'Sign in to your workspace' : 'Two-factor authentication'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Credentials form */}
        {step === 'credentials' && (
          <form onSubmit={(e) => void handleSignIn(e)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-700">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        )}

        {/* MFA form */}
        {step === 'mfa' && (
          <form onSubmit={(e) => void handleMfa(e)} className="space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 mx-auto mb-2">
              <Smartphone size={22} className="text-indigo-600" />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Enter the 6-digit code from your authenticator app.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 text-center tracking-[0.4em] font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verifying…
                </>
              ) : (
                'Verify & sign in'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('credentials'); setError(''); setMfaCode(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              Back to sign in
            </button>
          </form>
        )}

        {/* SSO Divider + Buttons */}
        {step === 'credentials' && (
          <>
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400">or continue with</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <div className="space-y-2.5">
              <SsoButton
                provider="Google"
                onClick={() => handleSsoClick('google')}
                icon={
                  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                }
              />
              <SsoButton
                provider="GitHub"
                onClick={() => handleSsoClick('github')}
                icon={
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-800" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                }
              />
              <SsoButton
                provider="Microsoft"
                onClick={() => handleSsoClick('microsoft')}
                icon={
                  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                    <path fill="#F25022" d="M1 1h10v10H1z" />
                    <path fill="#00A4EF" d="M13 1h10v10H13z" />
                    <path fill="#7FBA00" d="M1 13h10v10H1z" />
                    <path fill="#FFB900" d="M13 13h10v10H13z" />
                  </svg>
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SsoButton({
  provider,
  onClick,
  icon,
}: {
  provider: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {icon}
      <span>Continue with {provider}</span>
    </button>
  );
}
