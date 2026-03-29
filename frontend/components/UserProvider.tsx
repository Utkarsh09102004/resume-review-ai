"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserDisplayInfo } from "@/lib/auth";

const UserContext = createContext<UserDisplayInfo | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: UserDisplayInfo | null;
  children: ReactNode;
}) {
  return <UserContext value={user}>{children}</UserContext>;
}

export function useUser(): UserDisplayInfo | null {
  return useContext(UserContext);
}
