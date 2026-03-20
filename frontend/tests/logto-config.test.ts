import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('logto config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses default values when env vars are not set', async () => {
    delete process.env.LOGTO_ENDPOINT;
    delete process.env.LOGTO_APP_ID;
    delete process.env.LOGTO_APP_SECRET;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.LOGTO_COOKIE_SECRET;
    // Bypass readonly constraint for testing
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'development';

    const { logtoConfig } = await import('@/lib/logto');
    expect(logtoConfig.endpoint).toBe('http://localhost:3001');
    expect(logtoConfig.appId).toBe('');
    expect(logtoConfig.appSecret).toBe('');
    expect(logtoConfig.baseUrl).toBe('http://localhost:3000');
    expect(logtoConfig.cookieSecret).toBe(
      'complex_password_at_least_32_characters_long_for_dev'
    );
    expect(logtoConfig.cookieSecure).toBe(false);
  });

  it('uses env vars when set', async () => {
    process.env.LOGTO_ENDPOINT = 'https://auth.example.com';
    process.env.LOGTO_APP_ID = 'my-app-id';
    process.env.LOGTO_APP_SECRET = 'my-secret';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://myapp.example.com';
    process.env.LOGTO_COOKIE_SECRET =
      'a_real_32_char_secret_for_production!!';
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'production';

    const { logtoConfig } = await import('@/lib/logto');
    expect(logtoConfig.endpoint).toBe('https://auth.example.com');
    expect(logtoConfig.appId).toBe('my-app-id');
    expect(logtoConfig.appSecret).toBe('my-secret');
    expect(logtoConfig.baseUrl).toBe('https://myapp.example.com');
    expect(logtoConfig.cookieSecret).toBe(
      'a_real_32_char_secret_for_production!!'
    );
    expect(logtoConfig.cookieSecure).toBe(true);
  });

  it('sets cookieSecure=true only in production', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'production';
    const { logtoConfig: prodConfig } = await import('@/lib/logto');
    expect(prodConfig.cookieSecure).toBe(true);

    vi.resetModules();
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'development';
    const { logtoConfig: devConfig } = await import('@/lib/logto');
    expect(devConfig.cookieSecure).toBe(false);
  });
});
