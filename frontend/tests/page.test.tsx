import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

// Mock lib/auth — default: auth disabled (dev mode)
const mockIsAuthEnabled = vi.fn(() => false);
const mockGetAuthContext = vi.fn(async () => ({
  isAuthenticated: false,
}));

vi.mock('@/lib/auth', () => ({
  isAuthEnabled: () => mockIsAuthEnabled(),
  getAuthContext: () => mockGetAuthContext(),
}));

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthEnabled.mockReturnValue(false);
    mockGetAuthContext.mockResolvedValue({ isAuthenticated: false });
  });

  it('redirects to /dashboard when auth is disabled (dev mode)', async () => {
    mockIsAuthEnabled.mockReturnValue(false);

    const { default: Home } = await import('@/app/page');

    await expect(Home()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('forces dynamic rendering so auth checks do not run during build prerender', async () => {
    const { dynamic } = await import('@/app/page');
    expect(dynamic).toBe('force-dynamic');
  });

  it('redirects to /dashboard when authenticated', async () => {
    mockIsAuthEnabled.mockReturnValue(true);
    mockGetAuthContext.mockResolvedValue({ isAuthenticated: true });

    // Re-import to pick up fresh module
    vi.resetModules();
    vi.doMock('next/navigation', () => ({
      redirect: (...args: unknown[]) => {
        mockRedirect(...args);
        throw new Error('NEXT_REDIRECT');
      },
    }));
    vi.doMock('@/lib/auth', () => ({
      isAuthEnabled: () => mockIsAuthEnabled(),
      getAuthContext: () => mockGetAuthContext(),
    }));

    const { default: Home } = await import('@/app/page');

    await expect(Home()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('renders sign-in page when auth enabled and not authenticated', async () => {
    mockIsAuthEnabled.mockReturnValue(true);
    mockGetAuthContext.mockResolvedValue({ isAuthenticated: false });

    vi.resetModules();
    vi.doMock('next/navigation', () => ({
      redirect: (...args: unknown[]) => {
        mockRedirect(...args);
        throw new Error('NEXT_REDIRECT');
      },
    }));
    vi.doMock('@/lib/auth', () => ({
      isAuthEnabled: () => mockIsAuthEnabled(),
      getAuthContext: () => mockGetAuthContext(),
    }));

    const { default: Home } = await import('@/app/page');
    const result = await Home();

    // Should NOT redirect — renders the sign-in landing instead
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
