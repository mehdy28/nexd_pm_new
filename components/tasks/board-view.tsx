//components/tasks/board-view.tsx
"use client"

import { KanbanBoard } from "@/components/board/kanban-boardV2"
import { useProjectTasksAndSections, SectionUI, TaskUI, PriorityUI } from "@/hooks/useProjectTasksAndSections"
import { useProjectTaskMutations } from "@/hooks/useProjectTaskMutationsNew"
import { useMemo, useCallback, useEffect, useState, useRef } from "react"
import { Column } from "@/components/board/kanban-types"
import { Priority as PrismaPriority, TaskStatus as PrismaTaskStatus } from "@prisma/client"
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface BoardViewProps {
  projectId?: string
}

const mapPriorityToPrisma = (priority: PriorityUI): PrismaPriority => {
  switch (priority) {
    case "LOW":
      return "LOW"
    case "MEDIUM":
      return "MEDIUM"
    case "HIGH":
      return "HIGH"
  }
}

const mapCompletedToPrismaStatus = (completed: boolean): PrismaTaskStatus => {
  return completed ? "DONE" : "TODO"
}

const mapSectionsToColumns = (sections: SectionUI[]): Column[] => {
  console.groupCollapsed("[BoardView] Mapping sections to columns")
  console.log("Input (sections from hook):", sections)
  if (!sections) {
    console.log("Sections are null/undefined, returning empty array.")
    console.groupEnd()
    return []
  }
  const columns = sections.map(section => ({
    id: section.id,
    title: section.title,
    editing: section.editing || false,
    cards: section.tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description ?? undefined,
      priority: task.priority,
      endDate: task.endDate,
      startDate: undefined, // Project tasks in this view don't have a start date
      points: task.points ?? 0,
      assignee: task.assignee,
      completed: task.completed,
      editing: false,
    })),
  }))
  console.log("Output (columns for KanbanBoard):", columns)
  console.groupEnd()
  return columns
}

