"use client";
import dynamic from "next/dynamic";

export const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => {
    console.log("LOG: Dynamic import is in loading state...");
  },
});
