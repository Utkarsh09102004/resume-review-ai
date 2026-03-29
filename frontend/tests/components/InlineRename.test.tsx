import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import InlineRename from "@/components/dashboard/InlineRename";

describe("InlineRename", () => {
  let onSave: ReturnType<typeof vi.fn<(newTitle: string) => void>>;
  let onCancel: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onSave = vi.fn<(newTitle: string) => void>();
    onCancel = vi.fn<() => void>();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders input with initial value", () => {
    render(<InlineRename value="My Resume" onSave={onSave} onCancel={onCancel} />);
    const input = screen.getByRole("textbox", { name: /rename/i });
    expect(input).toHaveValue("My Resume");
  });

  it("Enter key saves with trimmed text", () => {
    render(<InlineRename value="Old Title" onSave={onSave} onCancel={onCancel} />);
    const input = screen.getByRole("textbox", { name: /rename/i });
    fireEvent.change(input, { target: { value: "  New Title  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("New Title");
  });

  it("Enter key with empty text cancels", () => {
    render(<InlineRename value="Old Title" onSave={onSave} onCancel={onCancel} />);
    const input = screen.getByRole("textbox", { name: /rename/i });
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Escape key cancels", () => {
    render(<InlineRename value="Old Title" onSave={onSave} onCancel={onCancel} />);
    const input = screen.getByRole("textbox", { name: /rename/i });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blur saves when text has changed", () => {
    render(<InlineRename value="Old Title" onSave={onSave} onCancel={onCancel} />);
    const input = screen.getByRole("textbox", { name: /rename/i });
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith("New Title");
  });

  it("blur cancels when text has not changed", () => {
    render(<InlineRename value="My Resume" onSave={onSave} onCancel={onCancel} />);
    const input = screen.getByRole("textbox", { name: /rename/i });
    fireEvent.blur(input);
    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
