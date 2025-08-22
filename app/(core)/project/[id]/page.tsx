"use client"

import { useParams, useSearchParams } from "next/navigation"
import { useProject } from "@/lib/hooks/useProject"
import { useTopbar, useTopbarSetup } from "@/components/layout/topbar-store"
import { BoardView } from "@/components/tasks/board-view"
import { ListView } from "@/components/tasks/list-view"
import { DocumentsView } from "@/components/documents/documents-view"
import { CalendarView } from "@/components/tasks/calendar-view"
import { DashboardView } from "@/components/tasks/dashboard-view"
import { PromptLab } from "@/components/prompt-lab/prompt-lab"
import { WireframesView } from "@/components/wireframes/wireframes-view"
import { ProjectOverview } from "@/components/project/project-overview"
import {
  ListChecks,
  SquareKanban,
  CalendarDays,
  FileText,
  Layers3,
  Gauge,
  Wand2,
  LayoutGrid,
  BarChart3,
} from "lucide-react"
import { GanttView } from "@/components/tasks/gantt-view"

const TABS = [
  { key: "overview", label: "Overview", icon: <LayoutGrid className="h-4 w-4" /> },
  { key: "list", label: "List", icon: <ListChecks className="h-4 w-4" /> },
  { key: "board", label: "Board", icon: <SquareKanban className="h-4 w-4" /> },
  { key: "gantt", label: "Gantt", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { key: "prompt-lab", label: "Prompt Lab", icon: <Wand2 className="h-4 w-4" /> },
  { key: "wireframes", label: "Wireframes", icon: <Layers3 className="h-4 w-4" /> },
  { key: "dashboard", label: "Dashboard", icon: <Gauge className="h-4 w-4" /> },
]

export default function ProjectPage() {
  const params = useParams<{ id: string }>()
  const sp = useSearchParams()
  const initialTab = sp.get("tab") || "overview"
  const projectId = params?.id ?? ""
  
  const { project, loading } = useProject(projectId)

  useTopbarSetup({
    title: project?.name || "Loading...",
    tabs: TABS,
    activeKey: initialTab,
    showShare: true,
    showSprint: true,
    showAddSection: true,
  })
  const { activeKey } = useTopbar()
  const currentKey = activeKey || initialTab

  if (loading) {
    return <div className="p-6">Loading project...</div>
  }

  if (!project) {
    return <div className="p-6">Project not found</div>
  }

  const projectData = {
    name: project.name,
    description: project.description || "",
    status: project.status,
    members: project.members?.length || 0,
    color: project.color,
  }

  // Pass projectId to all components for project-scoped data
  if (currentKey === "overview") return <ProjectOverview projectId={projectId} projectData={projectData} />
  if (currentKey === "list") return <ListView projectId={projectId} />
  if (currentKey === "board") return <BoardView projectId={projectId} />
  if (currentKey === "gantt") return <GanttView projectId={projectId} />
  if (currentKey === "calendar") return <CalendarView projectId={projectId} />
  if (currentKey === "documents") return <DocumentsView projectId={projectId} />
  if (currentKey === "prompt-lab") return <PromptLab projectId={projectId} />
  if (currentKey === "wireframes") return <WireframesView projectId={projectId} />
  if (currentKey === "dashboard") return <DashboardView projectId={projectId} />
  return <div className="page-scroller p-6 text-sm text-slate-500">This tab is not implemented yet.</div>
}
