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
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'development';

    const { getLogtoConfig } = await import('@/lib/logto');
    const logtoConfig = getLogtoConfig();
    expect(logtoConfig.endpoint).toBe('http://localhost:3301');
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

    const { getLogtoConfig } = await import('@/lib/logto');
    const logtoConfig = getLogtoConfig();
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
    process.env.LOGTO_COOKIE_SECRET =
      'a_real_32_char_secret_for_production!!';
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'production';
    const { getLogtoConfig } = await import('@/lib/logto');
    const prodConfig = getLogtoConfig();
    expect(prodConfig.cookieSecure).toBe(true);

    vi.resetModules();
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'development';
    const { getLogtoConfig: getDevLogtoConfig } = await import('@/lib/logto');
    const devConfig = getDevLogtoConfig();
    expect(devConfig.cookieSecure).toBe(false);
  });

  it('does not throw on import when LOGTO_COOKIE_SECRET is missing in production', async () => {
    delete process.env.LOGTO_COOKIE_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'production';

    await expect(import('@/lib/logto')).resolves.toBeDefined();
  });

  it('throws when LOGTO_COOKIE_SECRET is resolved at runtime in production without a value', async () => {
    delete process.env.LOGTO_COOKIE_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'production';

    const { getLogtoConfig } = await import('@/lib/logto');

    expect(() => getLogtoConfig()).toThrow(
      'LOGTO_COOKIE_SECRET environment variable is required in production'
    );
  });

  it('warns when using dev fallback cookie secret', async () => {
    delete process.env.LOGTO_COOKIE_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV =
      'development';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { getLogtoConfig } = await import('@/lib/logto');
    const logtoConfig = getLogtoConfig();
    expect(logtoConfig.cookieSecret).toBe(
      'complex_password_at_least_32_characters_long_for_dev'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('LOGTO_COOKIE_SECRET is not set')
    );
    warnSpy.mockRestore();
  });
});
