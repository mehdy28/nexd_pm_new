"use client"

import { PersonalKanbanBoard } from "@/components/board/personal/personal-kanban-board"
import { useMyTasksAndSections, SectionUI, TaskUI, PriorityUI } from "@/hooks/personal/useMyTasksAndSections"
import { usePersonalTaskmutations } from "@/hooks/personal/usePersonalTaskMutations"
import { useMemo, useCallback, useState } from "react" // Import useState
import { Column } from "@/components/board/kanban-types"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"
import { Priority as PrismaPriority, TaskStatus as PrismaTaskStatus } from "@prisma/client"

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
    isCreatingSection, // *** CHANGE HERE: Get the new loading state. ***
  } = useMyTasksAndSections()

  const { createTask, updateTask, deleteTask } = usePersonalTaskmutations()

  // FIX: State to track the specific card being mutated for a granular loading UI
  const [mutatingCardId, setMutatingCardId] = useState<string | null>(null)

  const initialColumns = useMemo(() => {
    return mapSectionsToColumns(personalSections)
  }, [personalSections])

  const handleCreateColumn = useCallback(
    async (title: string) => {
      try {
        await createSection(title)
      } catch (err) {
        console.error("Failed to create personal section:", err)
      }
    },
    [createSection]
  )

  const handleUpdateColumn = useCallback(
    async (columnId: string, title: string) => {
      try {
        await updateSection(columnId, title)
      } catch (err) {
        console.error("Failed to update personal section:", err)
      }
    },
    [updateSection]
  )

  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      try {
        await deleteSection(columnId, { deleteTasks: true, reassignToSectionId: null })
      } catch (err) {
        console.error("Failed to delete personal section:", err)
      }
    },
    [deleteSection]
  )

  const handleCreateCard = useCallback(
    async (columnId: string, title: string, description?: string) => {
      try {
        await createTask(columnId, {
          title,
          description,
          priority: "MEDIUM" as any,
          status: "TODO",
        })
      } catch (err) {
        console.error("Failed to create personal task:", err)
      }
    },
    [createTask]
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

      // FIX: Set the specific card as mutating and clear it when done
      setMutatingCardId(cardId)
      try {
        await updateTask(cardId, columnId, mutationInput)
      } catch (err) {
        console.error("Failed to update personal task:", err)
      } finally {
        setMutatingCardId(null)
      }
    },
    [updateTask]
  )

  const handleDeleteCard = useCallback(
    async (columnId: string, cardId: string) => {
      // FIX: Set the specific card as mutating and clear it when done
      setMutatingCardId(cardId)
      try {
        await deleteTask(cardId, columnId)
      } catch (err) {
        console.error("Failed to delete personal task:", err)
      } finally {
        setMutatingCardId(null)
      }
    },
    [deleteTask]
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
        console.error("Column reorder mutation failed:", err)
      }
    },
    [reorderSections]
  )

  if (loading && !personalSections?.length) {
    return <LoadingPlaceholder message="Loading your board..." />
  }

  if (error) {
    return <ErrorPlaceholder error={error} onRetry={refetchMyTasksAndSections} />
  }

  // FIX: The board itself is only mutating during reordering operations now.
  const isBoardMutating = isReordering

  return (
    <PersonalKanbanBoard
      initialColumns={initialColumns}
      onColumnsChange={handleColumnsOrderChange}
      onCreateColumn={handleCreateColumn}
      onUpdateColumn={handleUpdateColumn}
      onDeleteColumn={handleDeleteColumn}
      onCreateCard={handleCreateCard}
      onUpdateCard={handleUpdateCard}
      onDeleteCard={handleDeleteCard}
      isMutating={isBoardMutating}
      isCreatingColumn={isCreatingSection} // *** CHANGE HERE: Pass the new prop down. ***
      // You would also need to pass mutatingCardId down and handle it in child components
      // for per-card loading indicators. This change stops the global button from loading.
    />
  )
}