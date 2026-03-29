import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import DashboardPageClient from "@/components/dashboard/DashboardPageClient";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockCreateResumeAction = vi.fn();
const mockCreateSubResumeAction = vi.fn();
const mockRenameResumeAction = vi.fn();
const mockDuplicateResumeAction = vi.fn();
const mockDeleteResumeAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("@/app/(app)/dashboard/actions", () => ({
  createResumeAction: (...args: Parameters<typeof mockCreateResumeAction>) =>
    mockCreateResumeAction(...args),
  createSubResumeAction: (...args: Parameters<typeof mockCreateSubResumeAction>) =>
    mockCreateSubResumeAction(...args),
  renameResumeAction: (...args: Parameters<typeof mockRenameResumeAction>) =>
    mockRenameResumeAction(...args),
  duplicateResumeAction: (...args: Parameters<typeof mockDuplicateResumeAction>) =>
    mockDuplicateResumeAction(...args),
  deleteResumeAction: (...args: Parameters<typeof mockDeleteResumeAction>) =>
    mockDeleteResumeAction(...args),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DashboardPageClient", () => {
  const origShowModal = HTMLDialogElement.prototype.showModal;
  const origClose = HTMLDialogElement.prototype.close;

  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    mockCreateResumeAction.mockResolvedValue({ ok: true, resumeId: "resume-new" });
    mockCreateSubResumeAction.mockResolvedValue({ ok: true, resumeId: "resume-sub" });
    mockRenameResumeAction.mockResolvedValue({ ok: true });
    mockDuplicateResumeAction.mockResolvedValue({ ok: true, resumeId: "resume-copy" });
    mockDeleteResumeAction.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
    HTMLDialogElement.prototype.showModal = origShowModal;
    HTMLDialogElement.prototype.close = origClose;
  });

  it("shows error state and refreshes on retry", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[]}
        initialError="Failed to load resumes"
      />
    );

    expect(screen.getByText("Failed to load resumes")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Try again"));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no resumes", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[]}
        initialError={null}
      />
    );
    expect(screen.getByText("No resumes yet")).toBeInTheDocument();
  });

  it("renders resume cards when resumes exist", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[
          {
            id: "r1",
            title: "My Resume",
            updatedAt: "2025-01-01T00:00:00Z",
            latexSource: "\\documentclass{article}",
            subResumes: [],
          },
        ]}
        initialError={null}
      />
    );

    expect(screen.getByText("My Resume")).toBeInTheDocument();
  });

  it("creates a new resume through the server action and routes to the editor", async () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[]}
        initialError={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Resume" }));
    fireEvent.change(screen.getByLabelText("Resume name"), {
      target: { value: "Platform Resume" },
    });
    fireEvent.submit(screen.getByLabelText("Resume name").closest("form")!);

    await waitFor(() => {
      expect(mockCreateResumeAction).toHaveBeenCalledWith("Platform Resume");
      expect(mockPush).toHaveBeenCalledWith("/editor/resume-new");
    });
  });
});
