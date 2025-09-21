"use client"

import { useSearchParams, useParams } from "next/navigation"
import { useTopbarSetup } from "@/components/layout/topbar-store"
import WireframeEditorComponent from "@/components/wireframes/wireframe-editor" // Renamed import

export default function WireframeEditorRoute() { // Renamed function
  const sp = useSearchParams()
  const params = useParams<{ id: string }>(); // Use useParams hook
  const id = params?.id ?? ""; // Access id directly

  // Keep tabs consistent; no tabs here, but set a title.
  useTopbarSetup({
    title: "Wireframe Editor",
    tabs: [],
    activeKey: "",
    showShare: false,
  })

  const onBackHref = `/my_tasks?tab=${encodeURIComponent(sp.get("tab") || "wireframes")}`
  return <WireframeEditorComponent wireframeId={id} onBack={() => window.location.href = onBackHref} /> // Corrected props
}