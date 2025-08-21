"use client";

import type React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useFirebaseAuth } from "@/lib/hooks/useFirebaseAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CoreLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("CoreLayout useEffect triggered");
    console.log("Loading state:", loading);
    console.log("User object:", user);

    if (loading) {
      console.log("Still loading, waiting for auth state...");
      return; // Exit early if still loading
    }

    if (!user) {
      console.log("User is not authenticated. Redirecting to /login");
      router.push("/login");
      return; // Exit early after redirection
    }

    console.log("User is authenticated, rendering AppLayout");
  }, [user, loading, router]);

  if (loading) {
    console.log("Rendering loading state...");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log("User is null, returning null (likely redirecting)");
    return null;
  }

  console.log("Rendering AppLayout with children");
  return <AppLayout>{children}</AppLayout>;
}