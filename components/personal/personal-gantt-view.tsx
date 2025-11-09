"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Gantt, Task as GanttTaskReact, ViewMode } from "gantt-task-react"
import "gantt-task-react/dist/index.css"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

import {
  usePersonalGanttData,
  CustomGanttTask,
  PersonalSectionGanttFilterOption,
} from "@/hooks/personal/usePersonalGanttData"
import { usePersonalGanttMutations } from "@/hooks/personal/usePersonalGanttMutations"
import { usePersonalTaskmutations } from "@/hooks/personal/usePersonalTaskMutations" // For delete
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"

interface PersonalGanttViewProps {}

// Helper to determine start/end date for a parent section based on its children tasks
export function getStartEndDateForParent(tasks: CustomGanttTask[], parentId: string) {
  const children = tasks.filter(t => t.project === parentId) // 'project' property is used by gantt-task-react for parent linking
  if (children.length === 0) {
    const parent = tasks.find(t => t.id === parentId)
    return parent ? [parent.start, parent.end] : [new Date(), new Date()]
  }
  let start = children[0].start
  let end = children[0].end

  for (let i = 0; i < children.length; i++) {
    const task = children[i]
    if (start.getTime() > task.start.getTime()) {
      start = task.start
    }
    if (end.getTime() < task.end.getTime()) {
      end = task.end
    }
  }
  return [start, end]
}

