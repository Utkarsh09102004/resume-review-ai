import { describe, expect, it } from "vitest";
import { groupResumes } from "@/lib/resumes";

describe("groupResumes", () => {
  it("groups sub-resumes under their parent and sorts by updated time", () => {
    const grouped = groupResumes([
      {
        id: "main-older",
        user_id: "user-1",
        parent_id: null,
        title: "Older Resume",
        latex_source: "older-source",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "sub-newer",
        user_id: "user-1",
        parent_id: "main-newer",
        title: "Tailored Resume",
        latex_source: "tailored-source",
        created_at: "2025-01-03T00:00:00Z",
        updated_at: "2025-01-03T00:00:00Z",
      },
      {
        id: "main-newer",
        user_id: "user-1",
        parent_id: null,
        title: "Newer Resume",
        latex_source: "newer-source",
        created_at: "2025-01-02T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      },
      {
        id: "sub-older",
        user_id: "user-1",
        parent_id: "main-newer",
        title: "Older Tailored Resume",
        latex_source: "older-tailored-source",
        created_at: "2025-01-02T01:00:00Z",
        updated_at: "2025-01-02T01:00:00Z",
      },
    ]);

    expect(grouped).toEqual([
      {
        id: "main-newer",
        title: "Newer Resume",
        updatedAt: "2025-01-02T00:00:00Z",
        subResumes: [
          {
            id: "sub-newer",
            title: "Tailored Resume",
            updatedAt: "2025-01-03T00:00:00Z",
          },
          {
            id: "sub-older",
            title: "Older Tailored Resume",
            updatedAt: "2025-01-02T01:00:00Z",
          },
        ],
      },
      {
        id: "main-older",
        title: "Older Resume",
        updatedAt: "2025-01-01T00:00:00Z",
        subResumes: [],
      },
    ]);
  });
});
