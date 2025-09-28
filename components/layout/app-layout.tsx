// "use client"

// import type { ReactNode } from "react"
// import "@/styles/identity.css"
// import "@/styles/theme.css"
// import { Sidebar } from "./sidebar"
// import { Topbar } from "./topbar"
// import { TopbarProvider } from "./topbar-store"
// import { LoadingOverlay } from "./loading-overlay"

// export function AppLayout({ children }: { children: ReactNode }) {
//   return (
//     <TopbarProvider>
//       <Sidebar />
//       <Topbar />
//       <div className="fixed left-20 right-0 top-20 bottom-0 bg-background overflow-hidden">
//         <div className="h-full w-full overflow-auto bg-muted/30">{children}</div>
//       </div>
//       <LoadingOverlay />
//     </TopbarProvider>
//   )
// }



// components/layout/app-layout.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingOverlay } from "./loading-overlay"; // Your existing loading overlay
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TopbarProvider } from "./topbar-store";
import { useAuthContext } from "@/lib/AuthContextProvider";

import "@/styles/identity.css";
import "@/styles/theme.css";


export function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run checks once loading is false
    if (!loading) {
      if (!currentUser) {
        // User is not authenticated, redirect to login
        console.log("[AppLayout] No current user, redirecting to /login");
        router.push("/login");
      } else if (currentUser.role === "ADMIN") {
        // If an ADMIN user somehow lands on a core layout, redirect them to admin area
        console.log("[AppLayout] Admin user detected in core layout, redirecting to /admin-dashboard");
        router.push("/admin-dashboard"); // Assuming '/admin-dashboard' is your admin entry point
      } else if (!currentUser.hasWorkspace && pathname !== "/setup") {
        // User is authenticated but has no workspace, redirect to /setup
        // (Ensures they can access /setup if they're there without infinite loops)
        console.log("[AppLayout] User has no workspace, redirecting to /setup");
        router.push("/setup");
      }
    }
  }, [currentUser, loading, router, pathname]);

  // Show a loading overlay while authentication is being checked
  // or if the user is not yet loaded / not authorized for this route group
  if (loading || !currentUser || (currentUser.role === "ADMIN") || (pathname !== "/setup" && !currentUser.hasWorkspace)) {
    // Note: The `currentUser.role === "ADMIN"` check here ensures an admin user
    // will see the loading overlay briefly before being redirected.
    // The `(pathname !== "/setup" && !currentUser.hasWorkspace)` part covers users
    // who need to go to setup but are not on it yet.
    return <LoadingOverlay />;
  }

  // Render the core layout and its children if authenticated, not admin, and has a workspace (or is on setup page)
  return (
    <TopbarProvider>
      <Sidebar />
      <Topbar />
      <div className="fixed left-20 right-0 top-20 bottom-0 bg-background overflow-hidden">
        <div className="h-full w-full overflow-auto bg-muted/30">{children}</div>
      </div>
      <LoadingOverlay /> {/* You might keep this for route-specific loadings,
                             but the initial auth loading is handled above. */}
    </TopbarProvider>
  );
}