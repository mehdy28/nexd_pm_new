"use client"

import type React from "react"

import { useState, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Calendar, Users, Building2, Plus } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

const mockTasks = [
  {
    id: "1",
    title: "User Research & Analysis",
    assignee: { name: "Sarah Chen", avatar: "/placeholder.svg?height=32&width=32" },
    status: "completed",
    startDate: "2024-01-15",
    endDate: "2024-01-28",
    progress: 100,
    dependencies: [],
    projectId: "proj-1",
    projectName: "E-commerce Platform",
  },
  {
    id: "2",
    title: "Wireframe Creation",
    assignee: { name: "John Doe", avatar: "/placeholder.svg?height=32&width=32" },
    status: "completed",
    startDate: "2024-01-29",
    endDate: "2024-02-11",
    progress: 100,
    dependencies: ["1"],
    projectId: "proj-1",
    projectName: "E-commerce Platform",
  },
  {
    id: "3",
    title: "UI Design System",
    assignee: { name: "Sarah Chen", avatar: "/placeholder.svg?height=32&width=32" },
    status: "in-progress",
    startDate: "2024-02-05",
    endDate: "2024-02-25",
    progress: 65,
    dependencies: ["1"],
    projectId: "proj-1",
    projectName: "E-commerce Platform",
  },
  {
    id: "4",
    title: "Frontend Development",
    assignee: { name: "Mike Johnson", avatar: "/placeholder.svg?height=32&width=32" },
    status: "in-progress",
    startDate: "2024-02-12",
    endDate: "2024-03-15",
    progress: 30,
    dependencies: ["2"],
    projectId: "proj-1",
    projectName: "E-commerce Platform",
  },
  {
    id: "5",
    title: "Backend API Development",
    assignee: { name: "Alex Rodriguez", avatar: "/placeholder.svg?height=32&width=32" },
    status: "in-progress",
    startDate: "2024-02-19",
    endDate: "2024-03-20",
    progress: 20,
    dependencies: ["2"],
    projectId: "proj-2",
    projectName: "Mobile App",
  },
  {
    id: "6",
    title: "Testing & QA",
    assignee: { name: "Emily Davis", avatar: "/placeholder.svg?height=32&width=32" },
    status: "pending",
    startDate: "2024-03-16",
    endDate: "2024-03-30",
    progress: 0,
    dependencies: ["4", "5"],
    projectId: "proj-2",
    projectName: "Mobile App",
  },
  {
    id: "7",
    title: "Personal Learning - React Native",
    assignee: { name: "You", avatar: "/placeholder.svg?height=32&width=32" },
    status: "in-progress",
    startDate: "2024-02-01",
    endDate: "2024-03-01",
    progress: 45,
    dependencies: [],
    projectId: null,
    projectName: null,
  },
  {
    id: "8",
    title: "Update Portfolio Website",
    assignee: { name: "You", avatar: "/placeholder.svg?height=32&width=32" },
    status: "pending",
    startDate: "2024-03-05",
    endDate: "2024-03-15",
    progress: 0,
    dependencies: [],
    projectId: null,
    projectName: null,
  },
]

interface GanttViewProps {
  projectId?: string
}

