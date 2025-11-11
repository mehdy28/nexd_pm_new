// components/personal/personal-list-view.tsx
"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  Pencil,
  Trash2,
  Loader2,
  EllipsisVertical,
  ListOrdered,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { useMyTasksAndSections } from "@/hooks/personal/useMyTasksAndSections"
import { usePersonalTaskmutations } from "@/hooks/personal/usePersonalTaskMutations"
import { TaskUI, SectionUI, PriorityUI } from "@/hooks/personal/useMyTasksAndSections"
import { TaskDetailSheet } from "../modals/task-detail-sheet"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"

type NewTaskForm = {
  title: string
  endDate?: string | null
  priority: PriorityUI
  points?: number | null
  description?: string | null
}

const priorityStyles: Record<PriorityUI, string> = {
  LOW: "bg-green-100 text-green-700 ring-1 ring-green-200",
  MEDIUM: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  HIGH: "bg-red-100 text-red-700 ring-1 ring-red-200",
}
const priorityDot: Record<PriorityUI, string> = {
  LOW: "bg-green-500",
  MEDIUM: "bg-orange-500",
  HIGH: "bg-red-500",
}

export function PersonalListView() {
  console.log("[PersonalListView] Component rendering or re-rendering.")

  const {
    personalSections: sections, // Use the data from the hook directly
    loading,
    error,
    refetchMyTasksAndSections,
    createSection,
    updateSection,
    deleteSection,
  } = useMyTasksAndSections()

  // Logging data fetching status
  useEffect(() => {
    console.log("[PersonalListView] Data fetching state changed.", { loading, error })
    if (loading) {
      console.log("[PersonalListView] Fetching tasks and sections...")
    }
    if (error) {
      console.error("[PersonalListView] Error fetching data:", error)
    }
    if (!loading && !error && sections) {
      console.log("[PersonalListView] Data successfully fetched or updated from cache. Current sections:", sections)
    }
  }, [loading, error, sections])

  const {
    createTask,
    updateTask: updateTaskMutation,
    toggleTaskCompleted: toggleTaskCompletedMutation,
    deleteTask: deleteTaskMutation,
    isTaskMutating,
  } = usePersonalTaskmutations()

  // Removed local `sections` state to use the Apollo cache as the single source of truth.
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sheetTask, setSheetTask] = useState<{ personalSectionId: string; taskId: string } | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState<Record<string, boolean>>({})
  const [newTask, setNewTask] = useState<Record<string, NewTaskForm>>({})
  const [isSectionMutating, setIsSectionMutating] = useState(false)

  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<SectionUI | null>(null)
  const [deleteTasksConfirmed, setDeleteTasksConfirmed] = useState(false)
  const [reassignToSectionOption, setReassignToSectionOption] = useState<string | null>(null)
  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<{ personalSectionId: string; task: TaskUI } | null>(null)

  const customModalRef = useRef<HTMLDivElement>(null)
  const customTaskModalRef = useRef<HTMLDivElement>(null)

  const sheetData = useMemo(() => {
    if (!sheetTask) return null
    const s = sections.find(x => x.id === sheetTask.personalSectionId)
    const t = s?.tasks.find(x => x.id === sheetTask.taskId)
    return t ? { personalSectionId: sheetTask.personalSectionId, task: t } : null
  }, [sheetTask, sections])

  const toggleSection = useCallback((id: string) => {
    console.log("[PersonalListView] Toggling collapsed state for section.", { id })
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const renameSection = useCallback(
    async (id: string, title: string) => {
      console.log("[PersonalListView] Initiating renameSection.", { id, title })
      setEditingSectionId(null) // Exit editing mode immediately
      if (!title.trim()) {
        console.warn("[PersonalListView] renameSection aborted: title is empty.")
        return
      }
      setIsSectionMutating(true)
      try {
        console.log("[PersonalListView] Calling updateSection mutation.", { id, title })
        await updateSection(id, title)
        console.log("[PersonalListView] updateSection mutation successful.")
      } catch (err) {
        console.error("[PersonalListView] Failed to rename section:", { id, title }, err)
      } finally {
        setIsSectionMutating(false)
        console.log("[PersonalListView] renameSection finished.")
      }
    },
    [updateSection]
  )

  const addSection = useCallback(async () => {
    console.log("[PersonalListView] Initiating addSection.")
    setIsSectionMutating(true)
    try {
      console.log("[PersonalListView] Calling createSection mutation with title 'New Section'.")
      await createSection("New Section")
      console.log("[PersonalListView] createSection mutation successful.")
    } catch (err) {
      console.error("[PersonalListView] Failed to create section:", err)
    } finally {
      setIsSectionMutating(false)
      console.log("[PersonalListView] addSection finished.")
    }
  }, [createSection])

  const toggleTaskCompleted = useCallback(
    async (personalSectionId: string, taskId: string) => {
      console.log("[PersonalListView] Initiating toggleTaskCompleted.", { personalSectionId, taskId })
      const taskToUpdate = sections.find(s => s.id === personalSectionId)?.tasks.find(t => t.id === taskId)
      if (!taskToUpdate) {
        console.warn("[PersonalListView] toggleTaskCompleted aborted: task not found.", { personalSectionId, taskId })
        return
      }

      try {
        console.log("[PersonalListView] Calling toggleTaskCompleted mutation.", {
          taskId,
          personalSectionId,
          currentStatus: taskToUpdate.status,
        })
        // ADJUSTMENT: Pass personalSectionId to the mutation hook. This is the fix.
        await toggleTaskCompletedMutation(taskId, personalSectionId, taskToUpdate.status)
        console.log("[PersonalListView] toggleTaskCompleted mutation successful.")
      } catch (err) {
        console.error("Failed to toggle task completion:", err)
      }
    },
    [sections, toggleTaskCompletedMutation]
  )

  const updateTask = useCallback(
    async (personalSectionId: string, taskId: string, updates: Partial<TaskUI>) => {
      console.log("[PersonalListView] Initiating updateTask.", { personalSectionId, taskId, updates })
      const mutationInput: { [key: string]: any } = {}
      if (updates.title !== undefined) mutationInput.title = updates.title
      if (updates.description !== undefined) mutationInput.description = updates.description
      if (updates.priority !== undefined) mutationInput.priority = updates.priority
      if (updates.points !== undefined) mutationInput.points = updates.points
      if (updates.endDate !== undefined) mutationInput.endDate = updates.endDate
      const newStatus = updates.completed !== undefined ? (updates.completed ? "DONE" : "TODO") : undefined
      if (newStatus !== undefined) mutationInput.status = newStatus

      if (Object.keys(mutationInput).length > 0) {
        try {
          console.log("[PersonalListView] Calling updateTask mutation.", { taskId, personalSectionId, mutationInput })
          await updateTaskMutation(taskId, personalSectionId, mutationInput)
          console.log("[PersonalListView] updateTask mutation successful.")
        } catch (err) {
          console.error("Failed to update task:", err)
        }
      } else {
        console.warn("[PersonalListView] updateTask aborted: no valid updates provided.", { updates })
      }
    },
    [updateTaskMutation]
  )

  const openDeleteTaskModal = useCallback((personalSectionId: string, task: TaskUI) => {
    console.log("[PersonalListView] Opening delete task modal.", { personalSectionId, task })
    setTaskToDelete({ personalSectionId, task })
    setDeleteTaskModalOpen(true)
  }, [])

  const closeSheet = useCallback(() => {
    console.log("[PersonalListView] Closing task detail sheet.")
    setSheetTask(null)
  }, [])

  const handleConfirmTaskDelete = useCallback(async () => {
    if (!taskToDelete) {
      console.warn("[PersonalListView] handleConfirmTaskDelete aborted: taskToDelete is null.")
      return
    }
    const { personalSectionId, task } = taskToDelete
    const taskId = task.id
    console.log("[PersonalListView] Confirming task deletion.", { taskId, personalSectionId })

    try {
      console.log("[PersonalListView] Calling deleteTask mutation.", { taskId, personalSectionId })
      // ADJUSTMENT: Pass personalSectionId to the mutation hook. This is the fix.
      await deleteTaskMutation(taskId, personalSectionId)
      console.log("[PersonalListView] deleteTask mutation successful.")
    } catch (err) {
      console.error("Failed to delete task:", err)
    } finally {
      console.log("[PersonalListView] Closing delete task modal and resetting state.")
      setDeleteTaskModalOpen(false)
      setTaskToDelete(null)
      if (sheetTask?.taskId === taskId) {
        closeSheet()
      }
    }
  }, [taskToDelete, deleteTaskMutation, sheetTask, closeSheet])

  const allTaskIds = useMemo(() => sections.flatMap(s => s.tasks.map(t => t.id)), [sections])
  const sectionTaskMap = useMemo(
    () => new Map(sections.flatMap(s => s.tasks.map(t => [t.id, s.id]))),
    [sections]
  )

  const toggleSelect = useCallback((taskId: string, checked: boolean) => {
    console.log("[PersonalListView] Toggling selection for a single task.", { taskId, checked })
    setSelected(prev => ({ ...prev, [taskId]: checked }))
  }, [])

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      console.log("[PersonalListView] Toggling selection for all tasks.", {
        checked,
        totalTasks: allTaskIds.length,
      })
      if (!checked) {
        setSelected({})
        return
      }
      const next: Record<string, boolean> = {}
      for (const id of allTaskIds) next[id] = true
      setSelected(next)
    },
    [allTaskIds]
  )

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  const bulkDeleteSelected = useCallback(async () => {
    const toDelete = Object.keys(selected).filter(k => selected[k])
    if (toDelete.length === 0) {
      console.warn("[PersonalListView] bulkDeleteSelected aborted: no tasks selected.")
      return
    }
    console.log("[PersonalListView] Initiating bulk delete for selected tasks.", { taskIds: toDelete })

    setSelected({})

    try {
      for (const taskId of toDelete) {
        // ADJUSTMENT: Use the sectionTaskMap to find the personalSectionId for each task.
        const personalSectionId = sectionTaskMap.get(taskId)
        if (personalSectionId) {
          console.log(`[PersonalListView] Deleting task ${taskId} from section ${personalSectionId}`)
          await deleteTaskMutation(taskId, personalSectionId)
        } else {
          console.warn(`Could not find section for task ${taskId}. Deleting without UI update.`)
          await deleteTaskMutation(taskId, "") // Pass empty string to satisfy signature, hook will log error.
        }
      }
      console.log("[PersonalListView] Bulk delete operation completed successfully.")
    } catch (err) {
      console.error("Failed during bulk delete:", err)
    }
  }, [selected, deleteTaskMutation, sectionTaskMap])

  const openNewTask = useCallback((personalSectionId: string) => {
    console.log("[PersonalListView] Opening new task form.", { personalSectionId })
    setNewTaskOpen(p => ({ ...p, [personalSectionId]: true }))
    setNewTask(p => ({
      ...p,
      [personalSectionId]: p[personalSectionId] || {
        title: "",
        endDate: null,
        priority: "MEDIUM",
        points: null,
        description: null,
      },
    }))
  }, [])

  const cancelNewTask = useCallback((personalSectionId: string) => {
    console.log("[PersonalListView] Cancelling new task creation.", { personalSectionId })
    setNewTaskOpen(p => ({ ...p, [personalSectionId]: false }))
  }, [])

  const saveNewTask = useCallback(
    async (personalSectionId: string) => {
      const form = newTask[personalSectionId]
      if (!form || !form.title.trim()) {
        console.warn("[PersonalListView] saveNewTask aborted: form is invalid or title is empty.", { form })
        return
      }
      console.log("[PersonalListView] Initiating saveNewTask.", { personalSectionId, form })
      try {
        const taskPayload = {
          title: form.title,
          description: form.description,
          endDate: form.endDate,
          priority: form.priority,
          points: form.points,
          status: "TODO" as "TODO",
        }
        console.log("[PersonalListView] Calling createTask mutation.", { personalSectionId, taskPayload })
        await createTask(personalSectionId, taskPayload)
        console.log("[PersonalListView] createTask mutation successful. Closing form.")
        setNewTaskOpen(p => ({ ...p, [personalSectionId]: false }))
        setNewTask(p => {
          const newState = { ...p }
          delete newState[personalSectionId]
          return newState
        })
      } catch (err) {
        console.error("Failed to save new task:", err)
      }
    },
    [newTask, createTask]
  )

  const openSheetFor = useCallback((personalSectionId: string, taskId: string) => {
    console.log("[PersonalListView] Opening sheet for task.", { personalSectionId, taskId })
    setSheetTask({ personalSectionId, taskId })
  }, [])

  useEffect(() => {
    if (sections) {
      console.log("[PersonalListView] Initializing or updating collapsed state for sections.")
      setCollapsed(prevCollapsed => {
        const newCollapsedState: Record<string, boolean> = {}
        sections.forEach(sec => {
          newCollapsedState[sec.id] = prevCollapsed[sec.id] ?? false
        })
        return newCollapsedState
      })
    }
  }, [sections])

  const handleOpenDeleteSectionModal = useCallback(
    (section: SectionUI) => {
      console.log("[PersonalListView] Opening delete section modal.", { section })
      setSectionToDelete(section)
      setDeleteTasksConfirmed(false)
      const availableOtherSections = sections.filter(s => s.id !== section.id)
      const reassignTarget = availableOtherSections[0]?.id || null
      console.log("[PersonalListView] Setting initial reassign target for section tasks.", { reassignTarget })
      setReassignToSectionOption(reassignTarget)
      setDeleteSectionModalOpen(true)
    },
    [sections]
  )

  const handleConfirmDeleteSection = useCallback(async () => {
    if (!sectionToDelete) {
      console.warn("[PersonalListView] handleConfirmDeleteSection aborted: sectionToDelete is null.")
      return
    }
    setIsSectionMutating(true)
    try {
      const hasTasks = sectionToDelete.tasks.length > 0
      let reassignId: string | null | undefined = null
      if (hasTasks && !deleteTasksConfirmed) {
        reassignId = reassignToSectionOption
        if (!reassignId) {
          console.warn("[PersonalListView] handleConfirmDeleteSection aborted: tasks exist but no reassign section selected.")
          setIsSectionMutating(false)
          return
        }
      }
      const deleteOptions = {
        deleteTasks: hasTasks ? deleteTasksConfirmed : true,
        reassignToSectionId: reassignId,
      }
      console.log("[PersonalListView] Confirming section deletion with options.", {
        personalSectionId: sectionToDelete.id,
        options: deleteOptions,
      })
      await deleteSection(sectionToDelete.id, deleteOptions)
      console.log("[PersonalListView] deleteSection mutation successful.")
    } catch (err) {
      console.error("[PersonalListView] Failed to delete section:", err)
    } finally {
      setIsSectionMutating(false)
      setDeleteSectionModalOpen(false)
      setSectionToDelete(null)
      console.log("[PersonalListView] handleConfirmDeleteSection finished.")
    }
  }, [sectionToDelete, deleteTasksConfirmed, reassignToSectionOption, deleteSection])

  useEffect(() => {
    if (deleteSectionModalOpen && customModalRef.current) customModalRef.current.focus()
  }, [deleteSectionModalOpen])
  useEffect(() => {
    if (deleteTaskModalOpen && customTaskModalRef.current) customTaskModalRef.current.focus()
  }, [deleteTaskModalOpen])

  const allSelected = useMemo(
    () => selectedCount > 0 && selectedCount === allTaskIds.length,
    [selectedCount, allTaskIds]
  )
  const otherSections = useMemo(
    () => sections.filter(s => s.id !== sectionToDelete?.id),
    [sections, sectionToDelete]
  )

  if (loading && !sections?.length) return <LoadingPlaceholder message="Loading your tasks..." />
  if (error) return <ErrorPlaceholder error={error} onRetry={refetchMyTasksAndSections} />

  return (
    <div className="p-6 pt-3">
      <div className="flex items-center gap-3">
        <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          {isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}+ Add section
        </Button>
        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." />
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
          <div>{selectedCount} selected</div>
          <Button variant="destructive" className="h-8" onClick={bulkDeleteSelected}>
            Delete selected
          </Button>
        </div>
      )}

      <div className="mt-4 w-full rounded-md overflow-x-auto">
        <Separator />
        {sections.map(section => (
          <div key={section.id} className="w-full">
            <div className="flex w-full items-center gap-2 px-5 py-4">
              <button
                onClick={() => toggleSection(section.id)}
                className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/40"
                aria-label={collapsed[section.id] ? "Expand section" : "Collapse section"}
                title={collapsed[section.id] ? "Expand" : "Collapse"}
              >
                {collapsed[section.id] ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {editingSectionId === section.id ? (
                <Input
                  autoFocus
                  defaultValue={section.title}
                  className="h-8 w-64"
                  onBlur={e => renameSection(section.id, e.target.value.trim())}
                  onKeyDown={e => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                    if (e.key === "Escape") setEditingSectionId(null)
                  }}
                  disabled={isSectionMutating}
                />
              ) : (
                <button
                  className="text-sm font-semibold text-left hover:underline"
                  onClick={() => setEditingSectionId(section.id)}
                  title="Rename section"
                  disabled={isSectionMutating}
                >
                  {section.title}
                </button>
              )}

              <div className="ml-auto flex items-center gap-2">
                {!newTaskOpen[section.id] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openNewTask(section.id)}
                    disabled={isTaskMutating}
                  >
                    + Add task
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isSectionMutating}>
                      <EllipsisVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleOpenDeleteSectionModal(section)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Section
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {!collapsed[section.id] && (
              <div className="w-full">
                {section.tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={!!selected[task.id]}
                    onSelect={checked => toggleSelect(task.id, checked)}
                    onToggleCompleted={() => toggleTaskCompleted(section.id, task.id)}
                    onUpdate={updates => updateTask(section.id, task.id, updates)}
                    onOpen={() => openSheetFor(section.id, task.id)}
                    onDelete={() => openDeleteTaskModal(section.id, task)}
                  />
                ))}
                {newTaskOpen[section.id] && (
                  <div className="px-10 py-4">
                    <div className="rounded-md border p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Title</label>
                          <Input
                            value={newTask[section.id]?.title || ""}
                            onChange={e =>
                              setNewTask(p => ({
                                ...p,
                                [section.id]: { ...(p[section.id] as NewTaskForm), title: e.target.value },
                              }))
                            }
                            placeholder="Task title"
                            disabled={isTaskMutating}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Due date</label>
                          <Input
                            type="date"
                            value={newTask[section.id]?.endDate || ""}
                            onChange={e =>
                              setNewTask(p => ({
                                ...p,
                                [section.id]: { ...(p[section.id] as NewTaskForm), endDate: e.target.value },
                              }))
                            }
                            disabled={isTaskMutating}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Priority</label>
                          <Select
                            value={newTask[section.id]?.priority || "MEDIUM"}
                            onValueChange={(v: PriorityUI) =>
                              setNewTask(p => ({
                                ...p,
                                [section.id]: { ...(p[section.id] as NewTaskForm), priority: v },
                              }))
                            }
                            disabled={isTaskMutating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              {(["LOW", "MEDIUM", "HIGH"] as PriorityUI[]).map(p => (
                                <SelectItem key={p} value={p}>
                                  <div className="flex items-center gap-2">
                                    <span className={cn("h-2 w-2 rounded-full", priorityDot[p])} />
                                    {p}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Story Points</label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-24"
                              value={newTask[section.id]?.points ?? ""}
                              onChange={e =>
                                setNewTask(p => ({
                                  ...p,
                                  [section.id]: {
                                    ...(p[section.id] as NewTaskForm),
                                    points: Number.isFinite(Number.parseInt(e.target.value))
                                      ? Number.parseInt(e.target.value)
                                      : null,
                                  },
                                }))
                              }
                              min={0}
                              disabled={isTaskMutating}
                            />
                            <Button
                              aria-label="Create task"
                              onClick={() => saveNewTask(section.id)}
                              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={isTaskMutating || !newTask[section.id]?.title.trim()}
                            >
                              {isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Create
                            </Button>
                            <Button
                              aria-label="Cancel task creation"
                              variant="ghost"
                              className="h-9 bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => cancelNewTask(section.id)}
                              disabled={isTaskMutating}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <Separator />
          </div>
        ))}
      </div>

      <TaskDetailSheet
        sheetTask={sheetTask}
        initialTaskData={sheetData?.task || null}
        onClose={closeSheet}
        onUpdateTask={updateTask}
        onRequestDelete={openDeleteTaskModal}
        availableAssignees={[]}
        isTaskMutating={isTaskMutating}
      />

      {sectionToDelete && deleteSectionModalOpen && (
        <div
          ref={customModalRef}
          role="alertdialog"
          aria-labelledby="delete-section-title"
          aria-describedby="delete-section-description"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={e => {
            if (e.target === e.currentTarget) setDeleteSectionModalOpen(false)
          }}
          onKeyDown={e => {
            if (e.key === "Escape") setDeleteSectionModalOpen(false)
          }}
        >
          <div className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 id="delete-section-title" className="text-lg font-semibold text-foreground">
                Delete Section "{sectionToDelete.title}"?
              </h2>
              <div id="delete-section-description" className="text-sm text-muted-foreground">
                {sectionToDelete.tasks.length > 0 ? (
                  <>
                    <p>
                      This section contains {sectionToDelete.tasks.length} tasks. What would you like to do with them?
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="deleteTasks"
                          checked={deleteTasksConfirmed}
                          onCheckedChange={(checked: boolean) => setDeleteTasksConfirmed(checked)}
                          disabled={isSectionMutating}
                        />
                        <Label htmlFor="deleteTasks">Delete all {sectionToDelete.tasks.length} tasks</Label>
                      </div>
                      {!deleteTasksConfirmed && otherSections.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="reassignTasks"
                            checked={!deleteTasksConfirmed && !!reassignToSectionOption}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) setReassignToSectionOption(otherSections[0]?.id || null)
                              else setReassignToSectionOption(null)
                            }}
                            disabled={isSectionMutating}
                          />
                          <Label htmlFor="reassignTasks">Reassign tasks to:</Label>
                          {!deleteTasksConfirmed && !!reassignToSectionOption && (
                            <Select
                              value={reassignToSectionOption || undefined}
                              onValueChange={v => setReassignToSectionOption(v)}
                              disabled={isSectionMutating}
                            >
                              <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                              <SelectContent>
                                {otherSections.map(sec => (
                                  <SelectItem key={sec.id} value={sec.id}>
                                    {sec.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                      {!deleteTasksConfirmed && otherSections.length === 0 && sectionToDelete.tasks.length > 0 && (
                        <p className="text-red-500 text-sm">
                          Cannot reassign tasks. No other sections available. You must delete the tasks.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p>Are you sure you want to delete this section? This action cannot be undone.</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                variant="outline"
                className="mt-2 sm:mt-0"
                onClick={() => setDeleteSectionModalOpen(false)}
                disabled={isSectionMutating}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDeleteSection}
                disabled={
                  isSectionMutating ||
                  (sectionToDelete.tasks.length > 0 && !deleteTasksConfirmed && !reassignToSectionOption)
                }
              >
                {isSectionMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Section"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {taskToDelete && deleteTaskModalOpen && (
        <div
          ref={customTaskModalRef}
          role="alertdialog"
          aria-labelledby="delete-task-title"
          aria-describedby="delete-task-description"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={e => {
            if (e.target === e.currentTarget) setDeleteTaskModalOpen(false)
          }}
          onKeyDown={e => {
            if (e.key === "Escape") setDeleteTaskModalOpen(false)
          }}
        >
          <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 id="delete-task-title" className="text-lg font-semibold text-foreground">
                Delete Task "{taskToDelete.task.title}"?
              </h2>
              <p id="delete-task-description" className="text-sm text-muted-foreground">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                variant="outline"
                className="mt-2 sm:mt-0"
                onClick={() => setDeleteTaskModalOpen(false)}
                disabled={isTaskMutating}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmTaskDelete}
                disabled={isTaskMutating}
              >
                {isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Task"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TaskRowProps {
  task: TaskUI
  selected: boolean
  onSelect: (checked: boolean) => void
  onToggleCompleted: () => void
  onUpdate: (updates: Partial<TaskUI>) => void
  onOpen: () => void
  onDelete: () => void
}

function TaskRow({ task, selected, onSelect, onToggleCompleted, onUpdate, onOpen, onDelete }: TaskRowProps) {
  const Icon = task.completed ? CheckCircle2 : Circle
  const cellInput =
    "h-8 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:border-0 focus:outline-none text-sm"

  const [localTitle, setLocalTitle] = useState(task.title)
  useEffect(() => {
    setLocalTitle(task.title)
  }, [task.title])

  const handleBlur = (field: keyof TaskUI, value: any) => {
    if (value !== task[field]) {
      onUpdate({ [field]: value })
    }
  }

  return (
    <div className="grid grid-cols-[40px_1fr_160px_140px_100px_96px] items-center gap-2 px-10 py-2 hover:bg-muted/40 focus-within:bg-emerald-50/50 focus-within:ring-1 focus-within:ring-emerald-200 rounded-md">
      <div className="flex items-center">
        <Checkbox checked={selected} onCheckedChange={v => onSelect(!!v)} aria-label="Select task" />
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleCompleted}
          aria-pressed={!!task.completed}
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            task.completed ? "text-emerald-600" : "text-muted-foreground"
          )}
          title="Toggle completed"
        >
          <Icon className="h-4 w-4" />
        </button>
        <Input
          className={cn(
            cellInput,
            "min-w-0 rounded-sm focus-visible:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0",
            task.completed && "line-through text-muted-foreground"
          )}
          value={localTitle}
          onChange={e => setLocalTitle(e.target.value)}
          onBlur={() => handleBlur("title", localTitle)}
          onKeyDown={e => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          }}
          onFocus={e => e.currentTarget.select()}
        />
      </div>
      <div className="justify-self-end w-[160px]">
        <Input
          type="date"
          defaultValue={task.endDate || ""}
          onBlur={e => handleBlur("endDate", e.target.value)}
          className="h-8"
        />
      </div>
      <div className="justify-self-end w-[140px]">
        <Select value={task.priority} onValueChange={(v: PriorityUI) => onUpdate({ priority: v })}>
          <SelectTrigger className="h-8">
            <div
              className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", priorityStyles[task.priority])}
            >
              <span className={cn("mr-2 h-2 w-2 rounded-full", priorityDot[task.priority])} />
              {task.priority}
            </div>
          </SelectTrigger>
          <SelectContent>
            {(["LOW", "MEDIUM", "HIGH"] as PriorityUI[]).map(p => (
              <SelectItem key={p} value={p}>
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", priorityDot[p])} />
                  <span>{p}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="justify-self-end w-[100px]">
        <Input
          className={cellInput}
          type="number"
          defaultValue={task.points ?? ""}
          onBlur={e =>
            handleBlur(
              "points",
              Number.isNaN(Number.parseInt(e.target.value)) ? null : Number.parseInt(e.target.value)
            )
          }
          onKeyDown={e => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          }}
          min={0}
        />
      </div>
      <div className="flex items-center justify-end gap-2 pr-2 w-[96px]">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpen} title="Open task">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onDelete}
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
