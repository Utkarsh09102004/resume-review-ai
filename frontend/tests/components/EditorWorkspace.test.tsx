import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditorWorkspace from "@/components/editor/EditorWorkspace";

const mockEditorWorkspaceClient = vi.fn<(props: unknown) => void>();

vi.mock("@/components/editor/EditorWorkspaceClient", () => ({
  default: (props: unknown) => {
    mockEditorWorkspaceClient(props);
    return React.createElement("div");
  },
}));

describe("EditorWorkspace server wrapper", () => {
  it("passes only the editor fields needed by the client workspace", () => {
    render(
      <EditorWorkspace
        initialResume={{
          id: "resume-123",
          user_id: "user-1",
          parent_id: null,
          title: "My Resume",
          latex_source: "\\documentclass{article}",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        }}
        parentResume={{
          id: "parent-123",
          user_id: "user-1",
          parent_id: null,
          title: "Base Resume",
          latex_source: "\\documentclass{article}",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        }}
        user={{ name: "Alice", avatarUrl: "https://example.com/alice.png" }}
      />
    );

    expect(mockEditorWorkspaceClient).toHaveBeenCalledWith({
      initialDocument: {
        id: "resume-123",
        title: "My Resume",
        latexSource: "\\documentclass{article}",
      },
      parentTitle: "Base Resume",
      user: {
        name: "Alice",
        avatarUrl: "https://example.com/alice.png",
      },
    });
  });
});
