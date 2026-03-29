import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mutable mock return value that tests can modify
let mockHookReturn = {
  resumes: [] as { id: string; title: string; updatedAt: string; latexSource: string; subResumes: { id: string; title: string; updatedAt: string }[] }[],
  loading: true,
  error: null as string | null,
  fetchResumes: vi.fn(),
  createResume: vi.fn(),
  createSubResume: vi.fn(),
  renameResume: vi.fn(),
  duplicateResume: vi.fn(),
  deleteResume: vi.fn(),
};

vi.mock("@/hooks/useResumes", () => ({
  useResumes: () => mockHookReturn,
}));

import DashboardPage from "@/app/dashboard/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DashboardPage", () => {
  const origShowModal = HTMLDialogElement.prototype.showModal;
  const origClose = HTMLDialogElement.prototype.close;

  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    mockHookReturn = {
      resumes: [],
      loading: true,
      error: null,
      fetchResumes: vi.fn(),
      createResume: vi.fn(),
      createSubResume: vi.fn(),
      renameResume: vi.fn(),
      duplicateResume: vi.fn(),
      deleteResume: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    HTMLDialogElement.prototype.showModal = origShowModal;
    HTMLDialogElement.prototype.close = origClose;
  });

  it("shows loading state", () => {
    mockHookReturn.loading = true;
    render(<DashboardPage />);
    expect(screen.getByText("Loading resumes...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockHookReturn.loading = false;
    mockHookReturn.error = "Failed to load resumes";
    render(<DashboardPage />);
    expect(screen.getByText("Failed to load resumes")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows empty state when no resumes", () => {
    mockHookReturn.loading = false;
    mockHookReturn.resumes = [];
    render(<DashboardPage />);
    expect(screen.getByText("No resumes yet")).toBeInTheDocument();
  });

  it("renders resume cards when resumes exist", () => {
    mockHookReturn.loading = false;
    mockHookReturn.resumes = [
      {
        id: "r1",
        title: "My Resume",
        updatedAt: "2025-01-01T00:00:00Z",
        latexSource: "\\documentclass{article}",
        subResumes: [],
      },
    ];
    render(<DashboardPage />);
    expect(screen.getByText("My Resume")).toBeInTheDocument();
  });
});