export function GanttView({ projectId }: GanttViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 1, 1)) // February 2024
  const [tasks, setTasks] = useState(mockTasks)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [taskDependencies, setTaskDependencies] = useState<Record<string, string[]>>({
    "2": ["1"],
    "3": ["1"],
    "4": ["2"],
    "5": ["2"],
    "6": ["4", "5"],
  })
  const [isResizing, setIsResizing] = useState<{ taskId: string; handle: "start" | "end" } | null>(null)
  const ganttRef = useRef<HTMLDivElement>(null)

  const filteredTasks = useMemo(() => {
    if (projectId) {
      return tasks.filter((task) => task.projectId === projectId)
    }
    return tasks // Show all tasks for personal "My Tasks" view
  }, [projectId])

  // Generate date range for the timeline
  const dateRange = useMemo(() => {
    const dates = []
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0)

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d))
    }
    return dates
  }, [currentDate])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "in-progress":
        return "bg-blue-500"
      case "pending":
        return "bg-gray-300"
      default:
        return "bg-gray-300"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getProjectColor = (projectId: string | null) => {
    if (!projectId) return "bg-purple-100 text-purple-800" // Personal tasks
    const colors = [
      "bg-emerald-100 text-emerald-800",
      "bg-orange-100 text-orange-800",
      "bg-cyan-100 text-cyan-800",
      "bg-pink-100 text-pink-800",
    ]
    const hash = projectId.split("").reduce((a, b) => a + b.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const calculatePosition = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const timelineStart = dateRange[0]
    const timelineEnd = dateRange[dateRange.length - 1]

    const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
    const startOffset = Math.ceil((start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    const leftPercent = (startOffset / totalDays) * 100
    const widthPercent = (duration / totalDays) * 100

    return { left: `${Math.max(0, leftPercent)}%`, width: `${Math.min(100 - leftPercent, widthPercent)}%` }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const addTask = (taskData: Partial<(typeof mockTasks)[0]>) => {
    const newTask = {
      id: `task-${Date.now()}`,
      title: taskData.title || "New Task",
      assignee: { name: "You", avatar: "/placeholder.svg?height=32&width=32" },
      status: "pending" as const,
      startDate: taskData.startDate || new Date().toISOString().split("T")[0],
      endDate: taskData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      progress: 0,
      dependencies: [],
      projectId: projectId || null,
      projectName: projectId ? "Current Project" : null,
    }
    setTasks((prev) => [...prev, newTask])
  }

  const updateTask = (taskId: string, updates: Partial<(typeof mockTasks)[0]>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)))
  }

  const handleTaskMouseDown = useCallback(
    (taskId: string, e: React.MouseEvent, handle?: "start" | "end") => {
      e.preventDefault()
      e.stopPropagation()

      if (e.detail === 2) {
        setSelectedTask(taskId)
        return
      }

      if (handle) {
        setIsResizing({ taskId, handle })
      } else {
        setDraggedTask(taskId)
      }

      const ganttContainer = ganttRef.current
      if (!ganttContainer) return

      const containerRect = ganttContainer.getBoundingClientRect()
      const totalDays = dateRange.length
      const dayWidth = containerRect.width / totalDays

      const handleMouseMove = (e: MouseEvent) => {
        const mouseX = e.clientX - containerRect.left
        const dayOffset = Math.round(mouseX / dayWidth)
        const newDate = new Date(dateRange[0])
        newDate.setDate(newDate.getDate() + dayOffset)
        const newDateString = newDate.toISOString().split("T")[0]

        if (handle === "start") {
          updateTask(taskId, { startDate: newDateString })
        } else if (handle === "end") {
          updateTask(taskId, { endDate: newDateString })
        } else {
          // Moving entire task - update dependent tasks too
          const task = tasks.find((t) => t.id === taskId)
          if (task) {
            const originalStart = new Date(task.startDate)
            const originalEnd = new Date(task.endDate)
            const duration = originalEnd.getTime() - originalStart.getTime()
            const newEndDate = new Date(newDate.getTime() + duration)

            updateTask(taskId, {
              startDate: newDateString,
              endDate: newEndDate.toISOString().split("T")[0],
            })

            // Move dependent tasks
            const dependentTasks = tasks.filter((t) => taskDependencies[t.id]?.includes(taskId))
            dependentTasks.forEach((depTask) => {
              const depStart = new Date(depTask.startDate)
              const depEnd = new Date(depTask.endDate)
              const depDuration = depEnd.getTime() - depStart.getTime()
              const newDepStart = new Date(newEndDate.getTime() + 24 * 60 * 60 * 1000) // Start day after
              const newDepEnd = new Date(newDepStart.getTime() + depDuration)

              updateTask(depTask.id, {
                startDate: newDepStart.toISOString().split("T")[0],
                endDate: newDepEnd.toISOString().split("T")[0],
              })
            })
          }
        }
      }

      const handleMouseUp = () => {
        setDraggedTask(null)
        setIsResizing(null)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [tasks, taskDependencies, dateRange],
  )

  const addDependency = (fromTaskId: string, toTaskId: string) => {
    setTaskDependencies((prev) => ({
      ...prev,
      [toTaskId]: [...(prev[toTaskId] || []), fromTaskId],
    }))
  }

  const removeDependency = (fromTaskId: string, toTaskId: string) => {
    setTaskDependencies((prev) => ({
      ...prev,
      [toTaskId]: (prev[toTaskId] || []).filter((id) => id !== fromTaskId),
    }))
  }

  const selectedTaskData = tasks.find((t) => t.id === selectedTask)

  return (
    <div className="page-scroller p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Gantt Chart</h2>
          <p className="text-slate-600">
            {projectId ? "Project timeline and task dependencies" : "All tasks timeline with project associations"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-primary text-white hover:bg-primary/90" onClick={() => setCreateTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3">
            {formatMonthYear(currentDate)} -{" "}
            {formatMonthYear(new Date(currentDate.getFullYear(), currentDate.getMonth() + 2))}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {projectId ? "Project Timeline" : "My Tasks Timeline"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Timeline Header */}
              <div className="flex border-b bg-slate-50">
                <div className="w-80 p-4 border-r bg-white">
                  <span className="font-medium text-sm">Task</span>
                </div>
                <div className="flex-1 relative">
                  <div className="flex h-12 items-center">
                    {dateRange
                      .filter((_, index) => index % 7 === 0)
                      .map((date, index) => (
                        <div key={index} className="flex-1 px-2 text-center border-r">
                          <div className="text-xs font-medium">
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Task Rows */}
              {filteredTasks.map((task) => {
                const position = calculatePosition(task.startDate, task.endDate)
                const isDragging = draggedTask === task.id
                const isBeingResized = isResizing?.taskId === task.id

                return (
                  <div key={task.id} className="flex border-b hover:bg-slate-50 relative">
                    {/* Task Info */}
                    <div className="w-80 p-4 border-r bg-white">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <Badge variant="secondary" className={getStatusBadgeColor(task.status)}>
                            {task.status.replace("-", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.assignee.avatar || "/placeholder.svg"} alt={task.assignee.name} />
                              <AvatarFallback className="text-xs">
                                {task.assignee.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-slate-600">{task.assignee.name}</span>
                          </div>
                          {/* Project indicator */}
                          <div className="flex items-center gap-1">
                            {task.projectId ? (
                              <>
                                <Building2 className="h-3 w-3 text-slate-400" />
                                <Badge variant="outline" className={`text-xs ${getProjectColor(task.projectId)}`}>
                                  {task.projectName}
                                </Badge>
                              </>
                            ) : (
                              <Badge variant="outline" className={`text-xs ${getProjectColor(null)}`}>
                                Personal
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative h-16 flex items-center" ref={ganttRef}>
                      {taskDependencies[task.id]?.map((depId) => {
                        const depTask = tasks.find((t) => t.id === depId)
                        if (!depTask) return null

                        const depPosition = calculatePosition(depTask.startDate, depTask.endDate)
                        return (
                          <svg
                            key={`${depId}-${task.id}`}
                            className="absolute inset-0 pointer-events-none"
                            style={{ zIndex: 1 }}
                          >
                            <line
                              x1="0"
                              y1="32"
                              x2="100%"
                              y2="32"
                              stroke="#3b82f6"
                              strokeWidth="2"
                              strokeDasharray="4,4"
                              opacity="0.6"
                            />
                            <polygon points="0,28 8,32 0,36" fill="#3b82f6" opacity="0.6" />
                          </svg>
                        )
                      })}

                      <div className="absolute inset-0 flex items-center">
                        <div
                          className={`h-8 rounded-lg ${getStatusColor(task.status)} relative cursor-move hover:shadow-lg transition-all duration-200 group border-2 border-white ${
                            isDragging ? "shadow-xl scale-105 z-10" : ""
                          } ${isBeingResized ? "ring-2 ring-blue-400" : ""}`}
                          style={position}
                          onMouseDown={(e) => handleTaskMouseDown(task.id, e)}
                          onDoubleClick={() => setSelectedTask(task.id)}
                        >
                          {/* Progress indicator */}
                          <div
                            className="h-full bg-white bg-opacity-30 rounded-lg transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />

                          <div
                            className="absolute left-0 top-0 w-3 h-full cursor-w-resize opacity-0 group-hover:opacity-100 bg-blue-500/80 rounded-l-lg transition-opacity duration-200 flex items-center justify-center"
                            onMouseDown={(e) => handleTaskMouseDown(task.id, e, "start")}
                          >
                            <div className="w-1 h-4 bg-white rounded-full"></div>
                          </div>
                          <div
                            className="absolute right-0 top-0 w-3 h-full cursor-e-resize opacity-0 group-hover:opacity-100 bg-blue-500/80 rounded-r-lg transition-opacity duration-200 flex items-center justify-center"
                            onMouseDown={(e) => handleTaskMouseDown(task.id, e, "end")}
                          >
                            <div className="w-1 h-4 bg-white rounded-full"></div>
                          </div>

                          {/* Task duration text */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-white font-medium drop-shadow-sm">{task.progress}%</span>
                          </div>

                          <div className="absolute -left-1 top-1/2 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transform -translate-y-1/2 cursor-crosshair"></div>
                          <div className="absolute -right-1 top-1/2 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transform -translate-y-1/2 cursor-crosshair"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span className="text-sm">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              <span className="text-sm">Assignee</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-600" />
              <span className="text-sm">Project Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
              <span className="text-sm">Personal Tasks</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white">
          <SheetHeader>
            <SheetTitle className="text-foreground">Create New Task</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              Add a new task to the Gantt chart timeline.
            </SheetDescription>
          </SheetHeader>
          <TaskForm
            onSubmit={(data) => {
              addTask(data)
              setCreateTaskOpen(false)
            }}
            onCancel={() => setCreateTaskOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white border-l">
          <SheetHeader>
            <SheetTitle className="text-foreground">Edit Task</SheetTitle>
            <SheetDescription className="text-muted-foreground">Update task details and timeline.</SheetDescription>
          </SheetHeader>
          {selectedTaskData && (
            <TaskForm
              initialData={selectedTaskData}
              onSubmit={(data) => {
                updateTask(selectedTask!, data)
                setSelectedTask(null)
              }}
              onCancel={() => setSelectedTask(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function TaskForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [startDate, setStartDate] = useState(initialData?.startDate || new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(
    initialData?.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [status, setStatus] = useState(initialData?.status || "pending")
  const [progress, setProgress] = useState(initialData?.progress || 0)

  const handleSubmit = () => {
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      startDate,
      endDate,
      status,
      progress,
    })
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Task Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          className="bg-white border-border focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border-border focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border-border focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-white border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-border">
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Progress (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="bg-white border-border focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="pt-4 flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1 bg-primary text-white hover:bg-primary/90">
          {initialData ? "Update" : "Create"} Task
        </Button>
      </div>
    </div>
  )
}
