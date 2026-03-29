import type { LogtoNextConfig } from '@logto/next';

const DEV_COOKIE_SECRET =
  'complex_password_at_least_32_characters_long_for_dev';
let hasWarnedAboutDevCookieSecret = false;

function getCookieSecret(): string {
  const secret = process.env.LOGTO_COOKIE_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'LOGTO_COOKIE_SECRET environment variable is required in production'
    );
  }

  if (!hasWarnedAboutDevCookieSecret) {
    hasWarnedAboutDevCookieSecret = true;
    console.warn(
      '[logto] LOGTO_COOKIE_SECRET is not set — using insecure dev fallback. ' +
        'Do NOT use this in production.'
    );
  }

  return DEV_COOKIE_SECRET;
}

// Build-time module evaluation happens during `next build`, including route-data
// collection. Resolve the cookie secret lazily so production builds can succeed
// when the secret is injected only at container runtime.
export function getLogtoConfig(): LogtoNextConfig {
  return {
    endpoint: process.env.LOGTO_ENDPOINT || 'http://localhost:3301',
    appId: process.env.LOGTO_APP_ID || '',
    appSecret: process.env.LOGTO_APP_SECRET || '',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    cookieSecret: getCookieSecret(),
    cookieSecure: process.env.NODE_ENV === 'production',
  };
}
