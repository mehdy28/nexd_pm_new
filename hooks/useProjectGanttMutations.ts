import { useMutation, ApolloCache } from "@apollo/client"
import { useCallback } from "react"
import { GET_GANTT_DATA_QUERY } from "@/graphql/queries/getGanttData"
import {
  CREATE_GANTT_TASK_MUTATION,
  UPDATE_GANTT_TASK_MUTATION,
} from "@/graphql/mutations/ganttMutations"
import { GanttDataResponse, CustomGanttTask } from "./useGanttData"
import   { DELETE_PROJECT_TASK_MUTATION } from  "@/graphql/mutations/deleteProjectTask"



// --- Input Interfaces for Mutations ---
interface CreateGanttTaskVariables {
  input: {
    projectId: string
    sprintId: string
    name: string
    description?: string | null
    startDate: string // ISO string
    endDate: string // ISO string
    progress?: number | null
    type: "task" | "milestone"
  }
}

interface UpdateGanttTaskVariables {
  input: {
    id: string // ID of the original Task or Milestone
    type: "TASK" | "MILESTONE"
    name?: string | null
    description?: string | null
    startDate?: string | null
    endDate?: string | null
    progress?: number | null
    displayOrder?: number | null
  }
}

// --- Main Hook ---
export function useProjectGanttMutations(projectId: string, currentSelectedSprintId?: string | null) {
  const [createGanttTaskMutation, { loading: createLoading, error: createError }] = useMutation(
    CREATE_GANTT_TASK_MUTATION,
    {
      update(cache: ApolloCache<any>, { data: { createGanttTask: newTask } }) {
        if (!newTask) return

        const queryOptions = {
          query: GET_GANTT_DATA_QUERY,
          variables: { projectId, sprintId: currentSelectedSprintId || null },
        }

        const existingData = cache.readQuery<GanttDataResponse>(queryOptions)

        if (existingData && existingData.getGanttData) {
          cache.writeQuery({
            ...queryOptions,
            data: {
              getGanttData: {
                ...existingData.getGanttData,
                tasks: [...existingData.getGanttData.tasks, newTask],
              },
            },
          })
        }
      },
    }
  )

  const [updateGanttTaskMutation, { loading: updateLoading, error: updateError }] = useMutation<
    any,
    UpdateGanttTaskVariables
  >(UPDATE_GANTT_TASK_MUTATION)

  const [deleteTaskMutation, { loading: deleteLoading, error: deleteError }] = useMutation(DELETE_PROJECT_TASK_MUTATION, {
    update(cache, { data: { deleteTask: deletedTask } }, { variables }) {
      if (!deletedTask) return

      const taskIdToDelete = variables?.id
      if (!taskIdToDelete) return

      const queryOptions = {
        query: GET_GANTT_DATA_QUERY,
        variables: { projectId, sprintId: currentSelectedSprintId || null },
      }
      const existingData = cache.readQuery<GanttDataResponse>(queryOptions)

      if (existingData && existingData.getGanttData) {
        const updatedTasks = existingData.getGanttData.tasks.filter(
          (task: CustomGanttTask) => task.originalTaskId !== taskIdToDelete
        )
        cache.writeQuery({
          ...queryOptions,
          data: {
            getGanttData: {
              ...existingData.getGanttData,
              tasks: updatedTasks,
            },
          },
        })
      }
    },
  })

  const createGanttTask = useCallback(
    async (input: CreateGanttTaskVariables["input"]): Promise<any> => {
      try {
        const response = await createGanttTaskMutation({
          variables: {
            input: {
              ...input,
              progress: input.progress ?? 0,
              description: input.description ?? null,
            },
          },
        })
        return response.data?.createGanttTask
      } catch (err: any) {
        console.error("useProjectGanttMutations: Failed to create task.", { error: err, input })
        throw err
      }
    },
    [createGanttTaskMutation]
  )

  const updateGanttTask = useCallback(
    async (input: UpdateGanttTaskVariables["input"]): Promise<any> => {
      try {
        const response = await updateGanttTaskMutation({
          variables: { input },
        })
        return response.data?.updateGanttTask
      } catch (err: any) {
        console.error("useProjectGanttMutations: Failed to update task.", { error: err, input })
        throw err
      }
    },
    [updateGanttTaskMutation]
  )

  const deleteTask = useCallback(
    async (taskId: string): Promise<any> => {
      try {
        const optimisticResponse = {
          deleteTask: {
            __typename: "Task",
            id: taskId,
          },
        }
        const response = await deleteTaskMutation({
          variables: { id: taskId },
          optimisticResponse,
        })
        return response.data?.deleteTask
      } catch (err: any) {
        console.error("useProjectGanttMutations: Failed to delete task.", { error: err, taskId })
        throw err
      }
    },
    [deleteTaskMutation]
  )

  return {
    createGanttTask,
    updateGanttTask,
    deleteTask,
    isMutating: createLoading || updateLoading || deleteLoading,
    mutationError: createError || updateError || deleteError,
  }
}