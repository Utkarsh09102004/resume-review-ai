import type { LogtoNextConfig } from '@logto/next';

export const logtoConfig: LogtoNextConfig = {
  endpoint: process.env.LOGTO_ENDPOINT || 'http://localhost:3001',
  appId: process.env.LOGTO_APP_ID || '',
  appSecret: process.env.LOGTO_APP_SECRET || '',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  cookieSecret:
    process.env.LOGTO_COOKIE_SECRET ||
    'complex_password_at_least_32_characters_long_for_dev',
  cookieSecure: process.env.NODE_ENV === 'production',
};
