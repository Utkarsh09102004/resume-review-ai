import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

const mockRequireUserDisplayInfo = vi.fn(async () => ({ name: "Alice" }));
const mockDashboardClient = vi.fn<(props: unknown) => void>();
const mockEditorClient = vi.fn<(props: unknown) => void>();

vi.mock("@/lib/auth", () => ({
  requireUserDisplayInfo: () => mockRequireUserDisplayInfo(),
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
  });

  it("authenticates the app route group in its layout", async () => {
    const { default: AuthenticatedAppLayout } = await import("@/app/(app)/layout");

    const result = await AuthenticatedAppLayout({
      children: React.createElement("div", null, "child"),
    });

    expect(mockRequireUserDisplayInfo).toHaveBeenCalledTimes(1);
    expect(result).toBeTruthy();
  });

  it("passes server-loaded user props into the dashboard client page", async () => {
    const { default: DashboardPage } = await import("@/app/(app)/dashboard/page");

    render(await DashboardPage());

    expect(mockRequireUserDisplayInfo).toHaveBeenCalledTimes(1);
    expect(mockDashboardClient).toHaveBeenCalledWith({ user: { name: "Alice" } });
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
