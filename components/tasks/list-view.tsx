"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import {
  useProjectTasksAndSections,
  TaskUI,
  SectionUI,
  PriorityUI,
} from "@/hooks/useProjectTasksAndSections"
import { useProjectTaskMutations } from "@/hooks/useProjectTaskMutationsNew"
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections"
import { TaskDetailSheet } from "../modals/task-detail-sheet"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"

type NewTaskForm = {
  title: string
  assigneeId?: string | null
  endDate?: string | null
  priority: PriorityUI
  points?: number | null
  description?: string | null
  sprintId?: string | null
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

const formatDateForInput = (isoDateString: string | null | undefined): string => {
  if (!isoDateString) return ""
  try {
    const date = new Date(isoDateString)
    if (isNaN(date.getTime())) return ""
    return date.toISOString().slice(0, 10)
  } catch (error) {
    return ""
  }
}

interface ListViewProps {
  projectId: string
}

export function ListView({ projectId }: ListViewProps) {
  const [internalSelectedSprintId, setInternalSelectedSprintId] = useState<string | undefined>(undefined)

  const {
    sections,
    sprintFilterOptions,
    loading,
    error,
    refetchProjectTasksAndSections,
    createSection,
    updateSection,
    renameSection: renameSectionMutation,
    deleteSection,
    projectMembers,
    defaultSelectedSprintId: suggestedDefaultSprintId,
  } = useProjectTasksAndSections(projectId, internalSelectedSprintId)

  useEffect(() => {
    if (internalSelectedSprintId === undefined && suggestedDefaultSprintId) {
      setInternalSelectedSprintId(suggestedDefaultSprintId)
    }
  }, [internalSelectedSprintId, suggestedDefaultSprintId])

  const {
    createTask,
    updateTask: updateTaskMutation,
    toggleTaskCompleted: toggleTaskCompletedMutation,
    deleteTask: deleteTaskMutation,
    deleteManyTasks,
    createLoading,
    deleteManyLoading,
    deleteLoading,
    updateLoading,
  } = useProjectTaskMutations(projectId, internalSelectedSprintId)

  // Section editing logic moved to ProjectSectionHeader component
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sheetTask, setSheetTask] = useState<{ sectionId: string; taskId: string } | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState<Record<string, boolean>>({})
  const [newTask, setNewTask] = useState<Record<string, NewTaskForm>>({})
  const [isSectionMutating, setIsSectionMutating] = useState(false)

  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<SectionUI | null>(null)
  const [deleteTasksConfirmed, setDeleteTasksConfirmed] = useState(false)
  const [reassignToSectionOption, setReassignToSectionOption] = useState<string | null>(null)

  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<{ sectionId: string; task: TaskUI } | null>(null)

  const customModalRef = useRef<HTMLDivElement>(null)
  const customTaskModalRef = useRef<HTMLDivElement>(null)

  const sheetData = useMemo(() => {
    if (!sheetTask) return null
    const s = sections.find(x => x.id === sheetTask.sectionId)
    const t = s?.tasks.find(x => x.id === sheetTask.taskId)
    return t ? { sectionId: sheetTask.sectionId, task: t } : null
  }, [sheetTask, sections])

  const availableAssignees: UserAvatarPartial[] = useMemo(() => {
    return projectMembers.map(member => ({
      id: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatar: member.user.avatar,
      avatarColor: (member.user as any).avatarColor,
    } as UserAvatarPartial))
  }, [projectMembers])

  const toggleSection = useCallback((id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const renameSection = useCallback(
    async (id: string, title: string) => {
      // Editing state managed locally in ProjectSectionHeader now
      if (!title.trim()) return
      
      setIsSectionMutating(true)
      try {
        await renameSectionMutation(id, title)

      } catch (err) {
        console.error(`[renameSection] Failed to rename section "${id}":`, err)
      } finally {
        setIsSectionMutating(false)
      }
    },
    [renameSectionMutation]
  )

  const addSection = useCallback(async () => {
    setIsSectionMutating(true)
    try {
      await createSection("New Section")
    } catch (err) {
      console.error("[addSection] Failed to add section:", err)
    } finally {
      setIsSectionMutating(false)
    }
  }, [createSection])

  const toggleTaskCompleted = useCallback(
    async (sectionId: string, taskId: string) => {
      const taskToUpdate = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId)
      if (!taskToUpdate) return

      try {
        await toggleTaskCompletedMutation(taskId, sectionId, taskToUpdate.status)
      } catch (err) {
        console.error(`[toggleTaskCompleted] Failed to toggle task "${taskId}" completion:`, err)
      }
    },
    [sections, toggleTaskCompletedMutation]
  )

  const updateTask = useCallback(
    async (sectionId: string, taskId: string, updates: Partial<TaskUI>) => {
      const mutationInput: { [key: string]: any } = {}
      if (updates.title !== undefined) mutationInput.title = updates.title
      if (updates.description !== undefined) mutationInput.description = updates.description
      if (updates.priority !== undefined) mutationInput.priority = updates.priority
      if (updates.points !== undefined) mutationInput.points = updates.points
      if (updates.startDate !== undefined) mutationInput.startDate = updates.startDate
      if (updates.endDate !== undefined) mutationInput.endDate = updates.endDate
      if (updates.assignee !== undefined) mutationInput.assigneeId = updates.assignee?.id || null

      const newStatus = updates.completed !== undefined ? (updates.completed ? "DONE" : "TODO") : undefined
      if (newStatus !== undefined) mutationInput.status = newStatus

      if (Object.keys(mutationInput).length > 0) {
        try {
          await updateTaskMutation(taskId, sectionId, mutationInput)
        } catch (err) {
          console.error(`[updateTask] Failed to update task "${taskId}":`, err)
        }
      }
    },
    [updateTaskMutation]
  )

  const openDeleteTaskModal = useCallback((sectionId: string, task: TaskUI) => {
    setTaskToDelete({ sectionId, task })
    setDeleteTaskModalOpen(true)
  }, [])

  const closeSheet = useCallback(() => {
    setSheetTask(null)
  }, [])

  const handleConfirmTaskDelete = useCallback(async () => {
    if (!taskToDelete) return
    const { sectionId, task } = taskToDelete

    try {
      await deleteTaskMutation(task.id, sectionId)
    } catch (err) {
      console.error(`[handleConfirmTaskDelete] Failed to delete task "${task.id}":`, err)
    } finally {
      setDeleteTaskModalOpen(false)
      setTaskToDelete(null)
      if (sheetTask?.taskId === task.id) {
        closeSheet()
      }
    }
  }, [taskToDelete, deleteTaskMutation, sheetTask, closeSheet])

  const allTaskIds = useMemo(() => sections.flatMap(s => s.tasks.map(t => t.id)), [sections])
  const sectionTaskMap = useMemo(() => new Map(sections.flatMap(s => s.tasks.map(t => [t.id, s.id]))), [sections])

  const toggleSelect = useCallback((taskId: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [taskId]: checked }))
  }, [])

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
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
    const toDeleteIds = Object.keys(selected).filter(k => selected[k])
    if (toDeleteIds.length === 0) return

    const tasksToDelete = toDeleteIds
      .map(taskId => {
        const sectionId = sectionTaskMap.get(taskId)
        if (!sectionId) {
          console.warn(`Could not find section for task ${taskId}. It will be skipped.`)
          return null
        }
        return { taskId, sectionId }
      })
      .filter((item): item is { taskId: string; sectionId: string } => item !== null)

    if (tasksToDelete.length === 0) return

    setSelected({})
    try {
      await deleteManyTasks(tasksToDelete)
    } catch (err) {
      console.error("[bulkDeleteSelected] Failed to bulk delete tasks:", err)
    }
  }, [selected, deleteManyTasks, sectionTaskMap])

  const openNewTask = useCallback(
    (sectionId: string) => {
      setNewTaskOpen(p => ({ ...p, [sectionId]: true }))
      setNewTask(p => ({
        ...p,
        [sectionId]: p[sectionId] || {
          title: "",
          assigneeId: null,
          endDate: null,
          priority: "MEDIUM",
          points: null,
          description: null,
          sprintId: internalSelectedSprintId || null,
        },
      }))
    },
    [internalSelectedSprintId]
  )

  const cancelNewTask = useCallback((sectionId: string) => {
    setNewTaskOpen(p => ({ ...p, [sectionId]: false }))
  }, [])

  const saveNewTask = useCallback(
    async (sectionId: string) => {
      const form = newTask[sectionId]
      if (!form || !form.title.trim()) return

      try {
        await createTask(sectionId, {
          title: form.title,
          description: form.description,
          assigneeId: form.assigneeId,
          endDate: form.endDate,
          priority: form.priority,
          points: form.points,
          sprintId: internalSelectedSprintId || null,
          status: "TODO",
        })
        setNewTaskOpen(p => ({ ...p, [sectionId]: false }))
        setNewTask(p => {
          const newState = { ...p }
          delete newState[sectionId]
          return newState
        })
      } catch (err) {
        console.error(`[saveNewTask] Failed to create task in section "${sectionId}":`, err)
      }
    },
    [newTask, createTask, internalSelectedSprintId]
  )

  const openSheetFor = useCallback((sectionId: string, taskId: string) => {
    setSheetTask({ sectionId, taskId })
  }, [])

  useEffect(() => {
    if (sections) {
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
      setSectionToDelete(section)
      setDeleteTasksConfirmed(false)
      const availableOtherSections = sections.filter(s => s.id !== section.id)
      setReassignToSectionOption(availableOtherSections[0]?.id || null)
      setDeleteSectionModalOpen(true)
    },
    [sections]
  )

  const handleConfirmDeleteSection = useCallback(async () => {
    if (!sectionToDelete) return
    setIsSectionMutating(true)
    try {
      const hasTasks = sectionToDelete.tasks.length > 0
      let reassignId: string | null | undefined = null
      if (hasTasks && !deleteTasksConfirmed) {
        reassignId = reassignToSectionOption
        if (!reassignId) {
          setIsSectionMutating(false)
          return
        }
      }
      await deleteSection(sectionToDelete.id, {
        deleteTasks: hasTasks ? deleteTasksConfirmed : true,
        reassignToSectionId: reassignId,
      })
    } catch (err) {
      console.error(`[handleConfirmDeleteSection] Failed to delete section "${sectionToDelete.id}":`, err)
    } finally {
      setIsSectionMutating(false)
      setDeleteSectionModalOpen(false)
      setSectionToDelete(null)
    }
  }, [sectionToDelete, deleteTasksConfirmed, reassignToSectionOption, deleteSection])

  useEffect(() => {
    if (deleteSectionModalOpen && customModalRef.current) customModalRef.current.focus()
  }, [deleteSectionModalOpen])
  useEffect(() => {
    if (deleteTaskModalOpen && customTaskModalRef.current) customTaskModalRef.current.focus()
  }, [deleteTaskModalOpen])

  const allSelected = useMemo(() => selectedCount > 0 && selectedCount === allTaskIds.length, [
    selectedCount,
    allTaskIds,
  ])
  const otherSections = useMemo(() => sections.filter(s => s.id !== sectionToDelete?.id), [
    sections,
    sectionToDelete,
  ])
  const currentSprintName = useMemo(() => {
    return sprintFilterOptions.find(s => s.id === internalSelectedSprintId)?.name || "All Sprints"
  }, [internalSelectedSprintId, sprintFilterOptions])

  const handleSprintSelectionChange = useCallback((sprintId: string) => {
    setInternalSelectedSprintId(sprintId)
  }, [])

  if (loading && !sections?.length) return <LoadingPlaceholder message="Loading tasks and sections..." />
  if (error) return <ErrorPlaceholder error={error} onRetry={refetchProjectTasksAndSections} />

  return (
    <div className="p-6 pt-3">
      <div className="flex items-center gap-3">
        <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          {isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}+ Add section
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">
              {currentSprintName}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." />
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
          <div>{selectedCount} selected</div>
          <Button variant="destructive" className="h-8" onClick={bulkDeleteSelected} disabled={deleteManyLoading}>
            {deleteManyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete selected
          </Button>
        </div>
      )}

      <div className="mt-4 w-full rounded-md overflow-x-auto">
        <div className="grid grid-cols-[40px_1fr_200px_150px_120px_80px_96px] items-center gap-2 px-10 py-2 text-xs font-medium text-muted-foreground border-b">
          <div className="flex items-center">
            <Checkbox
              checked={allSelected}
              onCheckedChange={checked => toggleSelectAll(!!checked)}
              aria-label="Select all tasks"
            />
          </div>
          <div>Task</div>
          <div>Assignee</div>
          <div>Due Date</div>
          <div>Priority</div>
          <div>Points</div>
          <div className="justify-self-end pr-2">Actions</div>
        </div>
        {sections.map(section => (
          <div key={section.id} className="w-full">
            <ProjectSectionHeader
              section={section}
              collapsed={!!collapsed[section.id]}
              onToggleCollapse={() => toggleSection(section.id)}
              onRename={(title) => renameSection(section.id, title)}
              onDelete={() => handleOpenDeleteSectionModal(section)}
              onOpenNewTask={() => openNewTask(section.id)}
              newTaskOpen={!!newTaskOpen[section.id]}
              isSectionMutating={isSectionMutating}
            />

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
                    assignees={availableAssignees}
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
                            // disabled={isTaskMutating}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Assignee</label>
                          <Select
                            value={newTask[section.id]?.assigneeId || "null"}
                            onValueChange={v =>
                              setNewTask(p => ({
                                ...p,
                                [section.id]: {
                                  ...(p[section.id] as NewTaskForm),
                                  assigneeId: v === "null" ? null : v,
                                },
                              }))
                            }
                            //disabled={isTaskMutating}
                          >
                            <SelectTrigger>
                                <SelectValue placeholder="Assignee">
                                    <div className="flex items-center gap-2">
                                        {availableAssignees.find(a => a.id === newTask[section.id]?.assigneeId) ? (
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={availableAssignees.find(a => a.id === newTask[section.id]?.assigneeId)?.avatar || undefined} />
                                                <AvatarFallback 
                                                    className="text-xs text-white" 
                                                    style={{ backgroundColor: (availableAssignees.find(a => a.id === newTask[section.id]?.assigneeId) as any)?.avatarColor || "#6366f1" }}
                                                >
                                                    {`${availableAssignees.find(a => a.id === newTask[section.id]?.assigneeId)?.firstName?.[0] || ""}${availableAssignees.find(a => a.id === newTask[section.id]?.assigneeId)?.lastName?.[0] || ""}` || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <Avatar className="h-5 w-5 border bg-gray-100">
                                                <AvatarImage src={undefined} />
                                                <AvatarFallback className="text-[10px] text-gray-700">?</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <span>
                                            {availableAssignees.find(a => a.id === newTask[section.id]?.assigneeId) ? `${availableAssignees.find(a => a.id === newTask[section.id]?.assigneeId)?.firstName} ${availableAssignees.find(a => a.id === newTask[section.id]?.assigneeId)?.lastName}` : 'Unassigned'}
                                        </span>
                                    </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <div className="max-h-48 overflow-y-auto">
                                <SelectItem value="null">
                                  <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5 border bg-gray-100">
                                          <AvatarImage src={undefined} />
                                          <AvatarFallback className="text-[10px] text-gray-700">?</AvatarFallback>
                                      </Avatar>
                                      <span>Unassigned</span>
                                  </div>
                                </SelectItem>
                                <DropdownMenuSeparator />
                                {availableAssignees.map(a => (
                                  <SelectItem key={a.id} value={a.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={a.avatar || undefined} />
                                        <AvatarFallback 
                                          className="text-xs text-white" 
                                          style={{ backgroundColor: (a as any).avatarColor   }}
                                        >
                                          {`${a.firstName?.[0] || ""}${a.lastName?.[0] || ""}` || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>
                                        {a.firstName} {a.lastName}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            </SelectContent>
                          </Select>
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
                            //disabled={isTaskMutating}
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
                            // disabled={isTaskMutating}
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
                              // disabled={isTaskMutating}
                            />
                            <Button
                              aria-label="Create task"
                              onClick={() => saveNewTask(section.id)}
                              className="h-9 bg-[#4ab5ae] text-white hover:bg-[#419d97]"
                              disabled={createLoading || !newTask[section.id]?.title.trim()}
                            >
                              {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create
                            </Button>
                            <Button
                              aria-label="Cancel task creation"
                              variant="ghost"
                              className="h-9 bg-red-500 hover:bg-red-600 text-white"
                              onClick={() => cancelNewTask(section.id)}
                              disabled={createLoading}
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
        onClose={closeSheet}
        onUpdateTask={updateTask}
        onRequestDelete={openDeleteTaskModal}
        availableAssignees={availableAssignees}
        isTaskMutating={updateLoading}
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
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmTaskDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Task"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ProjectSectionHeaderProps {
  section: SectionUI
  collapsed: boolean
  onToggleCollapse: () => void
  onRename: (title: string) => void
  onDelete: () => void
  onOpenNewTask: () => void
  newTaskOpen: boolean
  isSectionMutating: boolean
}

function ProjectSectionHeader({
  section,
  collapsed,
  onToggleCollapse,
  onRename,
  onDelete,
  onOpenNewTask,
  newTaskOpen,
  isSectionMutating,
}: ProjectSectionHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localTitle, setLocalTitle] = useState(section.title)

  // Sync local title with props if props change from outside
  useEffect(() => {
    setLocalTitle(section.title)
  }, [section.title])

  const handleBlur = () => {
    setIsEditing(false)
    if (localTitle.trim() && localTitle !== section.title) {
      onRename(localTitle.trim())
    } else {
      setLocalTitle(section.title) // Revert if empty or unchanged
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur()
    }
    if (e.key === "Escape") {
      setIsEditing(false)
      setLocalTitle(section.title) // Revert
    }
  }

  return (
    <div className="flex w-full items-center gap-2 px-5 py-4">
      <button
        onClick={onToggleCollapse}
        className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/40"
        aria-label={collapsed ? "Expand section" : "Collapse section"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isEditing ? (
        <Input
          autoFocus
          value={localTitle}
          onChange={e => setLocalTitle(e.target.value)}
          className="h-8 w-64"
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isSectionMutating}
        />
      ) : (
        <button
          className="text-sm font-semibold text-left hover:underline"
          onClick={() => setIsEditing(true)}
          title="Rename section"
          disabled={isSectionMutating}
        >
          {localTitle}
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {!newTaskOpen && (
          <Button
            variant="outline"
            size="sm"
            className="bg-[#4ab5ae] text-white hover:bg-[#419d97]"
            onClick={onOpenNewTask}
            // disabled={isTaskMutating}
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
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" /> Delete Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
  assignees: UserAvatarPartial[]
}

function TaskRow({ task, selected, onSelect, onToggleCompleted, onUpdate, onOpen, onDelete, assignees }: TaskRowProps) {
  const Icon = task.completed ? CheckCircle2 : Circle
  const cellInput =
    "h-8 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:border-0 focus:outline-none text-sm"
  const assignee = task.assignee
  const assigneeInitials = `${assignee?.firstName?.[0] || ""}${assignee?.lastName?.[0] || ""}`.trim() || "?"
  const assigneeName = `${assignee?.firstName || ""} ${assignee?.lastName || ""}`.trim() || "Unassigned"

  // Local state for immediate UI updates and buffering inputs
  const [localTitle, setLocalTitle] = useState(task.title)
  useEffect(() => setLocalTitle(task.title), [task.title])

  const [localPriority, setLocalPriority] = useState<PriorityUI>(task.priority)
  useEffect(() => setLocalPriority(task.priority), [task.priority])

  const [localPoints, setLocalPoints] = useState(task.points)
  useEffect(() => setLocalPoints(task.points), [task.points])

  const handleBlur = (field: keyof TaskUI, value: any) => {
    // Only update if value actually changed
    if (value !== task[field]) {
      onUpdate({ [field]: value })
    }
  }

  return (
    <div className="grid grid-cols-[40px_1fr_200px_150px_120px_80px_96px] items-center gap-2 px-10 py-2 hover:bg-muted/40 focus-within:bg-emerald-50/50 focus-within:ring-1 focus-within:ring-emerald-200 rounded-md">
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
      <div>
        <Select
          value={assignee?.id || "null"}
          onValueChange={v => onUpdate({ assignee: v === "null" ? null : assignees.find(a => a.id === v) })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Unassigned">
                <div className="flex items-center gap-2">
                    {assignee ? (
                        <Avatar className="h-6 w-6 border">
                            <AvatarImage src={assignee.avatar || undefined} />
                            <AvatarFallback 
                            className="text-[10px] text-white" 
                            style={{ backgroundColor: (assignee as any)?.avatarColor || "#6366f1" }}
                            >
                            {assigneeInitials}
                            </AvatarFallback>
                        </Avatar>
                    ) : (
                        <Avatar className="h-6 w-6 border bg-gray-100">
                            <AvatarImage src={undefined} />
                            <AvatarFallback className="text-xs text-gray-700">?</AvatarFallback>
                        </Avatar>
                    )}
                    <span className="text-sm truncate">{assigneeName}</span>
                </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <div className="max-h-48 overflow-y-auto">
              <SelectItem value="null">
                  <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border bg-gray-100">
                          <AvatarImage src={undefined} />
                          <AvatarFallback className="text-xs text-gray-700">?</AvatarFallback>
                      </Avatar>
                      <span>Unassigned</span>
                  </div>
              </SelectItem>
              <Separator className="my-1" />
              {assignees.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={a.avatar || undefined} />
                      <AvatarFallback 
                        className="text-xs text-white"
                        style={{ backgroundColor: (a as any).avatarColor   }}
                      >
                        {`${a.firstName?.[0] || ""}${a.lastName?.[0] || ""}` || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      {a.firstName} {a.lastName}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Input
          type="date"
          defaultValue={formatDateForInput(task.endDate)}
          onBlur={e => handleBlur("endDate", e.target.value)}
          className="h-8"
        />
      </div>
      <div>
        <Select 
          value={localPriority} 
          onValueChange={(v: PriorityUI) => {
            setLocalPriority(v) // Update UI immediately
            onUpdate({ priority: v }) // Trigger API
          }}
        >
          <SelectTrigger className="h-8">
            <div
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                priorityStyles[localPriority] || priorityStyles[task.priority]
              )}
            >
              <span className={cn("mr-2 h-2 w-2 rounded-full", priorityDot[localPriority] || priorityDot[task.priority])} />
              {localPriority}
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
      <div>
        <Input
          className={cellInput}
          type="number"
          value={localPoints ?? ""}
          onChange={e =>
             setLocalPoints(e.target.value === "" ? null : parseInt(e.target.value))
          }
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
      <div className="flex items-center justify-end gap-2 pr-2">
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
