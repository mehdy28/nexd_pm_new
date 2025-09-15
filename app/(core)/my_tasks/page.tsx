"use client"

import { useSearchParams } from "next/navigation"
import { useTopbar, useTopbarSetup } from "@/components/layout/topbar-store"
import { BoardView } from "@/components/tasks/board-view"
import { ListView } from "@/components/tasks/list-view"
import { DocumentsView } from "@/components/documents/documents-view"
import { CalendarView } from "@/components/tasks/calendar-view"
import { DashboardView } from "@/components/tasks/dashboard-view"
import { PromptLab } from "@/components/prompt-lab/prompt-lab"
import { WireframesView } from "@/components/wireframes/wireframes-view"
import GanttView  from "@/components/tasks/gantt-view"
import { ListChecks, SquareKanban, CalendarDays, FileText, Layers3, Gauge, Wand2, BarChart3 } from "lucide-react"

const TABS = [
  { key: "list", label: "List", icon: <ListChecks className="h-4 w-4" /> },
  { key: "board", label: "Board", icon: <SquareKanban className="h-4 w-4" /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "gantt", label: "Gantt", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { key: "prompt-lab", label: "Prompt Lab", icon: <Wand2 className="h-4 w-4" /> },
  { key: "wireframes", label: "Wireframes", icon: <Layers3 className="h-4 w-4" /> },
  { key: "dashboard", label: "Dashboard", icon: <Gauge className="h-4 w-4" /> },
]

export default function MyTasksPage() {
  const sp = useSearchParams()
  const initialTab = sp.get("tab") || "board"

  useTopbarSetup({
    title: "My Tasks",
    tabs: TABS,
    activeKey: initialTab,
    showShare: true,
    showSprint: true,
    showAddSection: true,
  })
  const { activeKey } = useTopbar()
  const currentKey = activeKey || initialTab

  const renderContent = () => {
    if (currentKey === "list") return <ListView />
    if (currentKey === "board") return <BoardView />
    if (currentKey === "calendar") return <CalendarView />
    if (currentKey === "gantt") return <GanttView />
    if (currentKey === "documents") return <DocumentsView />
    if (currentKey === "prompt-lab") return <PromptLab />
    if (currentKey === "wireframes") return <WireframesView />
    if (currentKey === "dashboard") return <DashboardView />
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="text-muted-foreground text-lg">Coming Soon</div>
          <p className="text-sm text-muted-foreground">This view is not implemented yet.</p>
        </div>
      </div>
    )
  }

  return <div className="h-full bg-muted/30">{renderContent()}</div>
}
