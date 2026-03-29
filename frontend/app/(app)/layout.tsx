import type { ReactNode } from "react";
import { requireUserDisplayInfo } from "@/lib/auth";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUserDisplayInfo();

  return children;
}
