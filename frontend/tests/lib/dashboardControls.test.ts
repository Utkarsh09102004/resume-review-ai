import { describe, expect, it } from "vitest";
import {
  buildDashboardControlsSearchParams,
  formatDashboardResultsSummary,
  getVisibleResumeGroups,
  parseDashboardControls,
} from "@/lib/dashboardControls";

const resumes = [
  {
    id: "base-1",
    title: "Platform Resume",
    updatedAt: "2025-01-05T00:00:00Z",
    subResumes: [
      {
        id: "sub-1",
        title: "Backend Resume",
        updatedAt: "2025-01-06T00:00:00Z",
      },
      {
        id: "sub-2",
        title: "Product Resume",
        updatedAt: "2025-01-04T00:00:00Z",
      },
    ],
  },
  {
    id: "base-2",
    title: "General Resume",
    updatedAt: "2025-01-02T00:00:00Z",
    subResumes: [],
  },
];

describe("dashboardControls", () => {
  it("parses and canonicalizes dashboard query state", () => {
    expect(
      parseDashboardControls(
        new URLSearchParams("q= backend &filter=with-tailored&sort=title-asc")
      )
    ).toEqual({
      query: "backend",
      filter: "with-tailored",
      sort: "title-asc",
    });

    expect(
      buildDashboardControlsSearchParams(
        {
          query: "backend",
          filter: "with-tailored",
          sort: "title-asc",
        },
        "page=2"
      ).toString()
    ).toBe("page=2&q=backend&filter=with-tailored&sort=title-asc");
  });

  it("keeps a base resume visible when a tailored version matches the search", () => {
    expect(
      getVisibleResumeGroups(resumes, {
        query: "backend",
        filter: "all",
        sort: "recent",
      })
    ).toEqual([
      {
        id: "base-1",
        title: "Platform Resume",
        updatedAt: "2025-01-05T00:00:00Z",
        subResumes: [
          {
            id: "sub-1",
            title: "Backend Resume",
            updatedAt: "2025-01-06T00:00:00Z",
          },
          {
            id: "sub-2",
            title: "Product Resume",
            updatedAt: "2025-01-04T00:00:00Z",
          },
        ],
        matchedBase: false,
        matchedSubResumeIds: ["sub-1"],
        searchMatchSource: "tailored",
        visibleSubResumes: [
          {
            id: "sub-1",
            title: "Backend Resume",
            updatedAt: "2025-01-06T00:00:00Z",
          },
        ],
      },
    ]);
  });

  it("formats the results summary for filtered views", () => {
    expect(
      formatDashboardResultsSummary(4, {
        query: "backend",
        filter: "with-tailored",
      })
    ).toBe('4 resumes matching "backend" with tailored versions');
  });
});
