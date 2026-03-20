import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware to protect authenticated routes (/dashboard, /editor/*).
 *
 * When NEXT_PUBLIC_AUTH_ENABLED is not "true" (default for dev), all
 * requests pass through without auth checks so the app works without
 * a running Logto instance.
 *
 * When auth IS enabled, we check for the Logto session cookie.
 * If missing, redirect to the sign-in flow.
 */
export function middleware(request: NextRequest) {
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

  if (!authEnabled) {
    return NextResponse.next();
  }

  // Logto stores its session in a cookie keyed by `logto_<appId>`.
  // We check for *any* cookie starting with `logto_` as a lightweight
  // indicator that a session exists. Full validation happens server-side
  // via getLogtoContext().
  const hasLogtoSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('logto_'));

  if (!hasLogtoSession) {
    const signInUrl = new URL('/api/logto/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/editor/:path*'],
};
