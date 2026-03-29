import { describe, expect, it, vi } from "vitest";

// Mock @logto/next/server-actions
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockHandleSignIn = vi.fn();

vi.mock("@logto/next/server-actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  handleSignIn: (...args: unknown[]) => mockHandleSignIn(...args),
  getLogtoContext: vi.fn(),
  getAccessToken: vi.fn(),
  getAccessTokenRSC: vi.fn(),
}));

describe("Next route handlers", () => {
  describe("sign-in route", () => {
    it("calls signIn with correct config and redirect URI", async () => {
      const { GET } = await import("@/app/api/logto/sign-in/route");

      await GET();

      expect(mockSignIn).toHaveBeenCalledTimes(1);
      const [config, options] = mockSignIn.mock.calls[0];
      expect(config).toBeDefined();
      expect(config.endpoint).toBeTruthy();
      expect(options.redirectUri).toContain("/api/logto/callback");
    });
  });

  describe("sign-out route", () => {
    it("calls signOut with correct config and redirect URI", async () => {
      const { GET } = await import("@/app/api/logto/sign-out/route");

      await GET();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      const [config, redirectUri] = mockSignOut.mock.calls[0];
      expect(config).toBeDefined();
      // Redirects to baseUrl (root) after sign out
      expect(redirectUri).toBe(config.baseUrl);
    });
  });

  describe("callback route", () => {
    it("calls handleSignIn with the full URL (not just searchParams)", async () => {
      const { NextRequest } = await import("next/server");

      const { GET } = await import("@/app/api/logto/callback/route");

      const request = new NextRequest(
        "http://localhost:3000/api/logto/callback?code=abc&state=xyz"
      );

      await GET(request);

      expect(mockHandleSignIn).toHaveBeenCalledTimes(1);
      const [config, urlArg] = mockHandleSignIn.mock.calls[0];
      expect(config).toBeDefined();
      // Critical: must pass a URL object, not URLSearchParams.
      // The SDK uses instanceof URL to determine how to reconstruct
      // the callback path. If URLSearchParams is passed, it defaults
      // to `${baseUrl}/callback` which mismatches the actual route
      // at /api/logto/callback.
      expect(urlArg).toBeInstanceOf(URL);
      expect(urlArg.pathname).toBe("/api/logto/callback");
      expect(urlArg.searchParams.get("code")).toBe("abc");
      expect(urlArg.searchParams.get("state")).toBe("xyz");
    });
  });
});
