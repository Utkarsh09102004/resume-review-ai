import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock @logto/next/server-actions before any imports
vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn(async () => ({
    isAuthenticated: true,
    claims: { sub: 'real-user' },
  })),
  getAccessToken: vi.fn(async () => 'mock-token'),
  getAccessTokenRSC: vi.fn(async () => 'mock-rsc-token'),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handleSignIn: vi.fn(),
}));

describe('api client', () => {
  it('has correct baseURL', async () => {
    const { default: api } = await import('@/lib/api');
    expect(api.defaults.baseURL).toBe('http://localhost:8000');
  });

  it('has Content-Type header set', async () => {
    const { default: api } = await import('@/lib/api');
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});

describe('createAuthenticatedApi', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('@/lib/auth');
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns plain api client in dev mode (no Authorization header)', async () => {
    delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
    const { createAuthenticatedApi } = await import('@/lib/api');
    const client = await createAuthenticatedApi();
    // Should not have Authorization header
    expect(client.defaults.headers?.Authorization).toBeUndefined();
    expect(client.defaults.headers?.['Authorization']).toBeUndefined();
    expect(client.defaults.baseURL).toBe('http://localhost:8000');
  });

  it('returns authenticated client with Bearer token when auth is enabled', async () => {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
    const { createAuthenticatedApi } = await import('@/lib/api');
    const client = await createAuthenticatedApi();
    expect(client.defaults.headers?.Authorization).toBe('Bearer mock-token');
  });

  it('returns plain client when auth is enabled but no token available', async () => {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';

    // Mock getAuthAccessToken to return undefined (e.g., expired session)
    vi.doMock('@/lib/auth', () => ({
      isAuthEnabled: () => true,
      getAuthAccessToken: async () => undefined,
      getAuthAccessTokenRSC: async () => undefined,
    }));

    const { createAuthenticatedApi } = await import('@/lib/api');
    const client = await createAuthenticatedApi();
    // Should fall back to plain client
    expect(client.defaults.baseURL).toBe('http://localhost:8000');
    // Should not have Authorization header set
    const authHeader =
      client.defaults.headers?.Authorization ??
      client.defaults.headers?.common?.Authorization;
    expect(authHeader).toBeUndefined();
  });
});

describe('createAuthenticatedApiRSC', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('@/lib/auth');
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns authenticated client with Bearer token when auth is enabled in RSC', async () => {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
    const { createAuthenticatedApiRSC } = await import('@/lib/api');
    const client = await createAuthenticatedApiRSC();
    expect(client.defaults.headers?.Authorization).toBe('Bearer mock-rsc-token');
  });
});
