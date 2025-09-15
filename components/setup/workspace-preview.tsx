"use client"

import {
  Search,
  Share2,
  Lock,
  Plus,
  ListChecks,
  SquareKanban,
  CalendarDays,
  FileText,
  Layers3,
  Gauge,
  Wand2,
  ChevronDown,
} from "lucide-react"

interface WorkspacePreviewProps {
  workspaceTitle: string
  projectTitle: string
  viewType: "list" | "board" | "calendar"
  template: "blank" | "marketing" | "development" | "design"
}

const TABS = [
  { key: "overview", label: "Overview", icon: <Gauge className="h-3 w-3" /> },
  { key: "list", label: "List", icon: <ListChecks className="h-3 w-3" /> },
  { key: "board", label: "Board", icon: <SquareKanban className="h-3 w-3" /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays className="h-3 w-3" /> },
  { key: "documents", label: "Documents", icon: <FileText className="h-3 w-3" /> },
  { key: "prompt-lab", label: "Prompt Lab", icon: <Wand2 className="h-3 w-3" /> },
  { key: "wireframes", label: "Wireframes", icon: <Layers3 className="h-3 w-3" /> },
]

export function WorkspacePreview({ workspaceTitle, projectTitle, viewType, template }: WorkspacePreviewProps) {
  const renderViewContent = () => {
    switch (viewType) {
      case "board": {
        return (
          <div className="p-4">
            <div className="flex gap-4 overflow-x-auto">
              <div className="flex-shrink-0 w-64">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">To Do</h3>
                  <div className="space-y-2">
                    <div className="bg-white p-2 rounded border text-xs">
                      <div className="font-medium">Create a new feed page</div>
                      <div className="text-gray-500 mt-1">Due: 05/31/2025</div>
                    </div>
                    <div className="bg-white p-2 rounded border text-xs">
                      <div className="font-medium">Create a new card design</div>
                      <div className="text-gray-500 mt-1">Due: 05/19/2025</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 w-64">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">In Progress</h3>
                  <div className="space-y-2">
                    <div className="bg-white p-2 rounded border text-xs">
                      <div className="font-medium">Setup project structure</div>
                      <div className="text-gray-500 mt-1">Due: 05/25/2025</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 w-64">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">Done</h3>
                  <div className="space-y-2">
                    <div className="bg-white p-2 rounded border text-xs opacity-75">
                      <div className="font-medium">Initial planning</div>
                      <div className="text-gray-500 mt-1">Completed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      case "calendar": {
        return (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-xs font-semibold text-gray-600 text-center p-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 6 + 1
                const isCurrentMonth = day > 0 && day <= 31
                const hasTask = day === 19 || day === 31
                return (
                  <div key={i} className="aspect-square border border-gray-200 p-1 text-xs">
                    {isCurrentMonth && (
                      <>
                        <div
                          className={`${day === 15 ? "bg-primary text-white" : "text-gray-700"} w-5 h-5 rounded text-center leading-5`}
                        >
                          {day}
                        </div>
                        {hasTask && (
                          <div className="bg-primary/10 text-primary text-[10px] px-1 rounded mt-1 truncate">
                            Task due
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      default: {
        // list view
        return (
          <div className="p-4">
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 text-xs font-medium text-gray-600 border-b border-gray-200 pb-2">
                <div className="col-span-1 flex items-center">
                  <input type="checkbox" className="w-3 h-3 rounded border-gray-300" />
                </div>
                <div className="col-span-5">Task Name</div>
                <div className="col-span-3 text-center">Assignee</div>
                <div className="col-span-3 text-center">Due</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                  <ChevronDown className="h-3 w-3" />
                  Backlog
                </div>

                <div className="grid grid-cols-12 gap-3 items-center py-2 hover:bg-gray-50 rounded">
                  <div className="col-span-1">
                    <input type="checkbox" className="w-3 h-3 rounded border-gray-300" />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <div className="w-2 h-2 rounded-full border border-gray-300" />
                  </div>
                  <div className="col-span-4 text-xs font-medium text-gray-900">Create a new feed page</div>
                  <div className="col-span-3 flex items-center justify-center">
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-medium">
                        FF
                      </div>
                      <span>Farah Farouk</span>
                    </div>
                  </div>
                  <div className="col-span-3 text-center text-xs text-gray-600">05/31/2025</div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-center py-2 hover:bg-gray-50 rounded">
                  <div className="col-span-1">
                    <input type="checkbox" className="w-3 h-3 rounded border-gray-300" />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <div className="w-2 h-2 rounded-full border border-gray-300" />
                  </div>
                  <div className="col-span-4 text-xs font-medium text-gray-900">Create a new card design</div>
                  <div className="col-span-3 flex items-center justify-center">
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-medium">
                        FF
                      </div>
                      <span>Farah Farouk</span>
                    </div>
                  </div>
                  <div className="col-span-3 text-center text-xs text-gray-600">05/19/2025</div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    }
  }

  return (
    <div className="w-[700px] h-[400px] mx-auto rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
      <div className="flex h-full">
        <div className="w-12 bg-sidebar flex flex-col items-center py-3 gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <img src="/logo.png" alt="NEXD.PM" className="h-4 w-4" />
          </div>
          <div className="h-5 w-5 rounded bg-sidebar-accent" />
          <div className="h-5 w-5 rounded bg-sidebar-accent" />
          <div className="h-5 w-5 rounded bg-sidebar-accent" />
          <div className="h-5 w-5 rounded bg-sidebar-accent" />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-2">
              <h1 className="text-sm font-semibold text-gray-900 truncate">{projectTitle || "Website Migration"}</h1>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                  <Lock className="h-3 w-3" />
                  <Share2 className="h-3 w-3" />
                </div>
                <div className="w-32 h-6 bg-gray-100 rounded flex items-center px-2">
                  <Search className="h-3 w-3 text-gray-400" />
                  <span className="ml-1 text-xs text-gray-400">Search...</span>
                </div>
              </div>
            </div>

            <div className="px-4 py-2">
              <div className="flex items-center gap-4 -mb-px">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`flex items-center gap-1 text-xs font-medium pb-2 border-b-2 transition-colors ${
                      viewType === tab.key
                        ? "text-gray-900 border-primary"
                        : "text-gray-600 border-transparent hover:text-gray-900"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-b border-gray-200 bg-white px-4 py-2 flex items-center gap-2">
            <button className="bg-primary text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Add section
            </button>
            <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs">
              <span>Sprint 1</span>
              <ChevronDown className="h-3 w-3 text-gray-500" />
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0 bg-white">{renderViewContent()}</div>
        </div>
      </div>
    </div>
  )
}


