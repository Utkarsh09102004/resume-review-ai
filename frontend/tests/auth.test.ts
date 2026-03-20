import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Keep a reference to the mock so we can override per-test
const mockGetAccessToken = vi.fn(async () => 'mock-token');

// Mock @logto/next/server-actions so it doesn't try to import next/navigation
vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn(async () => ({
    isAuthenticated: true,
    claims: { sub: 'real-user' },
  })),
  getAccessToken: () => mockGetAccessToken(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handleSignIn: vi.fn(),
}));

describe('auth utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockGetAccessToken.mockResolvedValue('mock-token');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isAuthEnabled', () => {
    it('returns false when NEXT_PUBLIC_AUTH_ENABLED is not set', async () => {
      delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
      const { isAuthEnabled } = await import('@/lib/auth');
      expect(isAuthEnabled()).toBe(false);
    });

    it('returns false when NEXT_PUBLIC_AUTH_ENABLED is "false"', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'false';
      const { isAuthEnabled } = await import('@/lib/auth');
      expect(isAuthEnabled()).toBe(false);
    });

    it('returns true when NEXT_PUBLIC_AUTH_ENABLED is "true"', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { isAuthEnabled } = await import('@/lib/auth');
      expect(isAuthEnabled()).toBe(true);
    });

    it('returns false for truthy-but-not-"true" values like "1" or "yes"', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = '1';
      const { isAuthEnabled: isAuth1 } = await import('@/lib/auth');
      expect(isAuth1()).toBe(false);

      vi.resetModules();
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'yes';
      const { isAuthEnabled: isAuth2 } = await import('@/lib/auth');
      expect(isAuth2()).toBe(false);
    });
  });

  describe('getAuthContext — dev mode (auth disabled)', () => {
    it('returns a fake authenticated context', async () => {
      delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
      const { getAuthContext } = await import('@/lib/auth');
      const ctx = await getAuthContext();
      expect(ctx.isAuthenticated).toBe(true);
      expect(ctx.claims?.sub).toBe('dev-user');
    });

    it('returns valid JWT-like claim fields (iss, aud, exp, iat)', async () => {
      delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
      const { getAuthContext } = await import('@/lib/auth');
      const ctx = await getAuthContext();
      expect(ctx.claims).toBeDefined();
      expect(ctx.claims!.iss).toBe('dev');
      expect(ctx.claims!.aud).toBe('dev');
      expect(typeof ctx.claims!.exp).toBe('number');
      expect(typeof ctx.claims!.iat).toBe('number');
      // exp should be in the future
      expect(ctx.claims!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('getAuthContext — auth enabled', () => {
    it('calls getLogtoContext from the SDK', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { getAuthContext } = await import('@/lib/auth');
      const ctx = await getAuthContext();
      expect(ctx.isAuthenticated).toBe(true);
      // This comes from our mock of @logto/next/server-actions
      expect(ctx.claims?.sub).toBe('real-user');
    });
  });

  describe('getAuthAccessToken — dev mode (auth disabled)', () => {
    it('returns undefined', async () => {
      delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
      const { getAuthAccessToken } = await import('@/lib/auth');
      const token = await getAuthAccessToken();
      expect(token).toBeUndefined();
    });

    it('does not call the SDK getAccessToken', async () => {
      delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
      mockGetAccessToken.mockClear();
      const { getAuthAccessToken } = await import('@/lib/auth');
      await getAuthAccessToken();
      expect(mockGetAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('getAuthAccessToken — auth enabled', () => {
    it('returns a token from the SDK', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { getAuthAccessToken } = await import('@/lib/auth');
      const token = await getAuthAccessToken();
      expect(token).toBe('mock-token');
    });

    it('returns undefined when the SDK throws (e.g. expired session)', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      mockGetAccessToken.mockRejectedValueOnce(new Error('Token expired'));
      const { getAuthAccessToken } = await import('@/lib/auth');
      const token = await getAuthAccessToken();
      expect(token).toBeUndefined();
    });
  });
});
