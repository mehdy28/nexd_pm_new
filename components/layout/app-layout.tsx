"use client";

import type { ReactNode } from "react";
import { LoadingOverlay } from "@/components/layout/loading-overlay";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TopbarProvider } from "@/components/layout/topbar-store";
import { useAuthContext } from "@/lib/AuthContextProvider";

import "@/styles/identity.css";
import "@/styles/theme.css";

export function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuthContext();


  // While auth is resolving
  if (loading) {
    return <LoadingOverlay />;
  }
  
  // If the user is explicitly null and not loading, we should ideally not render core content
  // if the router middleware hasn't redirected yet. 
  // Since the old logic was commented out, we must handle the null state defensively here, 
  // although router.push should be immediate.
  if (!currentUser) {
      return <LoadingOverlay />; 
  }


  return (
    <TopbarProvider>
      <Sidebar />
      <Topbar />

      <div className="fixed left-20 right-0 top-20 bottom-0 bg-background overflow-hidden">
        <div className="h-full w-full overflow-auto bg-muted/30">
          {children}
        </div>
      </div>

    </TopbarProvider>
  );
}
