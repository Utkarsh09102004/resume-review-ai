import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const { mockEditorReturn } = vi.hoisted(() => ({
  mockEditorReturn: {
    resume: null as null | Record<string, unknown>,
    parentResume: null as null | Record<string, unknown>,
    loading: true,
    notFound: false,
    error: null as string | null,
    isSaving: false,
    save: vi.fn(),
  },
}));

vi.mock("@/hooks/useResumeEditor", () => ({
  useResumeEditor: () => mockEditorReturn,
}));

vi.mock("@/hooks/useCompiler", () => ({
  useCompiler: () => ({
    pdfData: null,
    errors: [],
    status: "idle",
    compiledAgo: "",
    compile: vi.fn(),
  }),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    return function DynamicStub() {
      return React.createElement("div", { "data-testid": "dynamic-stub" });
    };
  },
}));

vi.mock("@/lib/api", () => ({ default: { post: vi.fn() } }));

vi.mock("@/components/editor/SplitPane", () => ({
  default: ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) =>
    React.createElement("div", null, left, right),
}));

import EditorPage from "@/app/editor/[id]/page";

// ---------------------------------------------------------------------------
// Helper — render with pre-resolved params to avoid Suspense issues
// ---------------------------------------------------------------------------

function renderEditor() {
  // Pre-resolve the params promise so use() doesn't suspend
  const resolvedParams = Promise.resolve({ id: "test-id" });
  return render(
    <React.Suspense fallback={<div>Suspense loading...</div>}>
      <EditorPage params={resolvedParams} />
    </React.Suspense>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorReturn.resume = null;
    mockEditorReturn.parentResume = null;
    mockEditorReturn.loading = true;
    mockEditorReturn.notFound = false;
    mockEditorReturn.error = null;
    mockEditorReturn.isSaving = false;
    mockEditorReturn.save = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading state", async () => {
    mockEditorReturn.loading = true;
    await act(async () => {
      renderEditor();
    });
    await waitFor(() => {
      expect(screen.getByText("Loading resume...")).toBeInTheDocument();
    });
  });

  it("shows not-found state", async () => {
    mockEditorReturn.loading = false;
    mockEditorReturn.notFound = true;
    await act(async () => {
      renderEditor();
    });
    await waitFor(() => {
      expect(screen.getByText("Resume not found")).toBeInTheDocument();
    });
    expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
  });

  it("shows error state", async () => {
    mockEditorReturn.loading = false;
    mockEditorReturn.error = "Failed to load resume";
    await act(async () => {
      renderEditor();
    });
    await waitFor(() => {
      expect(screen.getByText("Failed to load resume")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders editor controls when resume loaded", async () => {
    mockEditorReturn.loading = false;
    mockEditorReturn.resume = {
      id: "test-id",
      user_id: "u1",
      parent_id: null,
      title: "My Resume",
      latex_source: "\\documentclass{article}",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };
    await act(async () => {
      renderEditor();
    });
    await waitFor(() => {
      expect(screen.getByText("Save")).toBeInTheDocument();
    });
    expect(screen.getByText("Download PDF")).toBeInTheDocument();
  });
});
