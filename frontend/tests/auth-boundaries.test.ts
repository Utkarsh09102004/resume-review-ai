import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetAccessToken,
  mockGetAccessTokenRSC,
  mockGetLogtoContext,
  mockAxiosCreate,
  mockGet,
  mockPost,
  mockPut,
  mockRedirect,
} = vi.hoisted(() => {
  const getAccessToken = vi.fn<() => Promise<string | undefined>>(
    async () => "server-token"
  );
  const getAccessTokenRSC = vi.fn<() => Promise<string | undefined>>(
    async () => "rsc-token"
  );
  const getLogtoContext = vi.fn(async () => ({
    isAuthenticated: true,
    claims: { sub: "user-1", name: "Alice" },
  }));
  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const axiosCreate = vi.fn((config?: {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
  }) => ({
    defaults: {
      baseURL: config?.baseURL,
      timeout: config?.timeout,
      headers: config?.headers ?? {},
    },
    get,
    post,
    put,
  }));

  return {
    mockGetAccessToken: getAccessToken,
    mockGetAccessTokenRSC: getAccessTokenRSC,
    mockGetLogtoContext: getLogtoContext,
    mockAxiosCreate: axiosCreate,
    mockGet: get,
    mockPost: post,
    mockPut: put,
    mockRedirect: vi.fn(),
  };
});

