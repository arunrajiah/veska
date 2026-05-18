import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/set-cookie
 * Receives the session token from the client after a successful login and
 * stores it in an HttpOnly; Secure; SameSite=Strict cookie so it is never
 * accessible to JavaScript (XSS-safe).
 */
export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };

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

  return NextResponse.json({ ok: true });
}
