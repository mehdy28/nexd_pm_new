"use client"

import { useTopbarSetup } from "@/components/layout/topbar-store"
import { DueSoon } from "@/components/home/due-soon"
import { ProjectsList } from "@/components/home/projects-list"

export default function HomePage() {
  useTopbarSetup({
    title: "Home",
    tabs: [],
    activeKey: "",
    showShare: false,
    showSprint: false,
    showAddSection: false,
  })

  return (
    <div className="page-scroller p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <DueSoon />
        <ProjectsList />
      </div>
    </div>
  )
}
