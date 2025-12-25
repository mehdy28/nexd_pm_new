"use client"

import { useParams, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useTopbar, useTopbarSetup } from "@/components/layout/topbar-store"
import { useProjectHeader } from "@/hooks/useProjectHeader" // 1. Import the new hook
import {
  ListChecks,
  SquareKanban,
  FileText,
  Layers3,
  Gauge,
  Wand2,
  LayoutGrid,
  BarChart3,
} from "lucide-react"

// Import a loading component (assuming you have one)
import ProjectLoading from "./loading"

// Dynamic imports with SSR disabled (no changes here)
const BoardView = dynamic(() => import("@/components/tasks/board-view").then(mod => mod.BoardView), { ssr: false })
const ListView = dynamic(() => import("@/components/tasks/list-view").then(mod => mod.ListView), { ssr: false })
const DocumentsView = dynamic(() => import("@/components/documents/documents-view").then(mod => mod.DocumentsView), { ssr: false })
const DashboardView = dynamic(() => import("@/components/tasks/dashboard-view").then(mod => mod.DashboardView), { ssr: false })
const ProjectPromptLabContainer = dynamic(() => import("@/components/prompt-lab/project-prompt-lab-container").then(mod => mod.ProjectPromptLabContainer), { ssr: false })
const WhiteboardsView = dynamic(() => import("@/components/Whiteboards/whiteboards-view").then(mod => mod.WhiteboardsView), { ssr: false })
const ProjectOverview = dynamic(() => import("@/components/project/project-overview").then(mod => mod.ProjectOverview), { ssr: false })
const GanttView = dynamic(() => import("@/components/tasks/gantt-view"), { ssr: false })

// 2. Mock data function is now removed

const TABS = [
  { key: "overview", label: "Overview", icon: <LayoutGrid className="h-4 w-4" /> },
  { key: "list", label: "List", icon: <ListChecks className="h-4 w-4" /> },
  { key: "board", label: "Board", icon: <SquareKanban className="h-4 w-4" /> },
  { key: "gantt", label: "Gantt", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { key: "prompt-lab", label: "Prompt Lab", icon: <Wand2 className="h-4 w-4" /> },
  { key: "whiteboards", label: "Whiteboards", icon: <Layers3 className="h-4 w-4" /> },
  { key: "dashboard", label: "Dashboard", icon: <Gauge className="h-4 w-4" /> },
]

export default function ProjectPage() {
  const params = useParams<{ id: string }>()
  const sp = useSearchParams()
  const initialTab = sp.get("tab") || "overview"
  const projectId = params?.id ?? ""

  // 3. Use the hook to fetch data
  const { project, loading, error } = useProjectHeader(projectId)

  // Set topbar with loading state or actual project name
  useTopbarSetup({
    title: project?.name ?? "",
    tabs: TABS,
    activeKey: initialTab,
    showShare: true,
    showSprint: true,
    showAddSection: true,
  })
  
  const { activeKey } = useTopbar()
  const currentKey = activeKey || initialTab

  // 4. Handle loading and error states
  if (loading) {
    return <ProjectLoading /> // Or any other loading spinner/skeleton component
  }
  


  // Pass projectId to all components for project-scoped data
  if (currentKey === "overview") return <ProjectOverview projectId={projectId} />
  if (currentKey === "list") return <ListView projectId={projectId} />
  if (currentKey === "board") return <BoardView projectId={projectId} />
  if (currentKey === "gantt") return <GanttView projectId={projectId} />
  if (currentKey === "documents") return <DocumentsView projectId={projectId} />
  if (currentKey === "prompt-lab") return <ProjectPromptLabContainer projectId={projectId} />
  if (currentKey === "whiteboards") return <WhiteboardsView projectId={projectId} />
  if (currentKey === "dashboard") return <DashboardView projectId={projectId} />
  
  return <div className="page-scroller p-6 text-sm text-slate-500">This feature is not implemented yet.</div>
}