import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

const mockRequireUserDisplayInfo = vi.fn(async () => ({ name: "Alice" }));
const mockDashboardGet = vi.fn();
const mockCreateAuthenticatedApi = vi.fn(async () => ({ get: mockDashboardGet }));
const mockDashboardClient = vi.fn<(props: unknown) => void>();
const mockEditorClient = vi.fn<(props: unknown) => void>();

vi.mock("@/lib/auth", () => ({
  requireUserDisplayInfo: () => mockRequireUserDisplayInfo(),
}));

vi.mock("@/lib/api", () => ({
  createAuthenticatedApi: () => mockCreateAuthenticatedApi(),
}));

vi.mock("@/components/dashboard/DashboardPageClient", () => ({
  default: (props: unknown) => {
    mockDashboardClient(props);
    return null;
  },
}));

vi.mock("@/components/editor/EditorPageClient", () => ({
  default: (props: unknown) => {
    mockEditorClient(props);
    return null;
  },
}));

describe("authenticated app shell", () => {
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
          latexSource: "\\documentclass{article}",
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

  it("passes server-loaded user props and params into the editor client page", async () => {
    const { default: EditorPage } = await import("@/app/(app)/editor/[id]/page");

    render(await EditorPage({ params: Promise.resolve({ id: "resume-123" }) }));

    expect(mockRequireUserDisplayInfo).toHaveBeenCalledTimes(1);
    expect(mockEditorClient).toHaveBeenCalledWith({
      resumeId: "resume-123",
      user: { name: "Alice" },
    });
  });
});
