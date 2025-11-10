import { useMutation } from "@apollo/client"
import { useCallback } from "react"
import { CREATE_PERSONAL_TASK_MUTATION } from "@/graphql/mutations/personal/createPersonalTask"
import { UPDATE_PERSONAL_TASK_MUTATION } from "@/graphql/mutations/personal/updatePersonalTask"
import { DELETE_PERSONAL_TASK_MUTATION } from "@/graphql/mutations/personal/deletePersonalTask"
import { GET_MY_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/personal/getMyTasksAndSections"
import { GET_TASK_DETAILS_QUERY } from "@/graphql/queries/getTaskDetails"
import { Priority, TaskStatus } from "@prisma/client"
import { PriorityUI, TaskStatusUI } from "./useMyTasksAndSections"


// --- Mutation Variable Interfaces ---
interface CreatePersonalTaskVariables {
  input: {
    personalSectionId: string
    title: string
    description?: string | null
    status?: TaskStatus
    priority?: Priority
    dueDate?: string | null
    startDate?: string | null
    endDate?: string | null
    points?: number | null
    parentId?: string | null
  }
}

interface UpdatePersonalTaskVariables {
  input: {
    id: string
    title?: string | null
    description?: string | null
    status?: TaskStatus
    priority?: Priority
    dueDate?: string | null
    startDate?: string | null
    endDate?: string | null
    points?: number | null
    parentId?: string | null
  }
}

// --- Helper Functions for Type Mapping ---
const mapPriorityToPrisma = (priority: PriorityUI): Priority => {
  switch (priority) {
    case "LOW":
      return "LOW"
    case "MEDIUM":
      return "MEDIUM"
    case "HIGH":
      return "HIGH"
  }
}

// --- Main Hook ---
export function usePersonalTaskmutations() {
  const getRefetchQueries = useCallback(() => [{ query: GET_MY_TASKS_AND_SECTIONS_QUERY }], [])

  const [createPersonalTaskApolloMutation, { loading: createLoading, error: createError }] =
    useMutation<any, CreatePersonalTaskVariables>(CREATE_PERSONAL_TASK_MUTATION, {
      refetchQueries: getRefetchQueries,
    })

  const [updatePersonalTaskApolloMutation, { loading: updateLoading, error: updateError }] =
    useMutation<any, UpdatePersonalTaskVariables>(UPDATE_PERSONAL_TASK_MUTATION)

  const [deletePersonalTaskApolloMutation, { loading: deleteLoading, error: deleteError }] =
    useMutation<any, { id: string }>(DELETE_PERSONAL_TASK_MUTATION, {
      refetchQueries: getRefetchQueries,
    })

  // --- Exposed Functions ---

  const createTask = useCallback(
    async (
      sectionId: string,
      input: Omit<CreatePersonalTaskVariables["input"], "personalSectionId">
    ) => {
      try {
        const response = await createPersonalTaskApolloMutation({
          variables: {
            input: {
              personalSectionId: sectionId,
              title: input.title,
              description: input.description ?? null,
              status: input.status || "TODO",
              priority: input.priority ? mapPriorityToPrisma(input.priority as PriorityUI) : Priority.MEDIUM,
              dueDate: input.dueDate || null,
              startDate: input.startDate || null,
              endDate: input.endDate || null,
              points: input.points ?? null,
              parentId: input.parentId ?? null,
            },
          },
        })
        return response.data?.createPersonalTask
      } catch (err: any) {
        throw err
      }
    },
    [createPersonalTaskApolloMutation]
  )

  const updateTask = useCallback(
    async (taskId: string, input: Omit<UpdatePersonalTaskVariables["input"], "id">) => {
      const variables: UpdatePersonalTaskVariables["input"] = {
        id: taskId,
      }
      if (input.title !== undefined) variables.title = input.title
      if (input.description !== undefined) variables.description = input.description
      if (input.status !== undefined) variables.status = input.status
      if (input.priority !== undefined) variables.priority = mapPriorityToPrisma(input.priority as PriorityUI)
      if (input.dueDate !== undefined) variables.dueDate = input.dueDate
      if (input.startDate !== undefined) variables.startDate = input.startDate
      if (input.endDate !== undefined) variables.endDate = input.endDate
      if (input.points !== undefined) variables.points = input.points
      if (input.parentId !== undefined) variables.parentId = input.parentId

      try {
        const response = await updatePersonalTaskApolloMutation({
          variables: { input: variables },
          refetchQueries: [
            ...getRefetchQueries(),
            { query: GET_TASK_DETAILS_QUERY, variables: { id: taskId } },
          ],
        })
        return response.data?.updatePersonalTask
      } catch (err: any) {
        throw err
      }
    },
    [updatePersonalTaskApolloMutation, getRefetchQueries]
  )

  const toggleTaskCompleted = useCallback(
    async (taskId: string, currentStatus: TaskStatusUI) => {
      try {
        const newStatus = currentStatus === "DONE" ? "TODO" : "DONE"
        const response = await updatePersonalTaskApolloMutation({
          variables: {
            input: {
              id: taskId,
              status: newStatus,
            },
          },
          refetchQueries: [
            ...getRefetchQueries(),
            { query: GET_TASK_DETAILS_QUERY, variables: { id: taskId } },
          ],
        })
        return response.data?.updatePersonalTask
      } catch (err: any) {
        throw err
      }
    },
    [updatePersonalTaskApolloMutation, getRefetchQueries]
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        const response = await deletePersonalTaskApolloMutation({
          variables: { id: taskId },
        })
        return response.data?.deletePersonalTask
      } catch (err: any) {
        throw err
      }
    },
    [deletePersonalTaskApolloMutation]
  )

  return {
    createTask,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    isTaskMutating: createLoading || updateLoading || deleteLoading,
    taskMutationError: createError || updateError || deleteError,
  }
}