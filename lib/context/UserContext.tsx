"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuth, MeData } from "../hooks/useAuth";

interface UserContextProps {
  user: MeData | null;
  loading: boolean;
}

const UserContext = createContext<UserContextProps>({ user: null, loading: true });

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  return <UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
