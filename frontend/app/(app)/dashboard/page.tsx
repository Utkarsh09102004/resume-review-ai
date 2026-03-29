import DashboardPageClient from "@/components/dashboard/DashboardPageClient";
import { requireUserDisplayInfo } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUserDisplayInfo();

  return <DashboardPageClient user={user} />;
}
