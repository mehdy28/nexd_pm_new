"use client"

import { useSearchParams } from "next/navigation"
import { useTopbarSetup } from "@/components/layout/topbar-store"
import { WireframeEditorPage } from "@/components/wireframes/wireframe-editor"

export default function WireframeEditorPage({ params }: { params: { id: string } }) {
  const sp = useSearchParams()
  // Keep tabs consistent; no tabs here, but set a title.
  useTopbarSetup({
    title: "Wireframe Editor",
    tabs: [],
    activeKey: "",
    showShare: false,
  })

  const backHref = `/my_tasks?tab=${encodeURIComponent(sp.get("tab") || "wireframes")}`
  return <WireframeEditorPage id={params.id} backHref={backHref} />
}
