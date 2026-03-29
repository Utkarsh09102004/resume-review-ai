import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  act,
  fireEvent,
} from "@testing-library/react";
import React from "react";
import EditorWorkspace from "@/components/editor/EditorWorkspace";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockSaveResumeLatexAction, mockRenameResumeAction, mockApiPost } =
  vi.hoisted(() => ({
    mockSaveResumeLatexAction: vi.fn(),
    mockRenameResumeAction: vi.fn(),
    mockApiPost: vi.fn(),
  }));

vi.mock("@/app/(app)/editor/[id]/actions", () => ({
  saveResumeLatexAction: (...args: unknown[]) =>
    mockSaveResumeLatexAction(...args),
  renameResumeAction: (...args: unknown[]) => mockRenameResumeAction(...args),
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

vi.mock("@/lib/api", () => ({
  default: { post: (...args: unknown[]) => mockApiPost(...args) },
}));

vi.mock("@/components/editor/EditorPanel", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) =>
    React.createElement("textarea", {
      "aria-label": "Editor",
      value,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
        onChange(event.target.value),
    }),
}));

vi.mock("@/components/editor/PreviewPanel", () => ({
  default: () => React.createElement("div", null, "Preview"),
}));

vi.mock("@/components/editor/ErrorPanel", () => ({
  default: () => React.createElement("div", null, "Errors"),
}));

vi.mock("@/components/editor/SplitPane", () => ({
  default: ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) =>
    React.createElement("div", null, left, right),
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderEditor() {
  const initialResume = {
    id: "test-id",
    user_id: "u1",
    parent_id: null,
    title: "My Resume",
    latex_source: "\\documentclass{article}",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };

  return render(
    <EditorWorkspace
      initialResume={initialResume}
      parentResume={null}
      user={{ name: "User" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EditorWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiPost.mockResolvedValue({ data: new ArrayBuffer(8) });
    mockSaveResumeLatexAction.mockResolvedValue({
      id: "test-id",
      user_id: "u1",
      parent_id: null,
      title: "My Resume",
      latex_source: "\\updated{}",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
    });
    mockRenameResumeAction.mockResolvedValue({
      id: "test-id",
      user_id: "u1",
      parent_id: null,
      title: "Renamed Resume",
      latex_source: "\\documentclass{article}",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders editor controls with the server-loaded resume", async () => {
    await act(async () => {
      renderEditor();
    });
    await waitFor(() => {
      expect(screen.getByText("Save")).toBeInTheDocument();
    });
    expect(screen.getByText("Download PDF")).toBeInTheDocument();
    expect(screen.getByText("My Resume")).toBeInTheDocument();
  });

  it("saves updated latex through the server action", async () => {
    renderEditor();

    const editor = screen.getAllByRole("textbox", { name: "Editor" })[0];
    fireEvent.change(editor, { target: { value: "\\updated{}" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockSaveResumeLatexAction).toHaveBeenCalledWith(
        "test-id",
        "\\updated{}"
      );
    });
  });

  it("renames the resume through the server action", async () => {
    renderEditor();

    fireEvent.click(
      screen.getByRole("button", { name: "Click to rename resume" })
    );
    const input = screen.getByRole("textbox", { name: "Resume title" });
    fireEvent.change(input, { target: { value: "Renamed Resume" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockRenameResumeAction).toHaveBeenCalledWith(
        "test-id",
        "Renamed Resume"
      );
    });
  });
});
