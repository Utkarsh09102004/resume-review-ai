import {
  getLogtoContext,
  getAccessToken,
  getAccessTokenRSC,
} from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { logtoConfig } from './logto';

/**
 * Whether auth is enabled. When false (default for dev), all auth checks
 * are bypassed and the app behaves as if the user is always signed in.
 */
export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
}

const getCachedAuthContext = cache(async () => {
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
});

/**
 * Get the current user's authentication context.
 *
 * In dev mode (AUTH_ENABLED != "true"), returns a fake authenticated context
 * so the app is usable without a running Logto instance.
 *
 * Call this from Server Components or Server Actions only.
 */
export async function getAuthContext() {
  return getCachedAuthContext();
}

/**
 * Display-friendly user info for the UI (name + optional avatar).
 */
export interface UserDisplayInfo {
  name: string;
  avatarUrl?: string;
}

/**
 * Get display info for the current user.
 *
 * In dev mode returns a generic "User" name. When auth is enabled,
 * extracts name/picture from the Logto ID-token claims.
 *
 * Call this from Server Components or Server Actions only.
 */
export async function getUserDisplayInfo(): Promise<UserDisplayInfo | null> {
  if (!isAuthEnabled()) {
    return { name: 'User' };
  }

  const ctx = await getCachedAuthContext();
  if (!ctx.isAuthenticated || !ctx.claims) {
    return null;
  }

  // The `profile` scope (requested by default) puts `name` and `picture`
  // in the ID token, but the SDK type only declares JWT-standard fields.
  const claims = ctx.claims as Record<string, unknown>;
  const name =
    typeof claims.name === 'string' && claims.name ? claims.name : 'User';
  const avatarUrl =
    typeof claims.picture === 'string' ? claims.picture : undefined;

  return { name, avatarUrl };
}

export async function requireUserDisplayInfo(): Promise<UserDisplayInfo> {
  const user = await getUserDisplayInfo();

  if (!user) {
    redirect('/api/logto/sign-in');
  }

  return user;
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

/**
 * Get a Bearer access token for the current user from a Server Component.
 *
 * In dev mode returns undefined — the backend defaults to a dev user
 * when AUTH_ENABLED=false.
 */
export async function getAuthAccessTokenRSC(): Promise<string | undefined> {
  if (!isAuthEnabled()) {
    return undefined;
  }

  try {
    return await getAccessTokenRSC(logtoConfig);
  } catch {
    return undefined;
  }
}

/**
 * Resolve a Bearer access token for any server-side execution path.
 *
 * Server Actions and Route Handlers can use `getAccessToken`, while Server
 * Components require the RSC variant. Try both so protected backend calls
 * share one token lookup path regardless of the current server boundary.
 */
export async function getAuthAccessTokenForServer(): Promise<
  string | undefined
> {
  const token = await getAuthAccessToken();

  if (token) {
    return token;
  }

  return getAuthAccessTokenRSC();
}
