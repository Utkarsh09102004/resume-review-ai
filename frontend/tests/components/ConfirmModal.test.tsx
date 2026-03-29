import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ConfirmModal from "@/components/ConfirmModal";

describe("ConfirmModal", () => {
  const origShowModal = HTMLDialogElement.prototype.showModal;
  const origClose = HTMLDialogElement.prototype.close;

  beforeEach(() => {
    // showModal must set the `open` attribute so jsdom exposes dialog content
    // to the accessibility tree (role queries, etc.)
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
  });

  afterEach(() => {
    cleanup();
    HTMLDialogElement.prototype.showModal = origShowModal;
    HTMLDialogElement.prototype.close = origClose;
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <ConfirmModal
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Resume?"
        message="This action cannot be undone."
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and message when open", () => {
    render(
      <ConfirmModal
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Resume?"
        message="This action cannot be undone."
      />,
    );
    expect(screen.getByText("Delete Resume?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        open={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Delete Resume?"
        message="Sure?"
        confirmLabel="Delete"
      />,
    );
    // The confirm button renders the confirmLabel text ("Delete")
    // Use getAllByRole to find buttons, then pick the one with "Delete" text
    const buttons = screen.getAllByRole("button");
    const confirmBtn = buttons.find((b) => b.textContent === "Delete");
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn!);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel button clicked", () => {
    const onClose = vi.fn();
    render(
      <ConfirmModal
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Delete?"
        message="Sure?"
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape keydown", () => {
    const onClose = vi.fn();
    render(
      <ConfirmModal
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Delete?"
        message="Sure?"
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("uses custom confirmLabel", () => {
    render(
      <ConfirmModal
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Remove item?"
        message="Sure?"
        confirmLabel="Remove"
      />,
    );
    const buttons = screen.getAllByRole("button");
    const removeBtn = buttons.find((b) => b.textContent === "Remove");
    expect(removeBtn).toBeDefined();
  });
});