const PersonalGanttView: React.FC<PersonalGanttViewProps> = () => {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
  const [optimisticGanttTasks, setOptimisticGanttTasks] = useState<CustomGanttTask[]>([])

  const {
    ganttTasks,
    sectionFilterOptions,
    loading: ganttDataLoading,
    error: ganttDataError,
    refetchPersonalGanttData,
  } = usePersonalGanttData()

  const {
    createPersonalGanttTask,
    updatePersonalGanttTask,
    isMutating: isUpsertMutating,
    mutationError: upsertMutationError,
  } = usePersonalGanttMutations()

  const {
    deleteTask,
    isTaskMutating: isDeleteMutating,
    taskMutationError: deleteMutationError,
  } = usePersonalTaskmutations()

  const isMutating = isUpsertMutating || isDeleteMutating
  const mutationError = upsertMutationError || deleteMutationError

  useEffect(() => {
    // Sync optimistic state when the source data from the hook changes
    if (JSON.stringify(ganttTasks) !== JSON.stringify(optimisticGanttTasks)) {
      setOptimisticGanttTasks(ganttTasks)
    }
  }, [ganttTasks])

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
      }
      let hasChanges = false
      if (originalItem.start.toISOString() !== task.start.toISOString()) {
        input.startDate = task.start.toISOString()
        hasChanges = true
      }
      if (originalItem.end.toISOString() !== task.end.toISOString()) {
        input.endDate = task.end.toISOString()
        hasChanges = true
      }
      if (task.name !== originalItem.name) {
        input.name = task.name
        hasChanges = true
      }

      if (hasChanges) {
        setOptimisticGanttTasks(prev => prev.map(t => (t.id === task.id ? { ...t, ...task } : t)))
        try {
          await updatePersonalGanttTask(input)
        } catch (err) {
          // Revert optimistic update on error
          setOptimisticGanttTasks(prev =>
            prev.map(t => (t.id === task.id ? (originalItem as CustomGanttTask) : t))
          )
        }
      }
    },
    [optimisticGanttTasks, updatePersonalGanttTask]
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
        setOptimisticGanttTasks(prev => prev.filter(t => t.id !== task.id))
        try {
          await deleteTask(originalItem.originalTaskId)
        } catch (err) {
          refetchPersonalGanttData() // Refetch to restore state on error
        }
        return true
      }
      return false
    },
    [optimisticGanttTasks, deleteTask, refetchPersonalGanttData]
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
          await updatePersonalGanttTask({
            id: originalItem.originalTaskId,
            type: "TASK",
            progress: roundedNewProgress,
          })
        } catch (err) {
          // Revert optimistic update
          setOptimisticGanttTasks(prev =>
            prev.map(t => (t.id === task.id ? (originalItem as CustomGanttTask) : t))
          )
        }
      }
    },
    [optimisticGanttTasks, updatePersonalGanttTask]
  )

  const handleAddTask = useCallback(
    async (newTaskData: any) => {
      try {
        await createPersonalGanttTask(newTaskData)
        setIsCreateTaskOpen(false)
      } catch (err) {
        console.error("Error creating Gantt item:", err)
      }
    },
    [createPersonalGanttTask]
  )

  if (ganttDataLoading && optimisticGanttTasks.length === 0) {
    return <LoadingPlaceholder message="Loading Gantt data..." />
  }

  const error = ganttDataError || mutationError
  if (error) {
    return <ErrorPlaceholder error={error} onRetry={refetchPersonalGanttData} />
  }

  return (
    <div className="relative px-6">
      <div className="flex items-center gap-3 py-6">
        <Button
          onClick={() => setIsCreateTaskOpen(true)}
          className="bg-[#4ab5ae] text-white h-9 rounded-md"
          disabled={isMutating}
        >
          {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          + Add item
        </Button>

        <div className="flex rounded-md shadow-sm ml-4" role="group">
          <Button
            variant={viewMode === ViewMode.Day ? "default" : "outline"}
            onClick={() => setViewMode(ViewMode.Day)}
            className="rounded-r-none h-9"
            disabled={isMutating}
          >
            Day
          </Button>
          <Button
            variant={viewMode === ViewMode.Week ? "default" : "outline"}
            onClick={() => setViewMode(ViewMode.Week)}
            className="rounded-none h-9 border-l-0"
            disabled={isMutating}
          >
            Week
          </Button>
          <Button
            variant={viewMode === ViewMode.Month ? "default" : "outline"}
            onClick={() => setViewMode(ViewMode.Month)}
            className="rounded-none h-9 border-l-0"
            disabled={isMutating}
          >
            Month
          </Button>
          <Button
            variant={viewMode === ViewMode.Year ? "default" : "outline"}
            onClick={() => setViewMode(ViewMode.Year)}
            className="rounded-l-none h-9 border-l-0"
            disabled={isMutating}
          >
            Year
          </Button>
        </div>

        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." disabled={isMutating} />
        </div>
      </div>

      <div className="overflow-x-auto">
        {isCreateTaskOpen && (
          <RightSideModal onClose={() => setIsCreateTaskOpen(false)}>
            <TaskForm
              onAddTask={handleAddTask}
              onClose={() => setIsCreateTaskOpen(false)}
              availableSections={sectionFilterOptions}
              isMutating={isMutating}
            />
          </RightSideModal>
        )}
        {optimisticGanttTasks.length > 0 && (
          <Gantt
            tasks={optimisticGanttTasks}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onDelete={handleTaskDelete}
            onProgressChange={handleProgressChange}
            listCellWidth="200px"
            columnWidth={dynamicColumnWidth}
            readOnly={isMutating}
          />
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
  availableSections: PersonalSectionGanttFilterOption[]
  isMutating: boolean
}
const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, onClose, availableSections, isMutating }) => {
  const [name, setName] = useState("")
  const [start, setStart] = useState<Date>(new Date())
  const [end, setEnd] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 1)))
  const [progress, setProgress] = useState(0)
  const [sectionId, setSectionId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (availableSections.length > 0 && !sectionId) {
      setSectionId(availableSections[0].id)
    }
  }, [availableSections, sectionId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !start || !end || !sectionId) {
      alert("Please fill in all fields.")
      return
    }

    const newTaskData = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      name: name,
      type: "task",
      progress: progress,
      personalSectionId: sectionId,
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
            disabled={isMutating}
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
            disabled={isMutating}
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
            disabled={isMutating}
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
            disabled={isMutating}
          />
        </div>
        <div>
          <label htmlFor="sectionSelect" className="block text-sm font-medium text-gray-700">
            Section:
          </label>
          <select
            id="sectionSelect"
            value={sectionId || ""}
            onChange={e => setSectionId(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            required
            disabled={isMutating}
          >
            <option value="">Select Section</option>
            {availableSections.map(sectionOption => (
              <option key={sectionOption.id} value={sectionOption.id}>
                {sectionOption.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button type="submit" className="bg-[#4ab5ae] text-white" disabled={isMutating}>
            {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Item
          </Button>
        </div>
      </form>
    </div>
  )
}

export default PersonalGanttView