vi.mock("@logto/next/server-actions", () => ({
  getAccessToken: () => mockGetAccessToken(),
  getAccessTokenRSC: () => mockGetAccessTokenRSC(),
  getLogtoContext: () => mockGetLogtoContext(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handleSignIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");

  return {
    ...actual,
    default: {
      ...actual.default,
      create: mockAxiosCreate,
      isAxiosError: actual.default.isAxiosError,
    },
    create: mockAxiosCreate,
    isAxiosError: actual.isAxiosError,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("auth token lookup boundaries", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_AUTH_ENABLED: "true",
    };
    mockGetAccessToken.mockReset();
    mockGetAccessToken.mockResolvedValue("server-token");
    mockGetAccessTokenRSC.mockReset();
    mockGetAccessTokenRSC.mockResolvedValue("rsc-token");
    mockGetLogtoContext.mockReset();
    mockGetLogtoContext.mockResolvedValue({
      isAuthenticated: true,
      claims: { sub: "user-1", name: "Alice" },
    });
    mockAxiosCreate.mockClear();
    mockGet.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();
    mockRedirect.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses the RSC token helper for the dashboard server loader", async () => {
    mockGet.mockResolvedValue({
      data: [],
    });

    const { getDashboardPageData } = await import(
      "@/app/(app)/dashboard/dashboard-data"
    );

    await expect(getDashboardPageData()).resolves.toEqual({
      resumes: [],
      error: null,
    });

    expect(mockGetAccessToken).not.toHaveBeenCalled();
    expect(mockGetAccessTokenRSC).toHaveBeenCalledTimes(1);
    expect(mockAxiosCreate.mock.calls.at(-1)?.[0]?.headers?.Authorization).toBe(
      "Bearer rsc-token"
    );
    expect(mockGet).toHaveBeenCalledWith("/api/resumes/");
  });

  it("redirects to sign-in when the dashboard loader cannot resolve an auth token", async () => {
    mockGetAccessTokenRSC.mockResolvedValueOnce(undefined);

    const { getDashboardPageData } = await import(
      "@/app/(app)/dashboard/dashboard-data"
    );

    await expect(getDashboardPageData()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockGetAccessToken).not.toHaveBeenCalled();
    expect(mockGetAccessTokenRSC).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith("/api/logto/sign-in");
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("uses the RSC token helper for the editor server loader", async () => {
    mockGet.mockResolvedValue({
      data: {
        id: "resume-1",
        user_id: "user-1",
        parent_id: null,
        title: "Resume",
        latex_source: "\\documentclass{article}",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    });

    const { getEditorPageData } = await import(
      "@/app/(app)/editor/[id]/editor-data"
    );

    await expect(getEditorPageData("resume-1")).resolves.toMatchObject({
      resume: {
        id: "resume-1",
      },
      parentResume: null,
    });

    expect(mockGetAccessToken).not.toHaveBeenCalled();
    expect(mockGetAccessTokenRSC).toHaveBeenCalledTimes(1);
    expect(mockAxiosCreate.mock.calls.at(-1)?.[0]?.headers?.Authorization).toBe(
      "Bearer rsc-token"
    );
    expect(mockGet).toHaveBeenCalledWith("/api/resumes/resume-1");
  });

  it("uses the server-action token helper for dashboard actions", async () => {
    mockPost.mockResolvedValue({
      data: {
        id: "resume-1",
      },
    });

    const { createResumeAction } = await import(
      "@/app/(app)/dashboard/actions"
    );

    await expect(createResumeAction("Resume")).resolves.toEqual({
      ok: true,
      resumeId: "resume-1",
    });

    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    expect(mockGetAccessTokenRSC).not.toHaveBeenCalled();
    expect(mockAxiosCreate.mock.calls.at(-1)?.[0]?.headers?.Authorization).toBe(
      "Bearer server-token"
    );
    expect(mockPost).toHaveBeenCalledWith("/api/resumes/", {
      title: "Resume",
    });
  });

  it("fails dashboard actions before backend calls when the server token is missing", async () => {
    mockGetAccessToken.mockResolvedValueOnce(undefined);

    const { createResumeAction } = await import(
      "@/app/(app)/dashboard/actions"
    );

    await expect(createResumeAction("Resume")).resolves.toEqual({
      ok: false,
      error: "Authentication required. Please sign in again.",
    });

    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    expect(mockGetAccessTokenRSC).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("uses the server-action token helper for editor actions", async () => {
    mockPut.mockResolvedValue({
      data: {
        id: "resume-1",
        user_id: "user-1",
        parent_id: null,
        title: "Renamed Resume",
        latex_source: "\\documentclass{article}",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      },
    });

    const { renameResumeAction } = await import(
      "@/app/(app)/editor/[id]/actions"
    );

    await expect(renameResumeAction("resume-1", "Renamed Resume")).resolves.toMatchObject(
      {
        id: "resume-1",
        title: "Renamed Resume",
      }
    );

    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    expect(mockGetAccessTokenRSC).not.toHaveBeenCalled();
    expect(mockAxiosCreate.mock.calls.at(-1)?.[0]?.headers?.Authorization).toBe(
      "Bearer server-token"
    );
    expect(mockPut).toHaveBeenCalledWith("/api/resumes/resume-1", {
      title: "Renamed Resume",
    });
  });

  it("uses the route-handler token helper for compile proxy requests", async () => {
    mockPost.mockResolvedValue({
      data: new Uint8Array([1, 2, 3]).buffer,
      status: 200,
      headers: {
        "content-type": "application/pdf",
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

    expect(response.status).toBe(200);
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    expect(mockGetAccessTokenRSC).not.toHaveBeenCalled();
    expect(mockAxiosCreate.mock.calls.at(-1)?.[0]?.headers?.Authorization).toBe(
      "Bearer server-token"
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/api/compile",
      { latex: "\\documentclass{article}" },
      expect.objectContaining({
        responseType: "arraybuffer",
        validateStatus: expect.any(Function),
      })
    );
  });

  it("fails compile proxy requests before backend calls when the server token is missing", async () => {
    mockGetAccessToken.mockResolvedValueOnce(undefined);

    const { POST } = await import("@/app/api/compile/route");

    const response = await POST(
      new Request("http://localhost:3000/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: "\\documentclass{article}" }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      detail: "Authentication required. Please sign in again.",
    });
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    expect(mockGetAccessTokenRSC).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
