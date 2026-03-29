import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted ensures these are available when vi.mock factories run
// ---------------------------------------------------------------------------

const { mockApi, mockIsAxiosError, mockIsCancel } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  mockIsAxiosError: vi.fn(),
  mockIsCancel: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ default: mockApi }));
vi.mock("axios", () => ({
  default: {
    isAxiosError: mockIsAxiosError,
    isCancel: mockIsCancel,
  },
  isAxiosError: mockIsAxiosError,
  isCancel: mockIsCancel,
}));

// Bypass debounce — return a referentially stable wrapper (like the real hook)
const _debouncedRef: { current: ((...args: unknown[]) => unknown) | null } = { current: null };
const _stableDebounced = (...args: unknown[]) => _debouncedRef.current?.(...args);
vi.mock("use-debounce", () => ({
  useDebouncedCallback: (fn: (...args: unknown[]) => unknown) => {
    _debouncedRef.current = fn;
    return _stableDebounced;
  },
}));

import { useCompiler } from "@/hooks/useCompiler";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAxiosError(data: Record<string, unknown>) {
  const jsonStr = JSON.stringify(data);
  const buf = new TextEncoder().encode(jsonStr).buffer;
  const err = Object.assign(new Error("Request failed"), {
    response: { data: buf as ArrayBuffer },
    isAxiosError: true,
  });
  return err;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCompiler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockIsAxiosError.mockImplementation(
      (e: unknown) => !!(e && typeof e === "object" && "isAxiosError" in e && (e as Record<string, unknown>).isAxiosError),
    );
    mockIsCancel.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts with idle status and null pdfData", () => {
    const { result } = renderHook(() => useCompiler(""));
    expect(result.current.status).toBe("idle");
    expect(result.current.pdfData).toBeNull();
    expect(result.current.errors).toEqual([]);
    expect(result.current.compiledAgo).toBe("");
  });

  it("compile success sets status to compiled and pdfData", async () => {
    const pdfBytes = new ArrayBuffer(8);
    mockApi.post.mockResolvedValue({ data: pdfBytes });

    const { result } = renderHook(() => useCompiler(""));

    await act(async () => {
      await result.current.compile("\\documentclass{article}");
    });

    expect(result.current.status).toBe("compiled");
    expect(result.current.pdfData).toBeInstanceOf(Uint8Array);
    expect(result.current.errors).toEqual([]);
  });

  it("compile error with errors array sets status to error", async () => {
    const axiosErr = makeAxiosError({
      detail: { errors: [{ line: 5, message: "Undefined control sequence" }] },
    });
    mockApi.post.mockRejectedValue(axiosErr);

    const { result } = renderHook(() => useCompiler(""));

    await act(async () => {
      await result.current.compile("\\bad");
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toEqual({ line: 5, message: "Undefined control sequence" });
  });

  it("compile error with detail string sets single error", async () => {
    const axiosErr = makeAxiosError({ detail: "LaTeX compilation failed" });
    mockApi.post.mockRejectedValue(axiosErr);

    const { result } = renderHook(() => useCompiler(""));

    await act(async () => {
      await result.current.compile("\\bad");
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toEqual({ line: 0, message: "LaTeX compilation failed" });
  });

  it("network error sets generic error message", async () => {
    mockApi.post.mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useCompiler(""));

    await act(async () => {
      await result.current.compile("\\documentclass{article}");
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errors[0].message).toBe("Network error during compilation");
  });

  it("does not compile empty or whitespace-only source", async () => {
    const { result } = renderHook(() => useCompiler(""));

    await act(async () => {
      await result.current.compile("   ");
    });

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("auto-compiles when latex prop has content", async () => {
    mockApi.post.mockResolvedValue({ data: new ArrayBuffer(4) });

    renderHook(() => useCompiler("\\documentclass{article}"));

    // The useEffect triggers debouncedCompile (which calls compile synchronously
    // due to our mock). Flush microtasks for the API call to resolve.
    await vi.advanceTimersByTimeAsync(0);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/compile",
      { latex: "\\documentclass{article}" },
      expect.objectContaining({ responseType: "arraybuffer" }),
    );
  });
});
