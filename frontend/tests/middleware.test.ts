import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// We need to test the middleware function directly
describe('middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function makeRequest(path: string, cookies: Record<string, string> = {}) {
    const url = `http://localhost:3000${path}`;
    const req = new NextRequest(url);
    for (const [name, value] of Object.entries(cookies)) {
      req.cookies.set(name, value);
    }
    return req;
  }

  describe('auth disabled (dev mode)', () => {
    it('allows all requests when auth is disabled', async () => {
      delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
      const { middleware } = await import('@/middleware');

      const response = middleware(makeRequest('/dashboard'));
      // NextResponse.next() returns a response without redirect
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('allows /editor routes without auth', async () => {
      delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
      const { middleware } = await import('@/middleware');

      const response = middleware(makeRequest('/editor/abc123'));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('allows /dashboard/sub-path without auth', async () => {
      delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
      const { middleware } = await import('@/middleware');

      const response = middleware(makeRequest('/dashboard/settings'));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('auth enabled — with session', () => {
    it('allows requests with Logto session cookie', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { middleware } = await import('@/middleware');

      const response = middleware(
        makeRequest('/dashboard', { logto_myapp: 'session-data' })
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('allows /editor routes with Logto session cookie', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { middleware } = await import('@/middleware');

      const response = middleware(
        makeRequest('/editor/abc123', { logto_myapp: 'session-data' })
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('allows /dashboard/sub-path with Logto session cookie', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { middleware } = await import('@/middleware');

      const response = middleware(
        makeRequest('/dashboard/settings', { logto_myapp: 'session-data' })
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('auth enabled — without session', () => {
    it('redirects to sign-in when no session on /dashboard', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { middleware } = await import('@/middleware');

      const response = middleware(makeRequest('/dashboard'));
      // Redirect response
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain(
        '/api/logto/sign-in'
      );
    });

    it('redirects editor routes when no session', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { middleware } = await import('@/middleware');

      const response = middleware(makeRequest('/editor/123'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain(
        '/api/logto/sign-in'
      );
    });

    it('redirects /dashboard/sub-path when no session', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { middleware } = await import('@/middleware');

      const response = middleware(makeRequest('/dashboard/settings'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain(
        '/api/logto/sign-in'
      );
    });

    it('does NOT treat empty logto cookies as a session', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { middleware } = await import('@/middleware');

      const response = middleware(
        makeRequest('/dashboard', { logto_myapp: '' })
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain(
        '/api/logto/sign-in'
      );
    });

    it('does NOT treat non-logto cookies as a session', async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = 'true';
      const { middleware } = await import('@/middleware');

      const response = middleware(
        makeRequest('/dashboard', { session: 'some-value', other_cookie: 'x' })
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain(
        '/api/logto/sign-in'
      );
    });
  });

  describe('matcher config', () => {
    it('exports a config with correct matchers', async () => {
      const { config } = await import('@/middleware');
      expect(config.matcher).toEqual([
        '/dashboard/:path*',
        '/editor/:path*',
      ]);
    });
  });
});
