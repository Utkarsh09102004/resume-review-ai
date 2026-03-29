import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted ensures these are available when vi.mock factories run
// ---------------------------------------------------------------------------

const { mockCompileLatex } = vi.hoisted(() => ({
  mockCompileLatex: vi.fn(),
}));

vi.mock("@/lib/compile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/compile")>(
    "@/lib/compile"
  );

  return {
    ...actual,
    compileLatex: (...args: unknown[]) => mockCompileLatex(...args),
  };
});

// Bypass debounce — return a referentially stable wrapper (like the real hook)
const _debouncedRef: { current: ((...args: unknown[]) => unknown) | null } = { current: null };
const _stableDebounced = (...args: unknown[]) => _debouncedRef.current?.(...args);
vi.mock("use-debounce", () => ({
  useDebouncedCallback: (fn: (...args: unknown[]) => unknown) => {
    _debouncedRef.current = fn;
    return _stableDebounced;
  },
}));

import { CompileRequestError } from "@/lib/compile";
import { useCompiler } from "@/hooks/useCompiler";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCompiler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
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
    mockCompileLatex.mockResolvedValue(new Uint8Array(8));

    const { result } = renderHook(() => useCompiler(""));

    await act(async () => {
      await result.current.compile("\\documentclass{article}");
    });

    expect(result.current.status).toBe("compiled");
    expect(result.current.pdfData).toBeInstanceOf(Uint8Array);
    expect(result.current.errors).toEqual([]);
  });

  it("compile error with errors array sets status to error", async () => {
    mockCompileLatex.mockRejectedValue(
      new CompileRequestError([
        { line: 5, message: "Undefined control sequence" },
      ])
    );

    const { result } = renderHook(() => useCompiler(""));

    await act(async () => {
      await result.current.compile("\\bad");
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toEqual({ line: 5, message: "Undefined control sequence" });
  });

  it("compile error with detail string sets single error", async () => {
    mockCompileLatex.mockRejectedValue(
      new CompileRequestError([{ line: 0, message: "LaTeX compilation failed" }])
    );

    const { result } = renderHook(() => useCompiler(""));

    await act(async () => {
      await result.current.compile("\\bad");
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toEqual({ line: 0, message: "LaTeX compilation failed" });
  });

  it("network error sets generic error message", async () => {
    mockCompileLatex.mockRejectedValue(new Error("Network Error"));

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

    expect(mockCompileLatex).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("auto-compiles when latex prop has content", async () => {
    mockCompileLatex.mockResolvedValue(new Uint8Array(4));

    renderHook(() => useCompiler("\\documentclass{article}"));

    // The useEffect triggers debouncedCompile (which calls compile synchronously
    // due to our mock). Flush microtasks for the API call to resolve.
    await vi.advanceTimersByTimeAsync(0);

    expect(mockCompileLatex).toHaveBeenCalledWith(
      "\\documentclass{article}",
      expect.any(AbortSignal)
    );
  });
});
