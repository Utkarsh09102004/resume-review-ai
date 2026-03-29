import type { ReactNode } from "react";
import { requireUserDisplayInfo } from "@/lib/auth";

// The authenticated shell depends on request-scoped auth state for every render.
export const dynamic = "force-dynamic";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUserDisplayInfo();

  return children;
}