export function BoardView({ projectId }: BoardViewProps) {
  console.log(`[BoardView] Component Render/Re-render. Project ID: ${projectId}`)
  const [currentSprintId, setCurrentSprintId] = useState<string | undefined>(undefined)

  const {
    sprintFilterOptions,
    sections: fetchedSections,
    loading,
    error,
    refetchProjectTasksAndSections,
    projectMembers,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    isReordering,
    isCreatingSection,
    defaultSelectedSprintId: fetchedDefaultSprintId,
  } = useProjectTasksAndSections(projectId || "", currentSprintId)

  console.groupCollapsed("[BoardView] Data from useProjectTasksAndSections hook")
  console.log("Loading State:", loading)
  console.log("Error State:", error)
  console.log("Fetched Sections:", fetchedSections)
  console.log("Sprint Filter Options:", sprintFilterOptions)
  console.log("Project Members:", projectMembers)
  console.log("Fetched Default Sprint ID:", fetchedDefaultSprintId)
  console.log("Is Reordering:", isReordering)
  console.log("Is Creating Section:", isCreatingSection)
  console.groupEnd()

  useEffect(() => {
    console.groupCollapsed("[BoardView] Default Sprint ID Effect")
    console.log("Current Sprint ID (before effect):", currentSprintId)
    console.log("Fetched Default Sprint ID:", fetchedDefaultSprintId)
    if (currentSprintId === undefined && fetchedDefaultSprintId) {
      console.log("Setting currentSprintId to the fetched default:", fetchedDefaultSprintId)
      setCurrentSprintId(fetchedDefaultSprintId)
    } else {
      console.log("Condition not met, no change to currentSprintId.")
    }
    console.groupEnd()
  }, [fetchedDefaultSprintId, currentSprintId])

  const { createTask, updateTask, deleteTask } = useProjectTaskMutations(projectId || "", currentSprintId)
  console.log(`[BoardView] Initialized useProjectTaskMutations for Project: ${projectId}, Sprint: ${currentSprintId}`)

  const [mutatingCardId, setMutatingCardId] = useState<string | null>(null)
  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<SectionUI | null>(null)
  const [deleteTasksConfirmed, setDeleteTasksConfirmed] = useState(false)
  const [reassignToSectionOption, setReassignToSectionOption] = useState<string | null>(null)
  const [isSectionMutating, setIsSectionMutating] = useState(false)
  const customModalRef = useRef<HTMLDivElement>(null)

  const initialColumns = useMemo(() => {
    return mapSectionsToColumns(fetchedSections)
  }, [fetchedSections])

  const availableAssignees: UserAvatarPartial[] = useMemo(() => {
    console.groupCollapsed("[BoardView] Memoizing available assignees")
    console.log("Input (projectMembers):", projectMembers)
    const assignees = projectMembers.map(member => ({
      id: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatar: member.user.avatar,
      // Source of color: Extracting it from the projectMembers hook data
      avatarColor: (member.user as any).avatarColor, 
    }))
    console.log("Output (availableAssignees):", assignees)
    console.groupEnd()
    return assignees
  }, [projectMembers])

  const handleCreateColumn = useCallback(
    async (title: string) => {
      console.log(`[BoardView] handleCreateColumn called with title: '${title}'`)
      if (!projectId) return
      try {
        await createSection(title)
      } catch (err) {
        console.error("Failed to create section:", err)
      }
    },
    [projectId, createSection]
  )

  const handleUpdateColumn = useCallback(
    async (columnId: string, title: string) => {
      console.log(`[BoardView] handleUpdateColumn called for ID: ${columnId}, new title: '${title}'`)
      try {
        await updateSection(columnId, title)
      } catch (err) {
        console.error("Failed to update section:", err)
      }
    },
    [updateSection]
  )

  const handleOpenDeleteSectionModal = useCallback(
    (columnId: string) => {
      const section = fetchedSections.find(s => s.id === columnId)
      if (!section) return

      setSectionToDelete(section)
      setDeleteTasksConfirmed(false)
      const availableOtherSections = fetchedSections.filter(s => s.id !== section.id)
      const reassignTarget = availableOtherSections[0]?.id || null
      setReassignToSectionOption(reassignTarget)
      setDeleteSectionModalOpen(true)
    },
    [fetchedSections]
  )

  const handleConfirmDeleteSection = useCallback(async () => {
    if (!sectionToDelete) {
      return
    }
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
      const deleteOptions = {
        deleteTasks: hasTasks ? deleteTasksConfirmed : true,
        reassignToSectionId: reassignId,
      }
      await deleteSection(sectionToDelete.id, deleteOptions)
    } catch (err) {
      console.error("Failed to delete section:", err)
    } finally {
      setIsSectionMutating(false)
      setDeleteSectionModalOpen(false)
      setSectionToDelete(null)
    }
  }, [sectionToDelete, deleteTasksConfirmed, reassignToSectionOption, deleteSection])

  const handleCreateCard = useCallback(
    async (columnId: string, title: string, description?: string, assigneeId?: string | null) => {
      console.groupCollapsed("[BoardView] handleCreateCard called")
      console.log("Column ID:", columnId)
      console.log("Title:", title)
      console.log("Description:", description)
      console.log("Assignee ID:", assigneeId)
      console.log("Current Sprint ID for new task:", currentSprintId)
      console.groupEnd()

      if (!projectId) return
      try {
        await createTask(columnId, {
          title,
          description,
          assigneeId: assigneeId ?? null,
          priority: "MEDIUM",
          status: "TODO",
          sprintId: currentSprintId,
        })
      } catch (err) {
        console.error("Failed to create task:", err)
      }
    },
    [projectId, createTask, currentSprintId]
  )

  const handleUpdateCard = useCallback(
    async (columnId: string, cardId: string, updates: Partial<TaskUI & { sectionId?: string }>) => {
      console.groupCollapsed("[BoardView] handleUpdateCard called")
      console.log("Original Column ID:", columnId)
      console.log("Card ID:", cardId)
      console.log("Received Updates object:", updates)

      const mutationInput: any = {} // Don't add ID here, updateTask hook does that

      if (updates.title !== undefined) mutationInput.title = updates.title
      if (updates.description !== undefined) mutationInput.description = updates.description
      if (updates.priority !== undefined) mutationInput.priority = mapPriorityToPrisma(updates.priority)
      if (updates.points !== undefined) mutationInput.points = updates.points
      if (updates.endDate !== undefined) mutationInput.endDate = updates.endDate
      if (updates.assignee !== undefined) mutationInput.assigneeId = updates.assignee?.id || null
      if (updates.completed !== undefined) mutationInput.status = mapCompletedToPrismaStatus(updates.completed)
      if (updates.sectionId) mutationInput.sectionId = updates.sectionId

      console.log("Constructed Mutation Input:", mutationInput)
      console.groupEnd()

      setMutatingCardId(cardId)
      try {
        await updateTask(cardId, columnId, mutationInput)
      } catch (err) {
        console.error("Failed to update task:", err)
      } finally {
        setMutatingCardId(null)
      }
    },
    [updateTask]
  )

  const handleDeleteCard = useCallback(
    async (columnId: string, cardId: string) => {
      console.log(`[BoardView] handleDeleteCard called for Card ID: ${cardId} in Column ID: ${columnId}`)
      setMutatingCardId(cardId)
      try {
        await deleteTask(cardId, columnId)
      } catch (err) {
        console.error("Failed to delete task:", err)
      } finally {
        setMutatingCardId(null)
      }
    },
    [deleteTask]
  )

  const handleColumnsOrderChange = useCallback(
    async (newColumns: Column[]) => {
      console.groupCollapsed("[BoardView] handleColumnsOrderChange called")
      console.log("Received new columns order from board:", newColumns)
      const sectionsWithNewOrder = newColumns.map((col, index) => ({
        id: col.id,
        order: index,
      }))
      console.log("Data prepared for reorderSections mutation:", sectionsWithNewOrder)
      console.groupEnd()

      try {
        await reorderSections(sectionsWithNewOrder)
      } catch (err) {
        console.error("Column reorder mutation failed:", err)
      }
    },
    [reorderSections]
  )

  const handleSprintChange = useCallback((sprintId: string | undefined) => {
    console.log(`[BoardView] handleSprintChange called. New sprint ID: ${sprintId}`)
    setCurrentSprintId(sprintId)
  }, [])

  useEffect(() => {
    if (deleteSectionModalOpen && customModalRef.current) customModalRef.current.focus()
  }, [deleteSectionModalOpen])

  const otherSections = useMemo(
    () => fetchedSections.filter(s => s.id !== sectionToDelete?.id),
    [fetchedSections, sectionToDelete]
  )

  if (loading && !fetchedSections?.length) {
    console.log("[BoardView] Render: Showing LoadingPlaceholder")
    return <LoadingPlaceholder message="Loading project board..." />
  }

  if (error) {
    console.log("[BoardView] Render: Showing ErrorPlaceholder", error)
    return <ErrorPlaceholder error={error} onRetry={refetchProjectTasksAndSections} />
  }

  const isBoardMutating = isReordering

  console.log("[BoardView] Render: Rendering KanbanBoard with props:", {
    projectId,
    initialColumns,
    sprintFilterOptions,
    currentSprintId,
    availableAssignees,
    isBoardMutating,
    isCreatingSection,
    mutatingCardId,
  })

  return (
    <>
      <KanbanBoard
        projectId={projectId}
        initialColumns={initialColumns}
        sprintOptions={sprintFilterOptions}
        currentSprintId={currentSprintId}
        onSprintChange={handleSprintChange}
        onColumnsChange={handleColumnsOrderChange}
        onCreateColumn={handleCreateColumn}
        onUpdateColumn={handleUpdateColumn}
        onDeleteColumn={handleOpenDeleteSectionModal}
        onCreateCard={handleCreateCard}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
        availableAssignees={availableAssignees}
        isMutating={isBoardMutating}
        isCreatingColumn={isCreatingSection}
        // mutatingCardId={mutatingCardId}
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
                className="mt-2 bg-[#4ab5ae] text-white hover:bg-[#419d97] sm:mt-0"
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
    </>
  )
}
