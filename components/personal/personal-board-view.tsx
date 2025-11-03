// components/tasks/personal-board-view.tsx
"use client"

import { PersonalKanbanBoard } from "@/components/board/personal/personal-kanban-board"
import { useMyTasksAndSections, SectionUI, TaskUI, PriorityUI } from "@/hooks/personal/useMyTasksAndSections"
import { usePersonalTaskmutations } from "@/hooks/personal/usePersonalTaskMutations"
import { useMemo, useCallback } from "react"
import { Column } from "@/components/board/kanban-types"
import { Loader2 } from "lucide-react"
import { Priority as PrismaPriority, TaskStatus as PrismaTaskStatus } from "@prisma/client"

const mapPriorityToPrisma = (priority: PriorityUI): PrismaPriority => {
  switch (priority) {
    case "Low":
      return "LOW"
    case "Medium":
      return "MEDIUM"
    case "High":
      return "HIGH"
  }
}

const mapCompletedToPrismaStatus = (completed: boolean): PrismaTaskStatus => {
  return completed ? "DONE" : "TODO"
}

const mapSectionsToColumns = (sections: SectionUI[]): Column[] => {
  return sections.map(section => ({
    id: section.id,
    title: section.title,
    editing: section.editing || false,
    cards: section.tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due: task.due,
      points: task.points,
      assignee: null, // Personal tasks have no assignee
      completed: task.completed,
      editing: false,
    })),
  }))
}

export function PersonalBoardView() {
  const {
    personalSections: fetchedSections,
    loading,
    error,
    refetchMyTasksAndSections,
    createSection,
    updateSection,
    deleteSection,
  } = useMyTasksAndSections()

  const {
    createTask,
    updateTask,
    deleteTask,
    isTaskMutating,
  } = usePersonalTaskmutations()

  const initialColumns = useMemo(() => {
    if (loading || error || !fetchedSections) {
      return []
    }
    return mapSectionsToColumns(fetchedSections)
  }, [fetchedSections, loading, error])

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
        // For simplicity, personal sections delete their tasks.
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
          priority: "Medium" as any, // Cast because the input type might be stricter
          status: "TODO",
        })
      } catch (err) {
        console.error("Failed to create personal task:", err)
      }
    },
    [createTask]
  )

  const handleUpdateCard = useCallback(
    async (columnId: string, cardId: string, updates: Partial<TaskUI>) => {
      const mutationInput: any = { id: cardId }

      if (updates.title !== undefined) mutationInput.title = updates.title
      if (updates.description !== undefined) mutationInput.description = updates.description
      if (updates.priority !== undefined) mutationInput.priority = mapPriorityToPrisma(updates.priority)
      if (updates.points !== undefined) mutationInput.points = updates.points
      if (updates.due !== undefined) mutationInput.dueDate = updates.due
      if (updates.completed !== undefined) mutationInput.status = mapCompletedToPrismaStatus(updates.completed)
      // If the card is moved to a new column
      if (columnId) mutationInput.personalSectionId = columnId

      try {
        await updateTask(cardId, mutationInput)
      } catch (err) {
        console.error("Failed to update personal task:", err)
      }
    },
    [updateTask]
  )

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      try {
        await deleteTask(cardId)
      } catch (err) {
        console.error("Failed to delete personal task:", err)
      }
    },
    [deleteTask]
  )

  const handleColumnsOrderChange = useCallback(
    async (newColumns: Column[]) => {
      // Re-ordering logic for personal sections would go here.
      // For now, we just refetch to get the latest state from the server,
      // as the backend doesn't support re-ordering in this implementation.
      refetchMyTasksAndSections()
    },
    [refetchMyTasksAndSections]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        <span className="ml-2 text-lg text-slate-700">Loading your board...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-700">Error loading your tasks: {error.message}</div>
    )
  }

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
      isMutating={isTaskMutating}
    />
  )
}