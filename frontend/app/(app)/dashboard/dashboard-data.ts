import "server-only";

import { redirect } from "next/navigation";
import {
  createAuthenticatedApiRSC,
  isMissingAuthenticatedTokenError,
} from "@/lib/api";
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
    if (isMissingAuthenticatedTokenError(error)) {
      redirect("/api/logto/sign-in");
    }

    console.error("getDashboardPageData error:", error);

    return {
      resumes: [],
      error: "Failed to load resumes",
    };
  }
}
