import { useMutation } from "@apollo/client"
import { useCallback } from "react"
import { GET_MY_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/personal/getMyTasksAndSections"
import { CREATE_PERSONAL_SECTION_MUTATION } from "@/graphql/mutations/personal/createPersonalSection"
import { UPDATE_PERSONAL_SECTION_MUTATION } from "@/graphql/mutations/personal/updatePersonalSection"
import { DELETE_PERSONAL_SECTION_MUTATION } from "@/graphql/mutations/personal/deletePersonalSection"
import { CREATE_PERSONAL_TASK_MUTATION } from "@/graphql/mutations/personal/createPersonalTask"
import { UPDATE_PERSONAL_TASK_MUTATION } from "@/graphql/mutations/personal/updatePersonalTask"
import { DELETE_PERSONAL_TASK_MUTATION } from "@/graphql/mutations/personal/deletePersonalTask"
import { Priority, TaskStatus } from "@prisma/client"
import { PriorityUI, TaskStatusUI, TaskUI, SectionUI } from "./useMyTasksAndSections"


// --- Input Interfaces ---
interface CreateSectionVariables {
  name: string
  order?: number | null
}

interface UpdateSectionVariables {
  id: string
  name?: string | null
  order?: number | null
}

interface DeleteSectionVariables {
  id: string
  options: { deleteTasks: boolean; reassignToSectionId?: string | null }
}

interface CreateTaskVariables {
  input: {
    personalSectionId: string
    title: string
    description?: string | null
    status?: TaskStatus
    priority?: Priority
    dueDate?: string | null
    points?: number | null
  }
}

interface UpdateTaskVariables {
  input: {
    id: string
    title?: string | null
    description?: string | null
    status?: TaskStatus
    priority?: Priority
    dueDate?: string | null
    points?: number | null
    personalSectionId?: string | null
  }
}

interface DeleteTaskVariables {
  id: string
}

// --- Helper Functions for Type Mapping ---
const mapPriorityToPrisma = (priority: PriorityUI): Priority => {
  switch (priority) {
    case "Low":
      return "LOW"
    case "Medium":
      return "MEDIUM"
    case "High":
      return "HIGH"
  }
}

const mapTaskStatusToPrisma = (statusUI: TaskStatusUI): TaskStatus => {
  return statusUI as TaskStatus
}

// --- Main Hook for Personal Kanban Board Mutations ---
export function usePersonalKanbanMutations() {
  const getKanbanRefetchQueries = useCallback(() => {
    return [{ query: GET_MY_TASKS_AND_SECTIONS_QUERY }]
  }, [])

  // --- Apollo useMutation Hooks ---

  const [createSectionMutation] = useMutation<
    { createPersonalSection: SectionUI },
    CreateSectionVariables
  >(CREATE_PERSONAL_SECTION_MUTATION, {
    refetchQueries: getKanbanRefetchQueries,
  })

  const [updateSectionMutation] = useMutation<
    { updatePersonalSection: SectionUI },
    UpdateSectionVariables
  >(UPDATE_PERSONAL_SECTION_MUTATION, {
    refetchQueries: getKanbanRefetchQueries,
  })

  const [deleteSectionMutation] = useMutation<
    { deletePersonalSection: SectionUI },
    DeleteSectionVariables
  >(DELETE_PERSONAL_SECTION_MUTATION, {
    refetchQueries: getKanbanRefetchQueries,
  })

  const [createTaskMutation] = useMutation<{ createPersonalTask: TaskUI }, CreateTaskVariables>(
    CREATE_PERSONAL_TASK_MUTATION,
    {
      refetchQueries: getKanbanRefetchQueries,
    }
  )

  const [updateTaskMutation] = useMutation<{ updatePersonalTask: TaskUI }, UpdateTaskVariables>(
    UPDATE_PERSONAL_TASK_MUTATION,
    {
      refetchQueries: getKanbanRefetchQueries,
    }
  )

  const [deleteTaskMutation] = useMutation<
    { deletePersonalTask: { id: string } },
    DeleteTaskVariables
  >(DELETE_PERSONAL_TASK_MUTATION, {
    refetchQueries: getKanbanRefetchQueries,
  })

  // --- Exposed Functions for Kanban Operations ---

  const createColumn = useCallback(
    async (name: string, order?: number | null): Promise<void> => {
      try {
        await createSectionMutation({
          variables: { name, order: order ?? null },
        })
      } catch (err) {
        throw err
      }
    },
    [createSectionMutation]
  )

  const updateColumn = useCallback(
    async (id: string, name?: string | null, order?: number | null): Promise<void> => {
      try {
        await updateSectionMutation({
          variables: { id, name: name ?? null, order: order ?? null },
        })
      } catch (err) {
        throw err
      }
    },
    [updateSectionMutation]
  )

  const deleteColumn = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Personal tasks should always be deleted with their section for simplicity, or reassigned.
        // Defaulting to delete=true simplifies the Kanban UI logic.
        await deleteSectionMutation({
          variables: { id, options: { deleteTasks: true } },
        })
      } catch (err) {
        throw err
      }
    },
    [deleteSectionMutation]
  )

  const createCard = useCallback(
    async (columnId: string, title: string, description?: string): Promise<void> => {
      try {
        await createTaskMutation({
          variables: {
            input: {
              personalSectionId: columnId,
              title,
              description: description || null,
              status: TaskStatus.TODO,
              priority: Priority.MEDIUM,
              points: 0,
            },
          },
        })
      } catch (err) {
        throw err
      }
    },
    [createTaskMutation]
  )

  const updateCard = useCallback(
    async (
      currentSectionId: string,
      cardId: string,
      updates: Partial<TaskUI>
    ): Promise<void> => {
      const variables: UpdateTaskVariables["input"] = {
        id: cardId,
      }
      if (updates.title !== undefined) variables.title = updates.title
      if (updates.description !== undefined) variables.description = updates.description
      if (updates.status !== undefined) variables.status = mapTaskStatusToPrisma(updates.status)
      if (updates.priority !== undefined) variables.priority = mapPriorityToPrisma(updates.priority)
      if (updates.due !== undefined) variables.dueDate = updates.due
      if (updates.points !== undefined) variables.points = updates.points
      if (updates.sectionId !== undefined) variables.personalSectionId = updates.sectionId

      try {
        await updateTaskMutation({
          variables: { input: variables },
        })
      } catch (err) {
        throw err
      }
    },
    [updateTaskMutation]
  )

  const deleteCard = useCallback(
    async (cardId: string): Promise<void> => {
      try {
        await deleteTaskMutation({
          variables: { id: cardId },
        })
      } catch (err) {
        throw err
      }
    },
    [deleteTaskMutation]
  )

  return {
    createColumn,
    updateColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    isMutating:
      createSectionMutation.loading ||
      updateSectionMutation.loading ||
      deleteSectionMutation.loading ||
      createTaskMutation.loading ||
      updateTaskMutation.loading ||
      deleteTaskMutation.loading,
    mutationError:
      createSectionMutation.error ||
      updateSectionMutation.error ||
      deleteSectionMutation.error ||
      createTaskMutation.error ||
      updateTaskMutation.error ||
      deleteTaskMutation.error,
  }
}