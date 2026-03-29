import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import DashboardPageClient from "@/components/dashboard/DashboardPageClient";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
const mockCreateResumeAction = vi.fn();
const mockCreateSubResumeAction = vi.fn();
const mockRenameResumeAction = vi.fn();
const mockDuplicateResumeAction = vi.fn();
const mockDeleteResumeAction = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => currentSearchParams,
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

describe("DashboardPageClient", () => {
  const origShowModal = HTMLDialogElement.prototype.showModal;
  const origClose = HTMLDialogElement.prototype.close;
  const recentTimestamp = new Date().toISOString();
  const staleTimestamp = "2025-01-01T00:00:00Z";

  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams();
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

  it("shows the inline error state and refreshes on retry", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[]}
        initialError="Failed to load resumes"
      />
    );

    expect(screen.getByText("Failed to load resumes")).toBeInTheDocument();
    expect(screen.getByText("My Resumes")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Try again"));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows the richer empty state when no resumes exist", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[]}
        initialError={null}
      />
    );

    expect(screen.getByText("No resumes yet")).toBeInTheDocument();
    expect(screen.getByText("Draft a master resume")).toBeInTheDocument();
    expect(screen.getByText("Base Resumes")).toBeInTheDocument();
  });

  it("exposes a sign-out link in the authenticated toolbar", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[]}
        initialError={null}
      />
    );

    expect(screen.getByRole("link", { name: "Sign out" })).toHaveAttribute(
      "href",
      "/api/logto/sign-out"
    );
  });

  it("moves the primary new resume action into the hero", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[]}
        initialError={null}
      />
    );

    expect(screen.getAllByRole("button", { name: "New Resume" })).toHaveLength(1);
  });

  it("renders the KPI strip and real control strip", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[
          {
            id: "r1",
            title: "My Resume",
            updatedAt: recentTimestamp,
            subResumes: [
              {
                id: "r2",
                title: "PM Resume",
                updatedAt: staleTimestamp,
              },
            ],
          },
        ]}
        initialError={null}
      />
    );

    expect(screen.getByText("Base Resumes")).toBeInTheDocument();
    expect(screen.getAllByText("Tailored Versions").length).toBeGreaterThan(0);
    expect(screen.getByText("Recently Updated")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toHaveAttribute(
      "placeholder",
      "Search resumes and tailored versions"
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByLabelText("Sort")).toHaveValue("recent");
    expect(screen.getByText("1 resume")).toBeInTheDocument();
  });

  it("renders resume cards when resumes exist", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[
          {
            id: "r1",
            title: "My Resume",
            updatedAt: staleTimestamp,
            subResumes: [],
          },
        ]}
        initialError={null}
      />
    );

    expect(screen.getByText("My Resume")).toBeInTheDocument();
    expect(screen.getAllByText("No tailored versions yet").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Open My Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename My Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create tailored version" })).toBeInTheDocument();
  });

  it("renders tailored versions as attached cards with visible actions", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[
          {
            id: "r1",
            title: "My Resume",
            updatedAt: recentTimestamp,
            subResumes: [
              {
                id: "r2",
                title: "PM Resume",
                updatedAt: recentTimestamp,
              },
            ],
          },
        ]}
        initialError={null}
      />
    );

    expect(screen.getByText("PM Resume")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Open / })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Rename PM Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create tailored version" })).toBeInTheDocument();
  });

  it("opens the tailored version naming flow with updated copy", () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[
          {
            id: "r1",
            title: "My Resume",
            updatedAt: recentTimestamp,
            subResumes: [],
          },
        ]}
        initialError={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create tailored version" }));

    expect(screen.getByText("Name Your Tailored Version")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create tailored version" })).toBeInTheDocument();
  });

  it("filters by tailored-version title while keeping the base card visible", async () => {
    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[
          {
            id: "r1",
            title: "My Resume",
            updatedAt: recentTimestamp,
            subResumes: [
              {
                id: "r2",
                title: "PM Resume",
                updatedAt: recentTimestamp,
              },
              {
                id: "r3",
                title: "Marketing Resume",
                updatedAt: staleTimestamp,
              },
            ],
          },
        ]}
        initialError={null}
      />
    );

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "PM" },
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard?q=PM", { scroll: false });
    });

    expect(screen.getByText("My Resume")).toBeInTheDocument();
    expect(screen.getByText("PM Resume")).toBeInTheDocument();
    expect(screen.queryByText("Marketing Resume")).not.toBeInTheDocument();
    expect(screen.getByText("Tailored match")).toBeInTheDocument();
    expect(screen.getByText("Match")).toBeInTheDocument();
  });

  it("hydrates controls from the URL and shows the no-results state", async () => {
    currentSearchParams = new URLSearchParams(
      "q=designer&filter=with-tailored&sort=title-asc"
    );

    render(
      <DashboardPageClient
        user={{ name: "User" }}
        resumes={[
          {
            id: "r1",
            title: "Platform Resume",
            updatedAt: recentTimestamp,
            subResumes: [],
          },
        ]}
        initialError={null}
      />
    );

    expect(screen.getByLabelText("Search")).toHaveValue("designer");
    expect(screen.getByRole("button", { name: "With Tailored" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByLabelText("Sort")).toHaveValue("title-asc");
    expect(screen.getByText('No resumes match "designer".')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard", { scroll: false });
    });
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
