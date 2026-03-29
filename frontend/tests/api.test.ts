import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockGetAccessToken = vi.fn<() => Promise<string | undefined>>(
  async () => 'mock-token'
);
const mockGetAccessTokenRSC = vi.fn<() => Promise<string | undefined>>(
  async () => 'mock-rsc-token'
);

// Mock @logto/next/server-actions before any imports
vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn(async () => ({
    isAuthenticated: true,
    claims: { sub: 'real-user' },
  })),
  getAccessToken: () => mockGetAccessToken(),
  getAccessTokenRSC: () => mockGetAccessTokenRSC(),
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
    mockGetAccessToken.mockReset();
    mockGetAccessTokenRSC.mockReset();
    mockGetAccessToken.mockResolvedValue('mock-token');
    mockGetAccessTokenRSC.mockResolvedValue('mock-rsc-token');
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
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    expect(mockGetAccessTokenRSC).not.toHaveBeenCalled();
  });

  it('throws when the server token helper does not resolve a token', async () => {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
    mockGetAccessToken.mockResolvedValueOnce(undefined);

    const { createAuthenticatedApi, MissingAuthenticatedTokenError } =
      await import('@/lib/api');

    await expect(createAuthenticatedApi()).rejects.toBeInstanceOf(
      MissingAuthenticatedTokenError
    );
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    expect(mockGetAccessTokenRSC).not.toHaveBeenCalled();
  });
});

describe('createAuthenticatedApiRSC', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('@/lib/auth');
    process.env = { ...originalEnv };
    mockGetAccessToken.mockReset();
    mockGetAccessTokenRSC.mockReset();
    mockGetAccessToken.mockResolvedValue('mock-token');
    mockGetAccessTokenRSC.mockResolvedValue('mock-rsc-token');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns authenticated client with Bearer token when auth is enabled in RSC', async () => {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
    const { createAuthenticatedApiRSC } = await import('@/lib/api');
    const client = await createAuthenticatedApiRSC();
    expect(client.defaults.headers?.Authorization).toBe('Bearer mock-rsc-token');
    expect(mockGetAccessToken).not.toHaveBeenCalled();
    expect(mockGetAccessTokenRSC).toHaveBeenCalledTimes(1);
  });

  it('throws when the RSC token helper does not resolve a token', async () => {
    process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
    mockGetAccessTokenRSC.mockResolvedValueOnce(undefined);

    const { createAuthenticatedApiRSC, MissingAuthenticatedTokenError } =
      await import('@/lib/api');

    await expect(createAuthenticatedApiRSC()).rejects.toBeInstanceOf(
      MissingAuthenticatedTokenError
    );
    expect(mockGetAccessToken).not.toHaveBeenCalled();
    expect(mockGetAccessTokenRSC).toHaveBeenCalledTimes(1);
  });
});
