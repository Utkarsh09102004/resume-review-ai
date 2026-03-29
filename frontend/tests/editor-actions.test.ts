import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockPut,
  mockCreateAuthenticatedApi,
  mockRequireUserDisplayInfo,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const put = vi.fn();

  return {
    mockPut: put,
    mockCreateAuthenticatedApi: vi.fn(async () => ({
      put,
    })),
    mockRequireUserDisplayInfo: vi.fn(async () => ({ name: "User" })),
    mockRevalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/api", () => ({
  createAuthenticatedApi: () => mockCreateAuthenticatedApi(),
}));

vi.mock("@/lib/auth", () => ({
  requireUserDisplayInfo: () => mockRequireUserDisplayInfo(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

describe("editor server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticates and revalidates when renaming a resume", async () => {
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

    await expect(renameResumeAction("resume-1", " Renamed Resume ")).resolves.toMatchObject({
      id: "resume-1",
      title: "Renamed Resume",
    });

    expect(mockRequireUserDisplayInfo).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith("/api/resumes/resume-1", {
      title: "Renamed Resume",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/editor/resume-1");
  });

  it("saves latex through the authenticated editor action path", async () => {
    mockPut.mockResolvedValue({
      data: {
        id: "resume-1",
        user_id: "user-1",
        parent_id: null,
        title: "Resume",
        latex_source: "\\updated{}",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      },
    });

    const { saveResumeLatexAction } = await import(
      "@/app/(app)/editor/[id]/actions"
    );

    await expect(saveResumeLatexAction("resume-1", "\\updated{}")).resolves.toMatchObject({
      id: "resume-1",
      latex_source: "\\updated{}",
    });

    expect(mockRequireUserDisplayInfo).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith("/api/resumes/resume-1", {
      latex_source: "\\updated{}",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/editor/resume-1");
  });
});
