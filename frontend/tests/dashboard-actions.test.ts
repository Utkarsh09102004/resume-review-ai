import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGet,
  mockPost,
  mockPut,
  mockDelete,
  mockCreateAuthenticatedApi,
  mockRequireUserDisplayInfo,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const del = vi.fn();

  return {
    mockGet: get,
    mockPost: post,
    mockPut: put,
    mockDelete: del,
    mockCreateAuthenticatedApi: vi.fn(async () => ({
      get,
      post,
      put,
      delete: del,
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

import {
  createResumeAction,
  createSubResumeAction,
  deleteResumeAction,
  duplicateResumeAction,
  renameResumeAction,
} from "@/app/(app)/dashboard/actions";

describe("dashboard server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a resume, trims the title, and revalidates the dashboard", async () => {
    mockPost.mockResolvedValue({ data: { id: "resume-123" } });

    const result = await createResumeAction("  My Resume  ");

    expect(result).toEqual({ ok: true, resumeId: "resume-123" });
    expect(mockRequireUserDisplayInfo).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith("/api/resumes/", {
      title: "My Resume",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("creates a sub-resume from the parent id and revalidates the dashboard", async () => {
    mockPost.mockResolvedValue({ data: { id: "sub-123" } });

    const result = await createSubResumeAction("parent-1", " Tailored Resume ");

    expect(result).toEqual({ ok: true, resumeId: "sub-123" });
    expect(mockPost).toHaveBeenCalledWith("/api/resumes/", {
      title: "Tailored Resume",
      parent_id: "parent-1",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("duplicates a resume by reading the original and creating a copy", async () => {
    mockGet.mockResolvedValue({
      data: { title: "Original Resume", latex_source: "\\\\source" },
    });
    mockPost.mockResolvedValue({ data: { id: "copy-123" } });

    const result = await duplicateResumeAction("resume-1");

    expect(result).toEqual({ ok: true, resumeId: "copy-123" });
    expect(mockGet).toHaveBeenCalledWith("/api/resumes/resume-1");
    expect(mockPost).toHaveBeenCalledWith("/api/resumes/", {
      title: "Original Resume (copy)",
      latex_source: "\\\\source",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("renames and deletes resumes through authenticated API calls", async () => {
    mockPut.mockResolvedValue({});
    mockDelete.mockResolvedValue({});

    await expect(renameResumeAction("resume-1", " Updated Resume ")).resolves.toEqual({
      ok: true,
    });
    await expect(deleteResumeAction("resume-1")).resolves.toEqual({
      ok: true,
    });

    expect(mockPut).toHaveBeenCalledWith("/api/resumes/resume-1", {
      title: "Updated Resume",
    });
    expect(mockDelete).toHaveBeenCalledWith("/api/resumes/resume-1");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("rejects blank resume titles before making API calls", async () => {
    const result = await createResumeAction("   ");

    expect(result).toEqual({
      ok: false,
      error: "Resume name is required",
    });
    expect(mockCreateAuthenticatedApi).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns API detail messages when a mutation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockPut.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          detail: "Resume title already exists",
        },
      },
    });

    await expect(renameResumeAction("resume-1", "Duplicate Resume")).resolves.toEqual({
      ok: false,
      error: "Resume title already exists",
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
