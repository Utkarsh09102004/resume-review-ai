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

  describe("filter chip clicks and URL sync", () => {
    const resumesWithAndWithout = [
      {
        id: "r1",
        title: "Has Tailored",
        updatedAt: "2025-06-01T00:00:00Z",
        subResumes: [
          { id: "r1-sub", title: "Tailored V1", updatedAt: "2025-06-01T00:00:00Z" },
        ],
      },
      {
        id: "r2",
        title: "No Tailored",
        updatedAt: "2025-06-02T00:00:00Z",
        subResumes: [],
      },
    ];

    it("calls router.replace with filter=with-tailored when clicking the With Tailored chip", async () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={resumesWithAndWithout}
          initialError={null}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "With Tailored" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?filter=with-tailored",
          { scroll: false }
        );
      });

      expect(
        screen.getByRole("button", { name: "With Tailored" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    it("calls router.replace with filter=without-tailored when clicking the Without Tailored chip", async () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={resumesWithAndWithout}
          initialError={null}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Without Tailored" })
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?filter=without-tailored",
          { scroll: false }
        );
      });

      expect(
        screen.getByRole("button", { name: "Without Tailored" })
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("removes filter param from URL when switching back to All", async () => {
      currentSearchParams = new URLSearchParams("filter=with-tailored");

      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={resumesWithAndWithout}
          initialError={null}
        />
      );

      expect(
        screen.getByRole("button", { name: "With Tailored" })
      ).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(screen.getByRole("button", { name: "All" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard", {
          scroll: false,
        });
      });
    });

    it("hides resumes without tailored versions when With Tailored filter is active", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={resumesWithAndWithout}
          initialError={null}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "With Tailored" }));

      expect(screen.getByText("Has Tailored")).toBeInTheDocument();
      expect(screen.queryByText("No Tailored")).not.toBeInTheDocument();
    });
  });

  describe("sort dropdown changes and URL sync", () => {
    const singleResume = [
      {
        id: "r1",
        title: "My Resume",
        updatedAt: "2025-06-01T00:00:00Z",
        subResumes: [],
      },
    ];

    it("calls router.replace with sort=title-asc when changing the sort dropdown", async () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={singleResume}
          initialError={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Sort"), {
        target: { value: "title-asc" },
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?sort=title-asc",
          { scroll: false }
        );
      });

      expect(screen.getByLabelText("Sort")).toHaveValue("title-asc");
    });

    it("calls router.replace with sort=oldest when changing to oldest sort", async () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={singleResume}
          initialError={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Sort"), {
        target: { value: "oldest" },
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?sort=oldest",
          { scroll: false }
        );
      });
    });

    it("removes sort param from URL when switching back to default (recent)", async () => {
      currentSearchParams = new URLSearchParams("sort=title-asc");

      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={singleResume}
          initialError={null}
        />
      );

      expect(screen.getByLabelText("Sort")).toHaveValue("title-asc");

      fireEvent.change(screen.getByLabelText("Sort"), {
        target: { value: "recent" },
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard", {
          scroll: false,
        });
      });
    });
  });

  describe("combined filter, sort, and query URL interactions", () => {
    const resumes = [
      {
        id: "r1",
        title: "Platform Resume",
        updatedAt: "2025-06-01T00:00:00Z",
        subResumes: [
          { id: "r1-sub", title: "PM Resume", updatedAt: "2025-06-01T00:00:00Z" },
        ],
      },
      {
        id: "r2",
        title: "Design Resume",
        updatedAt: "2025-06-02T00:00:00Z",
        subResumes: [],
      },
    ];

    it("builds URL with both filter and sort when both are non-default", async () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={resumes}
          initialError={null}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "With Tailored" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?filter=with-tailored",
          { scroll: false }
        );
      });

      mockReplace.mockClear();

      fireEvent.change(screen.getByLabelText("Sort"), {
        target: { value: "title-desc" },
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?filter=with-tailored&sort=title-desc",
          { scroll: false }
        );
      });
    });

    it("builds URL with query and filter together", async () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={resumes}
          initialError={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Search"), {
        target: { value: "PM" },
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard?q=PM", {
          scroll: false,
        });
      });

      mockReplace.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "With Tailored" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?q=PM&filter=with-tailored",
          { scroll: false }
        );
      });
    });

    it("builds URL with all three controls when all are non-default", async () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={resumes}
          initialError={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Search"), {
        target: { value: "Platform" },
      });
      fireEvent.click(screen.getByRole("button", { name: "With Tailored" }));
      fireEvent.change(screen.getByLabelText("Sort"), {
        target: { value: "title-asc" },
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?q=Platform&filter=with-tailored&sort=title-asc",
          { scroll: false }
        );
      });
    });
  });

  describe("reset controls (Clear filters button)", () => {
    it("resets all controls and pushes clean URL when Clear filters is clicked from controls bar", async () => {
      currentSearchParams = new URLSearchParams(
        "q=test&filter=with-tailored&sort=title-asc"
      );

      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "Test Resume",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [
                {
                  id: "r1-sub",
                  title: "Test Tailored",
                  updatedAt: "2025-06-01T00:00:00Z",
                },
              ],
            },
          ]}
          initialError={null}
        />
      );

      expect(screen.getByLabelText("Search")).toHaveValue("test");
      expect(screen.getByLabelText("Sort")).toHaveValue("title-asc");
      expect(
        screen.getByRole("button", { name: "With Tailored" })
      ).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard", {
          scroll: false,
        });
      });

      expect(screen.getByLabelText("Search")).toHaveValue("");
      expect(screen.getByLabelText("Sort")).toHaveValue("recent");
      expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("shows Clear filters button only when controls are active", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "My Resume",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [],
            },
          ]}
          initialError={null}
        />
      );

      expect(
        screen.queryByRole("button", { name: "Clear filters" })
      ).not.toBeInTheDocument();

      // Use a query that still matches something so the no-results panel
      // does not appear (which would add a second "Clear filters" button).
      fireEvent.change(screen.getByLabelText("Search"), {
        target: { value: "My" },
      });

      expect(
        screen.getByRole("button", { name: "Clear filters" })
      ).toBeInTheDocument();
    });
  });

  describe("search clear button (X icon)", () => {
    it("clears the search query and updates URL when the X button is clicked", async () => {
      // Start with query already in the URL so the clear produces a real change.
      currentSearchParams = new URLSearchParams("q=My");

      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "My Resume",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [],
            },
          ]}
          initialError={null}
        />
      );

      expect(screen.getByLabelText("Search")).toHaveValue("My");

      fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

      expect(screen.getByLabelText("Search")).toHaveValue("");

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard", {
          scroll: false,
        });
      });
    });

    it("preserves non-default filter and sort when clearing the search query", async () => {
      // Start with all three controls already in the URL so the clear-search
      // produces a real URL change (q removed, filter+sort preserved).
      currentSearchParams = new URLSearchParams(
        "q=My&filter=with-tailored&sort=title-asc"
      );

      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "My Resume",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [
                {
                  id: "r1-sub",
                  title: "Tailored",
                  updatedAt: "2025-06-01T00:00:00Z",
                },
              ],
            },
          ]}
          initialError={null}
        />
      );

      expect(screen.getByLabelText("Search")).toHaveValue("My");
      expect(screen.getByLabelText("Sort")).toHaveValue("title-asc");
      expect(
        screen.getByRole("button", { name: "With Tailored" })
      ).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard?filter=with-tailored&sort=title-asc",
          { scroll: false }
        );
      });
    });
  });

  describe("controls disabled states", () => {
    it("disables search, filter chips, and sort when there is a load error", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[]}
          initialError="Failed to load"
        />
      );

      expect(screen.getByLabelText("Search")).toBeDisabled();
      expect(screen.getByLabelText("Sort")).toBeDisabled();
      expect(screen.getByRole("button", { name: "All" })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "With Tailored" })
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Without Tailored" })
      ).toBeDisabled();
    });

    it("disables search, filter chips, and sort when there are no resumes", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[]}
          initialError={null}
        />
      );

      expect(screen.getByLabelText("Search")).toBeDisabled();
      expect(screen.getByLabelText("Sort")).toBeDisabled();
      expect(screen.getByRole("button", { name: "All" })).toBeDisabled();
    });
  });

  describe("result summary text", () => {
    it("shows the correct summary when a filter is active", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "Has Tailored",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [
                {
                  id: "r1-sub",
                  title: "Tailored V1",
                  updatedAt: "2025-06-01T00:00:00Z",
                },
              ],
            },
            {
              id: "r2",
              title: "No Tailored",
              updatedAt: "2025-06-02T00:00:00Z",
              subResumes: [],
            },
          ]}
          initialError={null}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "With Tailored" }));

      expect(
        screen.getByText("1 resume with tailored versions")
      ).toBeInTheDocument();
    });

    it("shows the correct summary when a search query is active", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "Platform Resume",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [],
            },
            {
              id: "r2",
              title: "Design Resume",
              updatedAt: "2025-06-02T00:00:00Z",
              subResumes: [],
            },
          ]}
          initialError={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Search"), {
        target: { value: "Platform" },
      });

      expect(
        screen.getByText('1 resume matching "Platform"')
      ).toBeInTheDocument();
    });

    it("shows Dashboard unavailable when there is a load error", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[]}
          initialError="Server error"
        />
      );

      expect(screen.getByText("Dashboard unavailable")).toBeInTheDocument();
    });

    it("shows No resume projects yet when resumes are empty with no error", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[]}
          initialError={null}
        />
      );

      expect(screen.getByText("No resume projects yet")).toBeInTheDocument();
    });
  });

  describe("heading text reflects active controls", () => {
    it("shows All resume projects when no controls are active", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "My Resume",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [],
            },
          ]}
          initialError={null}
        />
      );

      expect(screen.getByText("All resume projects")).toBeInTheDocument();
    });

    it("shows Filtered resume projects when a filter is active", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "My Resume",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [
                {
                  id: "r1-sub",
                  title: "Tailored V1",
                  updatedAt: "2025-06-01T00:00:00Z",
                },
              ],
            },
          ]}
          initialError={null}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "With Tailored" }));

      expect(screen.getByText("Filtered resume projects")).toBeInTheDocument();
    });

    it("shows Filtered resume projects when sort is non-default", () => {
      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "My Resume",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [],
            },
          ]}
          initialError={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Sort"), {
        target: { value: "title-asc" },
      });

      expect(screen.getByText("Filtered resume projects")).toBeInTheDocument();
    });
  });

  describe("no-results Clear filters resets controls and URL", () => {
    it("resets all controls from the no-results Clear filters button", async () => {
      currentSearchParams = new URLSearchParams("q=nonexistent&sort=title-desc");

      render(
        <DashboardPageClient
          user={{ name: "User" }}
          resumes={[
            {
              id: "r1",
              title: "My Resume",
              updatedAt: "2025-06-01T00:00:00Z",
              subResumes: [],
            },
          ]}
          initialError={null}
        />
      );

      expect(
        screen.getByText('No resumes match "nonexistent".')
      ).toBeInTheDocument();

      // Both the controls bar and the no-results panel render a "Clear filters"
      // button. Click the first one — both invoke handleResetControls.
      const clearButtons = screen.getAllByRole("button", {
        name: "Clear filters",
      });
      expect(clearButtons.length).toBe(2);
      fireEvent.click(clearButtons[0]);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard", {
          scroll: false,
        });
      });

      expect(screen.getByLabelText("Search")).toHaveValue("");
      expect(screen.getByLabelText("Sort")).toHaveValue("recent");
    });
  });
});
