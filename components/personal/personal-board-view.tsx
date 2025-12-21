"use client"

import { PersonalKanbanBoard } from "@/components/board/personal/personal-kanban-board"
import { useMyTasksAndSections, SectionUI, TaskUI, PriorityUI } from "@/hooks/personal/useMyTasksAndSections"
import { usePersonalTaskmutations } from "@/hooks/personal/usePersonalTaskMutations"
import { useMemo, useCallback, useState, useRef, useEffect } from "react"
import { Column } from "@/components/board/kanban-types"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
import { Priority as PrismaPriority, TaskStatus as PrismaTaskStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { CustomToast, ToastType } from "@/components/ui/custom-toast"

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
  if (!sections) return []
  return sections.map(section => ({
    id: section.id,
    title: section.title,
    editing: section.editing || false,
    cards: section.tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description ?? undefined,
      priority: task.priority,
      endDate: task.endDate,
      startDate: task.startDate,
      points: task.points ?? 0,
      assignee: null,
      completed: task.completed,
      editing: false,
    })),
  }))
}

export function PersonalBoardView() {
  const {
    personalSections,
    loading,
    error,
    refetchMyTasksAndSections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    isReordering,
    isCreatingSection,
  } = useMyTasksAndSections()

  const { createTask, updateTask, deleteTask } = usePersonalTaskmutations()

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [mutatingCardId, setMutatingCardId] = useState<string | null>(null)
  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<SectionUI | null>(null)
  const [deleteTasksConfirmed, setDeleteTasksConfirmed] = useState(false)
  const [reassignToSectionOption, setReassignToSectionOption] = useState<string | null>(null)
  const [isSectionMutating, setIsSectionMutating] = useState(false)
  const customModalRef = useRef<HTMLDivElement>(null)

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

  const initialColumns = useMemo(() => {
    return mapSectionsToColumns(personalSections)
  }, [personalSections])

  const handleCreateColumn = useCallback(
    async (title: string) => {
      try {
        await createSection(title)
        showToast("Section created", "success")
      } catch (err) {
        showToast("Failed to create section", "error")
      }
    },
    [createSection, showToast]
  )

  const handleUpdateColumn = useCallback(
    async (columnId: string, title: string) => {
      try {
        await updateSection(columnId, title)
        showToast("Section updated", "success")
      } catch (err) {
        showToast("Failed to update section", "error")
      }
    },
    [updateSection, showToast]
  )

  const handleOpenDeleteSectionModal = useCallback(
    (columnId: string) => {
      const section = personalSections.find(s => s.id === columnId)
      if (!section) return

      setSectionToDelete(section)
      setDeleteTasksConfirmed(false)
      const availableOtherSections = personalSections.filter(s => s.id !== section.id)
      const reassignTarget = availableOtherSections[0]?.id || null
      setReassignToSectionOption(reassignTarget)
      setDeleteSectionModalOpen(true)
    },
    [personalSections]
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
      showToast("Section deleted", "success")
    } catch (err) {
      showToast("Failed to delete section", "error")
    } finally {
      setIsSectionMutating(false)
      setDeleteSectionModalOpen(false)
      setSectionToDelete(null)
    }
  }, [sectionToDelete, deleteTasksConfirmed, reassignToSectionOption, deleteSection, showToast])

  const handleCreateCard = useCallback(
    async (columnId: string, title: string, description?: string) => {
      try {
        await createTask(columnId, {
          title,
          description,
          priority: "MEDIUM" as any,
          status: "TODO",
        })
        showToast("Task created", "success")
      } catch (err) {
        showToast("Failed to create task", "error")
      }
    },
    [createTask, showToast]
  )

  const handleUpdateCard = useCallback(
    async (columnId: string, cardId: string, updates: Partial<TaskUI & { personalSectionId?: string }>) => {
      const mutationInput: any = {}

      if (updates.title !== undefined) mutationInput.title = updates.title
      if (updates.description !== undefined) mutationInput.description = updates.description
      if (updates.priority !== undefined) mutationInput.priority = mapPriorityToPrisma(updates.priority)
      if (updates.points !== undefined) mutationInput.points = updates.points
      if (updates.endDate !== undefined) mutationInput.endDate = updates.endDate
      if (updates.startDate !== undefined) mutationInput.startDate = updates.startDate
      if (updates.completed !== undefined) mutationInput.status = mapCompletedToPrismaStatus(updates.completed)
      if (updates.personalSectionId) mutationInput.personalSectionId = updates.personalSectionId

      setMutatingCardId(cardId)
      try {
        await updateTask(cardId, columnId, mutationInput)
        showToast("Task updated", "success")
      } catch (err) {
        showToast("Failed to update task", "error")
      } finally {
        setMutatingCardId(null)
      }
    },
    [updateTask, showToast]
  )

  const handleDeleteCard = useCallback(
    async (columnId: string, cardId: string) => {
      setMutatingCardId(cardId)
      try {
        await deleteTask(cardId, columnId)
        showToast("Task deleted", "success")
      } catch (err) {
        showToast("Failed to delete task", "error")
      } finally {
        setMutatingCardId(null)
      }
    },
    [deleteTask, showToast]
  )

  const handleColumnsOrderChange = useCallback(
    async (newColumns: Column[]) => {
      const sectionsWithNewOrder = newColumns.map((col, index) => ({
        id: col.id,
        order: index,
      }))

      try {
        await reorderSections(sectionsWithNewOrder)
      } catch (err) {
        showToast("Failed to reorder sections", "error")
      }
    },
    [reorderSections, showToast]
  )

  useEffect(() => {
    if (deleteSectionModalOpen && customModalRef.current) customModalRef.current.focus()
  }, [deleteSectionModalOpen])

  const otherSections = useMemo(
    () => personalSections.filter(s => s.id !== sectionToDelete?.id),
    [personalSections, sectionToDelete]
  )

  if (loading && !personalSections?.length) {
    return <LoadingPlaceholder message="Loading your board..." />
  }

  if (error) {
    return <ErrorPlaceholder error={error} onRetry={refetchMyTasksAndSections} />
  }

  const isBoardMutating = isReordering

  return (
    <div className="h-full relative">
      {toast && (
        <CustomToast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <PersonalKanbanBoard
        initialColumns={initialColumns}
        onColumnsChange={handleColumnsOrderChange}
        onCreateColumn={handleCreateColumn}
        onUpdateColumn={handleUpdateColumn}
        onDeleteColumn={handleOpenDeleteSectionModal}
        onCreateCard={handleCreateCard}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
        isMutating={isBoardMutating}
        isCreatingColumn={isCreatingSection}
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
    </div>
  )
}