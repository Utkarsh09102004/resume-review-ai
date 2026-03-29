import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @logto/next/server-actions
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockHandleSignIn = vi.fn();
const mockCreateAuthenticatedApi = vi.fn();
const mockCompilePost = vi.fn();

vi.mock("@logto/next/server-actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  handleSignIn: (...args: unknown[]) => mockHandleSignIn(...args),
  getLogtoContext: vi.fn(),
  getAccessToken: vi.fn(),
  getAccessTokenRSC: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  createAuthenticatedApi: () => mockCreateAuthenticatedApi(),
}));

describe("Next route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proxies compile requests through the authenticated API client", async () => {
    mockCreateAuthenticatedApi.mockResolvedValue({ post: mockCompilePost });
    mockCompilePost.mockResolvedValue({
      data: new Uint8Array([1, 2, 3]).buffer,
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="resume.pdf"',
      },
    });

    const { POST } = await import("@/app/api/compile/route");

    const response = await POST(
      new Request("http://localhost:3000/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: "\\documentclass{article}" }),
      })
    );

    expect(mockCompilePost).toHaveBeenCalledWith(
      "/api/compile",
      { latex: "\\documentclass{article}" },
      expect.objectContaining({
        responseType: "arraybuffer",
        validateStatus: expect.any(Function),
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="resume.pdf"'
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3])
    );
  });

  it("forwards backend compile errors without rewriting the payload", async () => {
    mockCreateAuthenticatedApi.mockResolvedValue({ post: mockCompilePost });
    mockCompilePost.mockResolvedValue({
      data: new TextEncoder().encode(
        JSON.stringify({ detail: "LaTeX compilation failed" })
      ).buffer,
      status: 422,
      headers: {
        "content-type": "application/json",
      },
    });

    const { POST } = await import("@/app/api/compile/route");

    const response = await POST(
      new Request("http://localhost:3000/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: "\\bad" }),
      })
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      detail: "LaTeX compilation failed",
    });
  });

  it("rejects invalid compile request bodies", async () => {
    const { POST } = await import("@/app/api/compile/route");

    const response = await POST(
      new Request("http://localhost:3000/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      detail: "Invalid JSON body",
    });
  });

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
