import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockCreateAuthenticatedApi = vi.fn(async () => ({ get: mockGet }));

vi.mock("@/lib/api", () => ({
  createAuthenticatedApi: () => mockCreateAuthenticatedApi(),
  createAuthenticatedApiRSC: () => mockCreateAuthenticatedApi(),
}));

describe("dashboard route loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads resume groups through the shared authenticated API client", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: "resume-1",
          user_id: "user-1",
          parent_id: null,
          title: "Main Resume",
          latex_source: "\\documentclass{article}",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "resume-2",
          user_id: "user-1",
          parent_id: "resume-1",
          title: "Tailored Resume",
          latex_source: "\\documentclass{article}",
          created_at: "2025-01-02T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ],
    });

    const { getDashboardPageData } = await import(
      "@/app/(app)/dashboard/dashboard-data"
    );

    await expect(getDashboardPageData()).resolves.toEqual({
      resumes: [
        {
          id: "resume-1",
          title: "Main Resume",
          updatedAt: "2025-01-01T00:00:00Z",
          subResumes: [
            {
              id: "resume-2",
              title: "Tailored Resume",
              updatedAt: "2025-01-02T00:00:00Z",
            },
          ],
        },
      ],
      error: null,
    });

    expect(mockCreateAuthenticatedApi).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/api/resumes/");
  });

  it("returns the dashboard fallback state when the loader fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGet.mockRejectedValueOnce(new Error("loader failed"));

    const { getDashboardPageData } = await import(
      "@/app/(app)/dashboard/dashboard-data"
    );

    await expect(getDashboardPageData()).resolves.toEqual({
      resumes: [],
      error: "Failed to load resumes",
    });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
