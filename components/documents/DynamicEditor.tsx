"use client";

import dynamic from "next/dynamic";

// Dynamically import Editor with SSR disabled
export const NotionEditor = dynamic(() => import("./Editor"), {
  ssr: false,
});
