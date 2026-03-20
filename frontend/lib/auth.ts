import {
  getLogtoContext,
  getAccessToken,
} from '@logto/next/server-actions';
import { logtoConfig } from './logto';

/**
 * Whether auth is enabled. When false (default for dev), all auth checks
 * are bypassed and the app behaves as if the user is always signed in.
 */
export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
}

/**
 * Get the current user's authentication context.
 *
 * In dev mode (AUTH_ENABLED != "true"), returns a fake authenticated context
 * so the app is usable without a running Logto instance.
 *
 * Call this from Server Components or Server Actions only.
 */
export async function getAuthContext() {
  if (!isAuthEnabled()) {
    return {
      isAuthenticated: true,
      claims: {
        sub: 'dev-user',
        iss: 'dev',
        aud: 'dev',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        at_hash: '',
      },
    };
  }

  return getLogtoContext(logtoConfig);
}

/**
 * Get a Bearer access token for the current user.
 *
 * In dev mode returns undefined — the backend defaults to a dev user
 * when AUTH_ENABLED=false.
 *
 * Call this from Server Actions or API routes only (not RSC).
 */
export async function getAuthAccessToken(): Promise<string | undefined> {
  if (!isAuthEnabled()) {
    return undefined;
  }

  try {
    return await getAccessToken(logtoConfig);
  } catch {
    return undefined;
  }
}
