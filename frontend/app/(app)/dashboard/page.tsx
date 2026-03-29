import DashboardPageClient from "@/components/dashboard/DashboardPageClient";
import { requireUserDisplayInfo } from "@/lib/auth";
import { getDashboardPageData } from "./dashboard-data";

export default async function DashboardPage() {
  const [user, dashboardData] = await Promise.all([
    requireUserDisplayInfo(),
    getDashboardPageData(),
  ]);

  return (
    <DashboardPageClient
      user={user}
      resumes={dashboardData.resumes}
      initialError={dashboardData.error}
    />
  );
}
