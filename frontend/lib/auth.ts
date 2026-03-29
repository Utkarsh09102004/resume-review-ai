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

  const ctx = await getLogtoContext(logtoConfig);
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
