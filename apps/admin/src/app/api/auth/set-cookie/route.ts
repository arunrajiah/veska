import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/set-cookie
 * Receives the session token from the client after a successful login and
 * stores it in an HttpOnly; Secure; SameSite=Strict cookie so it is never
 * accessible to JavaScript (XSS-safe).
 */
export async function POST(req: NextRequest) {
  const { token, identityId, tenantId, onboardingComplete } = (await req.json()) as {
    token?: string;
    identityId?: string;
    tenantId?: string;
    onboardingComplete?: boolean;
  };

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set('veska_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  const week = 60 * 60 * 24 * 7;
  // Read by dashboard server components to build the X-Veska-Identity-Id header.
  if (identityId) {
    cookieStore.set('veska_identity', identityId, { sameSite: 'strict', path: '/', maxAge: week });
  }
  if (tenantId) {
    cookieStore.set('veska_tenant', tenantId, { sameSite: 'strict', path: '/', maxAge: week });
  }

  // An already-configured tenant must not be pushed back through the setup wizard.
  if (onboardingComplete) {
    cookieStore.set('veska_onboarding_done', '1', { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }

  return NextResponse.json({ ok: true });
}
