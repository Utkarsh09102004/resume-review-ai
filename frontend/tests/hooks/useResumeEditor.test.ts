import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({ default: mockApi }));

import { useResumeEditor } from "@/hooks/useResumeEditor";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_RESUME = {
  id: "resume-1",
  user_id: "user-1",
  parent_id: null,
  title: "My Resume",
  latex_source: "\\documentclass{article}",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const MOCK_SUB_RESUME = {
  ...MOCK_RESUME,
  id: "resume-2",
  parent_id: "resume-1",
  title: "Sub Resume",
};

const MOCK_PARENT_RESUME = {
  ...MOCK_RESUME,
  id: "resume-1",
  title: "Parent Resume",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useResumeEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads resume on mount and sets loading to false", async () => {
    mockApi.get.mockResolvedValue({ data: MOCK_RESUME });

    const { result } = renderHook(() => useResumeEditor("resume-1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.resume).toEqual(MOCK_RESUME);
    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches parent resume when parent_id exists", async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: MOCK_SUB_RESUME })
      .mockResolvedValueOnce({ data: MOCK_PARENT_RESUME });

    const { result } = renderHook(() => useResumeEditor("resume-2"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.resume?.id).toBe("resume-2");
    expect(result.current.parentResume?.id).toBe("resume-1");
    expect(mockApi.get).toHaveBeenCalledWith("/api/resumes/resume-2");
    expect(mockApi.get).toHaveBeenCalledWith("/api/resumes/resume-1");
  });

  it("sets notFound when API returns 404", async () => {
    mockApi.get.mockRejectedValue({ response: { status: 404 } });

    const { result } = renderHook(() => useResumeEditor("nonexistent"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notFound).toBe(true);
    expect(result.current.resume).toBeNull();
  });

  it("sets error for non-404 failures", async () => {
    mockApi.get.mockRejectedValue({ response: { status: 500 } });

    const { result } = renderHook(() => useResumeEditor("resume-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load resume");
    expect(result.current.notFound).toBe(false);
  });

  it("save calls PUT and updates resume state", async () => {
    mockApi.get.mockResolvedValue({ data: MOCK_RESUME });

    const { result } = renderHook(() => useResumeEditor("resume-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedResume = { ...MOCK_RESUME, title: "Updated" };
    mockApi.put.mockResolvedValue({ data: updatedResume });

    await act(async () => {
      await result.current.save({ title: "Updated" });
    });

    expect(mockApi.put).toHaveBeenCalledWith("/api/resumes/resume-1", { title: "Updated" });
    expect(result.current.resume?.title).toBe("Updated");
    expect(result.current.isSaving).toBe(false);
  });
});
