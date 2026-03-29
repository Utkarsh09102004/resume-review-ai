import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import StatusPill from "@/components/StatusPill";

describe("StatusPill", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows Compiling... for compiling status", () => {
    render(<StatusPill variant="compiling" />);
    expect(screen.getByText("Compiling...")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows Compiled for compiled status", () => {
    render(<StatusPill variant="compiled" />);
    expect(screen.getByText("Compiled")).toBeInTheDocument();
  });

  it("shows Compiled with ago text when provided", () => {
    render(<StatusPill variant="compiled" compiledAgo="5s ago" />);
    expect(screen.getByText("Compiled 5s ago")).toBeInTheDocument();
  });

  it("shows error count for error status", () => {
    render(<StatusPill variant="error" errorCount={3} />);
    expect(screen.getByText("3 errors")).toBeInTheDocument();
  });

  it("shows singular error for count of 1", () => {
    render(<StatusPill variant="error" errorCount={1} />);
    expect(screen.getByText("1 error")).toBeInTheDocument();
  });

  it("shows generic Error when no errorCount provided", () => {
    render(<StatusPill variant="error" />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("error variant is a clickable button", () => {
    const onClick = vi.fn();
    render(<StatusPill variant="error" errorCount={2} onClick={onClick} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
