import DashboardPageClient from "@/components/dashboard/DashboardPageClient";
import { createAuthenticatedApi } from "@/lib/api";
import { requireUserDisplayInfo } from "@/lib/auth";
import { groupResumes } from "@/lib/resumes";
import type { ResumeFromAPI } from "@/lib/resumes";

async function getDashboardData() {
  try {
    const client = await createAuthenticatedApi();
    const response = await client.get<ResumeFromAPI[]>("/api/resumes/");

    return {
      resumes: groupResumes(response.data),
      error: null,
    };
  } catch (error) {
    console.error("getDashboardData error:", error);

    return {
      resumes: [],
      error: "Failed to load resumes",
    };
  }
}

export default async function DashboardPage() {
  const [user, dashboardData] = await Promise.all([
    requireUserDisplayInfo(),
    getDashboardData(),
  ]);

  return (
    <DashboardPageClient
      user={user}
      resumes={dashboardData.resumes}
      initialError={dashboardData.error}
    />
  );
}
