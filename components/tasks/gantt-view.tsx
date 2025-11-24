"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { Gantt, Task as GanttTaskReact, ViewMode } from "gantt-task-react"
import "gantt-task-react/dist/index.css"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

import { useGanttData, CustomGanttTask, SprintGanttFilterOption } from "@/hooks/useGanttData"
import { useProjectGanttMutations } from "@/hooks/useProjectGanttMutations"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"

interface GanttViewProps {
  projectId: string
}

const GanttView: React.FC<GanttViewProps> = ({ projectId }) => {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
  const [optimisticGanttTasks, setOptimisticGanttTasks] = useState<CustomGanttTask[]>([])
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(undefined)

  const {
    ganttTasks,
    sprintFilterOptions,
    loading: ganttDataLoading,
    error: ganttDataError,
    refetchGanttData,
    defaultSelectedSprintId,
  } = useGanttData(projectId, selectedSprintId)

  const { createGanttTask, updateGanttTask, deleteTask, isMutating, mutationError } = useProjectGanttMutations(
    projectId,
    selectedSprintId
  )

  useEffect(() => {
    if (selectedSprintId === undefined && defaultSelectedSprintId) {
      setSelectedSprintId(defaultSelectedSprintId)
    }
  }, [defaultSelectedSprintId, selectedSprintId])

  useEffect(() => {
    if (ganttTasks && !isMutating) {
      // Directly set the tasks; the Gantt library will calculate parent dates.
      setOptimisticGanttTasks(ganttTasks)
    }
  }, [ganttTasks, isMutating])

  const dynamicColumnWidth = useMemo(() => {
    switch (viewMode) {
      case ViewMode.Day:
        return 150
      case ViewMode.Week:
        return 250
      case ViewMode.Month:
        return 300
      case ViewMode.Year:
        return 500
      default:
        return 150
    }
  }, [viewMode])

  const handleTaskChange = useCallback(
    async (task: GanttTaskReact) => {
      const originalItem = optimisticGanttTasks.find(t => t.id === task.id)
      if (!originalItem || originalItem.originalType !== "TASK") return

      const input: any = {
        id: originalItem.originalTaskId,
        type: originalItem.originalType,
        displayOrder: originalItem.displayOrder,
      }
      let hasChanges = false
      if (originalItem.start.getTime() !== task.start.getTime()) {
        input.startDate = task.start.toISOString()
        hasChanges = true
      }
      if (originalItem.end.getTime() !== task.end.getTime()) {
        input.endDate = task.end.toISOString()
        hasChanges = true
      }
      if (task.name !== originalItem.name) {
        input.name = task.name
        hasChanges = true
      }

      if (hasChanges) {
        // Optimistic UI update: Only update the child task.
        // The Gantt library will automatically recalculate the parent project's dates.
        setOptimisticGanttTasks(prev =>
          prev.map(t =>
            t.id === task.id
              ? {
                  ...t,
                  start: task.start,
                  end: task.end,
                  name: task.name,
                }
              : t
          )
        )

        try {
          await updateGanttTask(input)
        } catch (err) {
          // Revert on error
          setOptimisticGanttTasks(prev =>
            prev.map(t => (t.id === task.id ? (originalItem as CustomGanttTask) : t))
          )
          // Force refetch to ensure data consistency after a failure
          refetchGanttData()
        }
      }
    },
    [optimisticGanttTasks, updateGanttTask, refetchGanttData]
  )

  const handleTaskDelete = useCallback(
    async (task: GanttTaskReact) => {
      const conf = window.confirm("Are you sure you want to delete " + task.name + " ?")
      if (conf) {
        const originalItem = optimisticGanttTasks.find(t => t.id === task.id)
        if (!originalItem || originalItem.originalType !== "TASK") {
          alert("Only tasks can be deleted from the Gantt chart.")
          return false
        }

        // Optimistic delete. The Gantt library will automatically adjust the parent.
        setOptimisticGanttTasks(prev => prev.filter(t => t.id !== task.id))

        try {
          await deleteTask(originalItem.originalTaskId)
        } catch (err) {
          // Revert state by refetching on failure
          refetchGanttData()
        }
        return true
      }
      return false
    },
    [optimisticGanttTasks, deleteTask, refetchGanttData]
  )

  const handleProgressChange = useCallback(
    async (task: GanttTaskReact) => {
      const originalItem = optimisticGanttTasks.find(t => t.id === task.id)
      if (!originalItem || originalItem.originalType !== "TASK") return

      const roundedNewProgress = Math.round(task.progress || 0)
      if (originalItem.progress !== roundedNewProgress) {
        setOptimisticGanttTasks(prev =>
          prev.map(t => (t.id === task.id ? { ...t, progress: roundedNewProgress } : t))
        )

        try {
          await updateGanttTask({
            id: originalItem.originalTaskId,
            type: "TASK",
            progress: roundedNewProgress,
            displayOrder: originalItem.displayOrder,
          })
        } catch (err) {
          setOptimisticGanttTasks(prev =>
            prev.map(t => (t.id === task.id ? (originalItem as CustomGanttTask) : t))
          )
        }
      }
    },
    [optimisticGanttTasks, updateGanttTask]
  )

  const handleAddTask = useCallback(
    async (newTaskData: any) => {
      try {
        await createGanttTask(newTaskData)
        setIsCreateTaskOpen(false)
      } catch (err) {
        console.error("Error creating Gantt item:", err)
      }
    },
    [createGanttTask]
  )

  const handleExpanderClick = (task: GanttTaskReact) => {
    setOptimisticGanttTasks(prevTasks =>
      prevTasks.map(t => (t.id === task.id ? { ...t, hideChildren: !t.hideChildren } : t))
    )
  }

  const handleSprintSelectionChange = useCallback((sprintId: string) => {
    setSelectedSprintId(sprintId)
  }, [])

  const currentSprintName = useMemo(() => {
    if (sprintFilterOptions.length === 0) return "No Sprints"
    const activeSprintId = selectedSprintId || defaultSelectedSprintId
    const foundSprint = sprintFilterOptions.find(s => s.id === activeSprintId)
    return foundSprint?.name || "Select Sprint"
  }, [selectedSprintId, sprintFilterOptions, defaultSelectedSprintId])

  if (ganttDataLoading && optimisticGanttTasks.length === 0) {
    return <LoadingPlaceholder message="Loading Gantt data..." />
  }

  const error = ganttDataError || mutationError
  if (error) {
    return <ErrorPlaceholder error={error} onRetry={refetchGanttData} />
  }

  return (
    <div className="relative px-6">
      <div className="flex items-center gap-3 py-6">
        <Button
          onClick={() => setIsCreateTaskOpen(true)}
          className="bg-[#4ab5ae] text-white hover:bg-[#419d97] h-9 rounded-md"
        >
          + Add item
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">
              {currentSprintName} <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            {sprintFilterOptions.map(sprint => (
              <DropdownMenuItem key={sprint.id} onClick={() => handleSprintSelectionChange(sprint.id)}>
                {sprint.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex rounded-md shadow-sm ml-4" role="group">
          <Button
            variant={viewMode === ViewMode.Day ? "default" : "outline"}
            onClick={() => setViewMode(ViewMode.Day)}
            className="rounded-r-none h-9"
          >
            Day
          </Button>
          <Button
            variant={viewMode === ViewMode.Week ? "default" : "outline"}
            onClick={() => setViewMode(ViewMode.Week)}
            className="rounded-none h-9 border-l-0"
          >
            Week
          </Button>
          <Button
            variant={viewMode === ViewMode.Month ? "default" : "outline"}
            onClick={() => setViewMode(ViewMode.Month)}
            className="rounded-none h-9 border-l-0"
          >
            Month
          </Button>
          <Button
            variant={viewMode === ViewMode.Year ? "default" : "outline"}
            onClick={() => setViewMode(ViewMode.Year)}
            className="rounded-l-none h-9 border-l-0"
          >
            Year
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {isCreateTaskOpen && (
          <RightSideModal onClose={() => setIsCreateTaskOpen(false)}>
            <TaskForm
              onAddTask={handleAddTask}
              onClose={() => setIsCreateTaskOpen(false)}
              availableSprints={sprintFilterOptions}
              isMutating={isMutating}
              projectId={projectId}
            />
          </RightSideModal>
        )}
        {optimisticGanttTasks.length > 0 ? (
          <Gantt
            tasks={[...optimisticGanttTasks]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map(task => ({
                ...task,
                isDisabled: isMutating,
              }))}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onDelete={handleTaskDelete}
            onProgressChange={handleProgressChange}
            onExpanderClick={handleExpanderClick}
            listCellWidth="200px"
            columnWidth={dynamicColumnWidth}
          />
        ) : (
          <div className="flex items-center justify-center h-48 border rounded-md">
            <p className="text-muted-foreground">No tasks to display. Add an item to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface RightSideModalProps {
  children: React.ReactNode
  onClose: () => void
}
const RightSideModal: React.FC<RightSideModalProps> = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out transform translate-x-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create New Task</h2>
          <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        <div className="flex-grow p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

interface TaskFormProps {
  onAddTask: (task: any) => void
  onClose: () => void
  availableSprints: SprintGanttFilterOption[]
  isMutating: boolean
  projectId: string
}
const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, onClose, availableSprints, isMutating, projectId }) => {
  const [name, setName] = useState("")
  const [start, setStart] = useState<Date>(new Date())
  const [end, setEnd] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 1)))
  const [progress, setProgress] = useState(0)
  const [sprintId, setSprintId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (availableSprints.length > 0 && !sprintId) {
      setSprintId(availableSprints[0].id)
    }
  }, [availableSprints, sprintId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !start || !end || !sprintId) {
      alert("Please fill in all fields.")
      return
    }

    const newTaskData = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      name: name,
      type: "task",
      progress: progress,
      sprintId: sprintId,
      projectId: projectId,
    }

    onAddTask(newTaskData)
    onClose()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="taskName" className="block text-sm font-medium text-gray-700">
            Name:
          </label>
          <Input
            id="taskName"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 block w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Start Date:
          </label>
          <Input
            id="startDate"
            type="date"
            value={start.toISOString().split("T")[0]}
            onChange={e => setStart(new Date(e.target.value))}
            className="mt-1 block w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            End Date:
          </label>
          <Input
            id="endDate"
            type="date"
            value={end.toISOString().split("T")[0]}
            onChange={e => setEnd(new Date(e.target.value))}
            className="mt-1 block w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="progress" className="block text-sm font-medium text-gray-700">
            Progress (%):
          </label>
          <Input
            id="progress"
            type="number"
            value={progress}
            onChange={e => setProgress(Number(e.target.value))}
            min="0"
            max="100"
            className="mt-1 block w-full"
          />
        </div>
        <div>
          <label htmlFor="sprintSelect" className="block text-sm font-medium text-gray-700">
            Sprint:
          </label>
          <select
            id="sprintSelect"
            value={sprintId || ""}
            onChange={e => setSprintId(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            required
          >
            <option value="">Select Sprint</option>
            {availableSprints.map(sprintOption => (
              <option key={sprintOption.id} value={sprintOption.id}>
                {sprintOption.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-[#4ab5ae] text-white" disabled={isMutating}>
            Create Item
          </Button>
        </div>
      </form>
    </div>
  )
}

export default GanttView