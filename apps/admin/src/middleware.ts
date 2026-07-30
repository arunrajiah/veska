import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('veska_session')?.value;
  const onboardingDone = request.cookies.get('veska_onboarding_done')?.value;

  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect first-time users to onboarding
    if (!onboardingDone) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // Redirect logged-in users away from login/setup
  // Note: /forgot-password, /reset-password, and /register are always public — no redirect needed
  if ((pathname === '/login' || pathname === '/setup' || pathname === '/') && token) {
    // If onboarding not done, send to onboarding; otherwise dashboard
    if (!onboardingDone) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.ico).*)',
  ],
};
