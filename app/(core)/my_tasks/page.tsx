//app/(core)/my_tasks/page.tsx
"use client"

import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useTopbar, useTopbarSetup } from "@/components/layout/topbar-store"
import { ListChecks, SquareKanban, CalendarDays, FileText, Layers3, Gauge, Wand2, BarChart3 } from "lucide-react"

const PersonalListView = dynamic(() => import("@/components/personal/personal-list-view").then(mod => mod.PersonalListView), { ssr: false })
const PersonalBoardView = dynamic(() => import("@/components/personal/personal-board-view").then(mod => mod.PersonalBoardView), { ssr: false })
const PersonalDocumentsView = dynamic(() => import("@/components/personal/personal-documents-view").then(mod => mod.PersonalDocumentsView), { ssr: false })
const PersonalPromptLabContainer = dynamic(() => import("@/components/personal/personal-prompt-lab-container").then(mod => mod.PersonalPromptLabContainer), { ssr: false })
const PersonalWhiteboardsView = dynamic(() => import("@/components/personal/PersonalwhiteboardsView").then(mod => mod.PersonalWhiteboardsView), { ssr: false })
const PersonalGanttView = dynamic(() => import("@/components/personal/personal-gantt-view"), { ssr: false })
const MyDashboardView = dynamic(() => import("@/components/personal/MyDashboardView").then(mod => mod.MyDashboardView), { ssr: false })


const TABS = [
  { key: "list", label: "List", icon: <ListChecks className="h-4 w-4" /> },
  { key: "board", label: "Board", icon: <SquareKanban className="h-4 w-4" /> },
  //{ key: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "gantt", label: "Gantt", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { key: "prompt-lab", label: "Prompt Lab", icon: <Wand2 className="h-4 w-4" /> },
  { key: "whiteboards", label: "whiteboards", icon: <Layers3 className="h-4 w-4" /> },
  { key: "dashboard", label: "Dashboard", icon: <Gauge className="h-4 w-4" /> },
]

export default function MyTasksPage() {
  const sp = useSearchParams()
  const initialTab = sp.get("tab") || "list"

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
    if (currentKey === "list") return <PersonalListView />
    if (currentKey === "board") return <PersonalBoardView />
    //if (currentKey === "calendar") return <CalendarView />
    if (currentKey === "gantt") return <PersonalGanttView />
    if (currentKey === "documents") return <PersonalDocumentsView />
    if (currentKey === "prompt-lab") return <PersonalPromptLabContainer />
    if (currentKey === "whiteboards") return <PersonalWhiteboardsView />
    if (currentKey === "dashboard") return <MyDashboardView />
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