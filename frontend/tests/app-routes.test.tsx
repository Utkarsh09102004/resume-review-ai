import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

const mockRequireUserDisplayInfo = vi.fn(async () => ({ name: "Alice" }));
const mockDashboardGet = vi.fn();
const mockCreateAuthenticatedApi = vi.fn(async () => ({ get: mockDashboardGet }));
const mockDashboardClient = vi.fn<(props: unknown) => void>();
const mockEditorWorkspace = vi.fn<(props: unknown) => void>();
const mockGetEditorPageData = vi.fn<
  (id: string) => Promise<{
    resume: {
      id: string;
      user_id: string;
      parent_id: string | null;
      title: string;
      latex_source: string;
      created_at: string;
      updated_at: string;
    };
    parentResume: null;
  } | null>
>();
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/lib/auth", () => ({
  requireUserDisplayInfo: () => mockRequireUserDisplayInfo(),
}));

vi.mock("@/lib/api", () => ({
  createAuthenticatedApi: () => mockCreateAuthenticatedApi(),
  createAuthenticatedApiRSC: () => mockCreateAuthenticatedApi(),
  isMissingAuthenticatedTokenError: (error: unknown) =>
    error instanceof Error &&
    error.name === "MissingAuthenticatedTokenError",
}));

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

vi.mock("@/components/dashboard/DashboardPageClient", () => ({
  default: (props: unknown) => {
    mockDashboardClient(props);
    return null;
  },
}));

vi.mock("@/components/editor/EditorWorkspace", () => ({
  default: (props: unknown) => {
    mockEditorWorkspace(props);
    return null;
  },
}));

vi.mock("@/app/(app)/editor/[id]/editor-data", () => ({
  getEditorPageData: (id: string) => mockGetEditorPageData(id),
}));

describe("authenticated app routes", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockRequireUserDisplayInfo.mockResolvedValue({ name: "Alice" });
    mockDashboardGet.mockResolvedValue({
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
    mockGetEditorPageData.mockResolvedValue({
      resume: {
        id: "resume-123",
        user_id: "user-1",
        parent_id: null,
        title: "My Resume",
        latex_source: "\\documentclass{article}",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      parentResume: null,
    });
  });

  it("authenticates the app route group in its layout", async () => {
    const { default: AuthenticatedAppLayout } = await import("@/app/(app)/layout");

    const result = await AuthenticatedAppLayout({
      children: React.createElement("div", null, "child"),
    });

    expect(mockRequireUserDisplayInfo).toHaveBeenCalledTimes(1);
    expect(result).toBeTruthy();
  });

  it("passes server-loaded user and resume props into the dashboard client page", async () => {
    const { default: DashboardPage } = await import("@/app/(app)/dashboard/page");

    render(await DashboardPage());

    expect(mockRequireUserDisplayInfo).toHaveBeenCalledTimes(1);
    expect(mockDashboardClient).toHaveBeenCalledWith({
      user: { name: "Alice" },
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
      initialError: null,
    });
  });

  it("falls back to an empty dashboard state when the server loader fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockDashboardGet.mockRejectedValueOnce(new Error("dashboard failed"));

    const { default: DashboardPage } = await import("@/app/(app)/dashboard/page");

    render(await DashboardPage());

    expect(mockDashboardClient).toHaveBeenCalledWith({
      user: { name: "Alice" },
      resumes: [],
      initialError: "Failed to load resumes",
    });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("passes server-loaded editor data into the editor workspace island", async () => {
    const { default: EditorPage } = await import("@/app/(app)/editor/[id]/page");

    render(await EditorPage({ params: Promise.resolve({ id: "resume-123" }) }));

    expect(mockRequireUserDisplayInfo).toHaveBeenCalledTimes(1);
    expect(mockGetEditorPageData).toHaveBeenCalledWith("resume-123");
    expect(mockEditorWorkspace).toHaveBeenCalledWith({
      initialResume: {
        id: "resume-123",
        user_id: "user-1",
        parent_id: null,
        title: "My Resume",
        latex_source: "\\documentclass{article}",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      parentResume: null,
      user: { name: "Alice" },
    });
  });

  it("calls notFound when the editor resume does not exist", async () => {
    mockGetEditorPageData.mockResolvedValueOnce(null);
    const { default: EditorPage } = await import("@/app/(app)/editor/[id]/page");

    await expect(
      EditorPage({ params: Promise.resolve({ id: "missing-resume" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });
});
