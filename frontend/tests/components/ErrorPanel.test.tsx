import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ErrorPanel from "@/components/editor/ErrorPanel";

describe("ErrorPanel", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    expanded: true,
    onToggle: vi.fn(),
    onLineClick: vi.fn(),
  };

  it("renders nothing when errors array is empty", () => {
    const { container } = render(
      <ErrorPanel {...defaultProps} errors={[]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows error count with correct pluralization", () => {
    const { rerender } = render(
      <ErrorPanel {...defaultProps} errors={[{ line: 1, message: "err1" }]} />,
    );
    expect(screen.getByText("1 error")).toBeInTheDocument();

    rerender(
      <ErrorPanel
        {...defaultProps}
        errors={[
          { line: 1, message: "err1" },
          { line: 2, message: "err2" },
        ]}
      />,
    );
    expect(screen.getByText("2 errors")).toBeInTheDocument();
  });

  it("displays error line number and message", () => {
    render(
      <ErrorPanel
        {...defaultProps}
        errors={[{ line: 10, message: "Undefined control sequence" }]}
      />,
    );
    expect(screen.getByText("L10")).toBeInTheDocument();
    expect(screen.getByText("Undefined control sequence")).toBeInTheDocument();
  });

  it("calls onLineClick with correct line number", () => {
    const onLineClick = vi.fn();
    render(
      <ErrorPanel
        {...defaultProps}
        onLineClick={onLineClick}
        errors={[{ line: 42, message: "err" }]}
      />,
    );
    fireEvent.click(screen.getByText("L42").closest("button")!);
    expect(onLineClick).toHaveBeenCalledWith(42);
  });
});
