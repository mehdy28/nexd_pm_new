"use client"

import { KanbanBoard } from "@/components/board/kanban-board"
import { useProjectTasksAndSections, SectionUI, TaskUI, PriorityUI } from "@/hooks/useProjectTasksAndSections"
import { useProjectTaskMutations } from "@/hooks/useProjectTaskMutations"
import { useMemo, useCallback, useEffect, useState } from "react"
import { Column } from "@/components/board/kanban-types"
import { Priority as PrismaPriority, TaskStatus as PrismaTaskStatus } from "@prisma/client"
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"

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
      assignee: task.assignee,
      completed: task.completed,
      editing: false,
    })),
  }))
}

export function BoardView({ projectId }: BoardViewProps) {
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
    reorderSections, // <-- Destructured the new function from the hook
    isReordering, // <-- Destructured its loading state
    defaultSelectedSprintId: fetchedDefaultSprintId,
  } = useProjectTasksAndSections(projectId || "", currentSprintId)

  useEffect(() => {
    if (currentSprintId === undefined && fetchedDefaultSprintId) {
      setCurrentSprintId(fetchedDefaultSprintId)
    }
  }, [fetchedDefaultSprintId, currentSprintId])

  const { createTask, updateTask, deleteTask, isTaskMutating } = useProjectTaskMutations(
    projectId || "",
    currentSprintId
  )

  const initialColumns = useMemo(() => {
    if (loading || error || !fetchedSections) {
      return []
    }
    return mapSectionsToColumns(fetchedSections)
  }, [fetchedSections, loading, error])

  const availableAssignees: UserAvatarPartial[] = useMemo(() => {
    return projectMembers.map(member => ({
      id: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatar: member.user.avatar,
    }))
  }, [projectMembers])

  const handleCreateColumn = useCallback(
    async (title: string) => {
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
      try {
        await updateSection(columnId, title)
      } catch (err) {
        console.error("Failed to update section:", err)
      }
    },
    [updateSection]
  )

  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      try {
        await deleteSection(columnId, { deleteTasks: true })
      } catch (err) {
        console.error("Failed to delete section:", err)
      }
    },
    [deleteSection]
  )

  const handleCreateCard = useCallback(
    async (columnId: string, title: string, description?: string, assigneeId?: string | null) => {
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
      const mutationInput: any = { id: cardId }

      if (updates.title !== undefined) mutationInput.title = updates.title
      if (updates.description !== undefined) mutationInput.description = updates.description
      if (updates.priority !== undefined) mutationInput.priority = mapPriorityToPrisma(updates.priority)
      if (updates.points !== undefined) mutationInput.points = updates.points
      if (updates.due !== undefined) mutationInput.dueDate = updates.due
      if (updates.assignee !== undefined) mutationInput.assigneeId = updates.assignee?.id || null
      if (updates.completed !== undefined) mutationInput.status = mapCompletedToPrismaStatus(updates.completed)
      // Pass sectionId if card is moved to a new column
      if (updates.sectionId) mutationInput.sectionId = updates.sectionId

      try {
        await updateTask(cardId, mutationInput)
      } catch (err) {
        console.error("Failed to update task:", err)
      }
    },
    [updateTask]
  )

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      try {
        await deleteTask(cardId)
      } catch (err) {
        console.error("Failed to delete task:", err)
      }
    },
    [deleteTask]
  )

  const handleColumnsOrderChange = useCallback(
    async (newColumns: Column[]) => {
      if (!reorderSections) return

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

  const handleSprintChange = useCallback((sprintId: string | undefined) => {
    setCurrentSprintId(sprintId)
  }, [])

  if (loading && !fetchedSections?.length) {
    return <LoadingPlaceholder message="Loading project board..." />
  }

  if (error) {
    return <ErrorPlaceholder error={error} onRetry={refetchProjectTasksAndSections} />
  }

  const isMutating = isTaskMutating || isReordering

  return (
    <KanbanBoard
      projectId={projectId}
      initialColumns={initialColumns}
      sprintOptions={sprintFilterOptions}
      currentSprintId={currentSprintId}
      onSprintChange={handleSprintChange}
      onColumnsChange={handleColumnsOrderChange}
      onCreateColumn={handleCreateColumn}
      onUpdateColumn={handleUpdateColumn}
      onDeleteColumn={handleDeleteColumn}
      onCreateCard={handleCreateCard}
      onUpdateCard={handleUpdateCard}
      onDeleteCard={handleDeleteCard}
      availableAssignees={availableAssignees}
      isMutating={isMutating}
    />
  )
}