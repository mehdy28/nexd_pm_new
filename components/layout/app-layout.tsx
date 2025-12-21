// components/layout/app-layout.tsx
"use client";

import type { ReactNode } from "react";
import { LoadingOverlay } from "./loading-overlay";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TopbarProvider } from "./topbar-store";
import { useAuthContext } from "@/lib/AuthContextProvider";

import "@/styles/identity.css";
import "@/styles/theme.css";

export function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuthContext();

  // // We only show the UI if we have a user. 
  // // If the user shouldn't be here, the Middleware will trigger 
  // // a redirect before this component even mounts or finishes loading.
  // if (loading || !currentUser) {
  //   return <LoadingOverlay />;
  // }

  return (
    <TopbarProvider>
      <Sidebar />
      <Topbar />
      <div className="fixed left-20 right-0 top-20 bottom-0 bg-background overflow-hidden">
        <div className="h-full w-full overflow-auto bg-muted/30">{children}</div>
      </div>
      <LoadingOverlay />
    </TopbarProvider>
  );
}