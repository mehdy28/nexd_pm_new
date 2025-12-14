"use client"

import { useSearchParams, useParams } from "next/navigation"
import { useTopbarSetup } from "@/components/layout/topbar-store"
import WhiteboardEditorComponent from "@/components/Whiteboards/Whiteboard-editor" // Renamed import

export default function WhiteboardEditorRoute() { // Renamed function
  const sp = useSearchParams()
  const params = useParams<{ id: string }>(); // Use useParams hook
  const id = params?.id ?? ""; // Access id directly

  // Keep tabs consistent; no tabs here, but set a title.
  useTopbarSetup({
    title: "Whiteboard Editor",
    tabs: [],
    activeKey: "",
    showShare: false,
  })

  const onBackHref = `/my_tasks?tab=${encodeURIComponent(sp.get("tab") || "Whiteboards")}`
  return <WhiteboardEditorComponent WhiteboardId={id} onBack={() => window.location.href = onBackHref} /> // Corrected props
}