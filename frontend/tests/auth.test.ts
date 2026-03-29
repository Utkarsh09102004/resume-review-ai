import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockRedirect = vi.fn();

// Keep references to mocks so we can override per-test
const mockGetAccessToken = vi.fn<() => Promise<string | undefined>>(
  async () => 'mock-token'
);
const mockGetAccessTokenRSC = vi.fn<() => Promise<string | undefined>>(
  async () => 'mock-rsc-token'
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetLogtoContext = vi.fn<any>(async () => ({
  isAuthenticated: true as boolean,
  claims: { sub: 'real-user' } as Record<string, unknown>,
}));

// Mock @logto/next/server-actions so it doesn't try to import next/navigation
vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: (...args: unknown[]) => (mockGetLogtoContext as (...a: unknown[]) => unknown)(...args),
  getAccessToken: () => mockGetAccessToken(),
  getAccessTokenRSC: () => mockGetAccessTokenRSC(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handleSignIn: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

describe('auth utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockRedirect.mockClear();
    mockGetLogtoContext.mockReset();
    mockGetLogtoContext.mockResolvedValue({
      isAuthenticated: true,
      claims: { sub: 'real-user' },
    });
    mockGetAccessToken.mockResolvedValue('mock-token');
    mockGetAccessTokenRSC.mockResolvedValue('mock-rsc-token');
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

  describe('getAuthAccessTokenRSC — auth enabled', () => {
    it('returns a token from the SDK RSC helper', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { getAuthAccessTokenRSC } = await import('@/lib/auth');
      const token = await getAuthAccessTokenRSC();
      expect(token).toBe('mock-rsc-token');
    });

    it('returns undefined when the SDK throws in RSC mode', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      mockGetAccessTokenRSC.mockRejectedValueOnce(new Error('Token expired'));
      const { getAuthAccessTokenRSC } = await import('@/lib/auth');
      const token = await getAuthAccessTokenRSC();
      expect(token).toBeUndefined();
    });
  });

  describe('getUserDisplayInfo — dev mode (auth disabled)', () => {
    it('returns a generic "User" name', async () => {
      delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
      const { getUserDisplayInfo } = await import('@/lib/auth');
      const info = await getUserDisplayInfo();
      expect(info).toEqual({ name: 'User' });
    });
  });

  describe('getUserDisplayInfo — auth enabled', () => {
    it('returns name and avatar from claims', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      mockGetLogtoContext.mockResolvedValueOnce({
        isAuthenticated: true,
        claims: { sub: 'u1', name: 'Alice', picture: 'https://img/a.png' },
      });
      const { getUserDisplayInfo } = await import('@/lib/auth');
      const info = await getUserDisplayInfo();
      expect(info).toEqual({ name: 'Alice', avatarUrl: 'https://img/a.png' });
    });

    it('falls back to "User" when name claim is missing', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      mockGetLogtoContext.mockResolvedValueOnce({
        isAuthenticated: true,
        claims: { sub: 'u2' },
      });
      const { getUserDisplayInfo } = await import('@/lib/auth');
      const info = await getUserDisplayInfo();
      expect(info).toEqual({ name: 'User', avatarUrl: undefined });
    });

    it('returns null when not authenticated', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      mockGetLogtoContext.mockResolvedValueOnce({
        isAuthenticated: false,
        claims: undefined,
      });
      const { getUserDisplayInfo } = await import('@/lib/auth');
      const info = await getUserDisplayInfo();
      expect(info).toBeNull();
    });
  });

  describe('requireUserDisplayInfo', () => {
    it('returns the resolved user when authenticated', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      mockGetLogtoContext.mockResolvedValueOnce({
        isAuthenticated: true,
        claims: { sub: 'u1', name: 'Alice' },
      });
      const { requireUserDisplayInfo } = await import('@/lib/auth');
      const info = await requireUserDisplayInfo();
      expect(info).toEqual({ name: 'Alice', avatarUrl: undefined });
    });

    it('redirects to sign-in when auth is enabled and no user is available', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      mockGetLogtoContext.mockResolvedValueOnce({
        isAuthenticated: false,
        claims: undefined,
      });

      const { requireUserDisplayInfo } = await import('@/lib/auth');
      await expect(requireUserDisplayInfo()).rejects.toThrow('NEXT_REDIRECT');
      expect(mockRedirect).toHaveBeenCalledWith('/api/logto/sign-in');
    });
  });
});
