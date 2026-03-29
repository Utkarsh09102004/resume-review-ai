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

import { useResumes } from "@/hooks/useResumes";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RESUMES_FLAT = [
  {
    id: "r1",
    user_id: "u1",
    parent_id: null,
    title: "Main Resume",
    latex_source: "\\documentclass{article}",
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  },
  {
    id: "r2",
    user_id: "u1",
    parent_id: null,
    title: "Second Resume",
    latex_source: "\\documentclass{article}",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "r3",
    user_id: "u1",
    parent_id: "r1",
    title: "Sub Resume A",
    latex_source: "\\documentclass{article}",
    created_at: "2025-01-03T00:00:00Z",
    updated_at: "2025-01-03T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useResumes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it("fetches and groups resumes on mount", async () => {
    mockApi.get.mockResolvedValue({ data: RESUMES_FLAT });

    const { result } = renderHook(() => useResumes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.resumes).toHaveLength(2);
    expect(result.current.resumes[0].id).toBe("r1");
    expect(result.current.resumes[0].subResumes).toHaveLength(1);
    expect(result.current.resumes[0].subResumes[0].id).toBe("r3");
    expect(result.current.resumes[1].id).toBe("r2");
    expect(result.current.resumes[1].subResumes).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch fails", async () => {
    mockApi.get.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useResumes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load resumes");
    expect(result.current.resumes).toEqual([]);
  });

  it("createResume posts and returns new id", async () => {
    const { result } = renderHook(() => useResumes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockApi.post.mockResolvedValue({ data: { id: "new-1" } });
    mockApi.get.mockResolvedValue({ data: [] });

    let id: string | undefined;
    await act(async () => {
      id = await result.current.createResume("New Resume");
    });

    expect(id).toBe("new-1");
    expect(mockApi.post).toHaveBeenCalledWith("/api/resumes/", { title: "New Resume" });
  });

  it("createSubResume fetches parent latex then posts", async () => {
    const { result } = renderHook(() => useResumes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockApi.get
      .mockResolvedValueOnce({ data: { id: "r1", latex_source: "src", parent_id: null, title: "Parent" } })
      .mockResolvedValueOnce({ data: [] });
    mockApi.post.mockResolvedValue({ data: { id: "sub-1" } });

    await act(async () => {
      await result.current.createSubResume("r1", "Sub");
    });

    expect(mockApi.get).toHaveBeenCalledWith("/api/resumes/r1");
    expect(mockApi.post).toHaveBeenCalledWith("/api/resumes/", {
      title: "Sub",
      parent_id: "r1",
      latex_source: "src",
    });
  });

  it("renameResume calls PUT and refetches", async () => {
    const { result } = renderHook(() => useResumes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockApi.put.mockResolvedValue({});
    mockApi.get.mockResolvedValue({ data: [] });

    await act(async () => {
      await result.current.renameResume("r1", "Renamed");
    });

    expect(mockApi.put).toHaveBeenCalledWith("/api/resumes/r1", { title: "Renamed" });
  });

  it("duplicateResume fetches original and posts copy", async () => {
    const { result } = renderHook(() => useResumes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockApi.get
      .mockResolvedValueOnce({ data: { id: "r1", title: "Original", parent_id: null, latex_source: "src" } })
      .mockResolvedValueOnce({ data: [] });
    mockApi.post.mockResolvedValue({ data: { id: "dup-1" } });

    let id: string | undefined;
    await act(async () => {
      id = await result.current.duplicateResume("r1");
    });

    expect(id).toBe("dup-1");
    expect(mockApi.post).toHaveBeenCalledWith("/api/resumes/", {
      title: "Original (copy)",
      parent_id: null,
      latex_source: "src",
    });
  });

  it("deleteResume calls DELETE and refetches", async () => {
    const { result } = renderHook(() => useResumes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockApi.delete.mockResolvedValue({});
    mockApi.get.mockResolvedValue({ data: [] });

    await act(async () => {
      await result.current.deleteResume("r1");
    });

    expect(mockApi.delete).toHaveBeenCalledWith("/api/resumes/r1");
  });
});
