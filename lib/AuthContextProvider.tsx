"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth"; // Import your useAuth hook

// Define the shape of your AuthContext
interface AuthContextType {
  currentUser: ReturnType<typeof useAuth>['currentUser'];
  loading: ReturnType<typeof useAuth>['loading'];
  error: ReturnType<typeof useAuth>['error'];
  login: ReturnType<typeof useAuth>['login'];
  register: ReturnType<typeof useAuth>['register'];
  logout: ReturnType<typeof useAuth>['logout'];
  // Add other properties you return from useAuth if needed
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  // Use your useAuth hook here
  const authState = useAuth();


  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => authState, [authState]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the AuthContext
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthContextProvider");
  }
  return context;
}