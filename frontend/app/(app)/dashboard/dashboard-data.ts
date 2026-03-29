import "server-only";

import { createAuthenticatedApiRSC } from "@/lib/api";
import { groupResumes } from "@/lib/resumes";
import type { ResumeFromAPI, ResumeGroup } from "@/lib/resumes";

export interface DashboardPageData {
  resumes: ResumeGroup[];
  error: string | null;
}

export async function getDashboardPageData(): Promise<DashboardPageData> {
  try {
    const client = await createAuthenticatedApiRSC();
    const response = await client.get<ResumeFromAPI[]>("/api/resumes/");

    return {
      resumes: groupResumes(response.data),
      error: null,
    };
  } catch (error) {
    console.error("getDashboardPageData error:", error);

    return {
      resumes: [],
      error: "Failed to load resumes",
    };
  }
}
