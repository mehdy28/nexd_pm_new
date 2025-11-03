import { useMutation } from "@apollo/client"
import { useCallback } from "react"
import {
  CREATE_PERSONAL_GANTT_TASK_MUTATION,
  UPDATE_PERSONAL_GANTT_TASK_MUTATION,
  UPDATE_PERSONAL_SECTION_MUTATION,
} from "@/graphql/mutations/personal/personalGanttMutations"

import { GET_MY_GANTT_DATA_QUERY } from "@/graphql/queries/personal/getMyGanttData"

// --- Input Interfaces for Mutations ---
interface CreatePersonalGanttTaskVariables {
  input: {
    personalSectionId: string
    name: string
    description?: string | null
    startDate: string // ISO string
    endDate: string // ISO string
    progress?: number | null
    type: "task" // Personal Gantt only supports 'task' type
  }
}

interface UpdatePersonalGanttTaskVariables {
  input: {
    id: string // ID of the original Task
    type: "TASK" // Prisma model name
    name?: string | null
    description?: string | null
    startDate?: string | null
    endDate?: string | null
    progress?: number | null
  }
}

interface UpdatePersonalSectionVariables {
  input: {
    id: string
    name?: string | null
  }
}

// --- Main Hook ---
export function usePersonalGanttMutations() {
  const getGanttrefetchQueries = useCallback(() => {
    return [{ query: GET_MY_GANTT_DATA_QUERY }]
  }, [])

  // --- Apollo useMutation Hooks ---
  const [createGanttTaskMutation, { loading: createGanttTaskLoading, error: createGanttTaskError }] =
    useMutation<{ createPersonalGanttTask: any }, CreatePersonalGanttTaskVariables>(
      CREATE_PERSONAL_GANTT_TASK_MUTATION,
      { refetchQueries: getGanttrefetchQueries }
    )

  const [updateGanttTaskMutation, { loading: updateGanttTaskLoading, error: updateGanttTaskError }] =
    useMutation<any, UpdatePersonalGanttTaskVariables>(UPDATE_PERSONAL_GANTT_TASK_MUTATION, {
      refetchQueries: getGanttrefetchQueries,
    })

  const [updateSectionMutation, { loading: updateSectionLoading, error: updateSectionError }] = useMutation<
    { updatePersonalSection: any },
    UpdatePersonalSectionVariables
  >(UPDATE_PERSONAL_SECTION_MUTATION, { refetchQueries: getGanttrefetchQueries })

  // --- Exposed Functions ---

  const createPersonalGanttTask = useCallback(
    async (input: CreatePersonalGanttTaskVariables["input"]): Promise<any> => {
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
        return response.data?.createPersonalGanttTask
      } catch (err: any) {
        throw err
      }
    },
    [createGanttTaskMutation]
  )

  const updatePersonalGanttTask = useCallback(
    async (input: UpdatePersonalGanttTaskVariables["input"]): Promise<any> => {
      try {
        const response = await updateGanttTaskMutation({
          variables: { input },
        })
        return response.data?.updatePersonalGanttTask
      } catch (err: any) {
        throw err
      }
    },
    [updateGanttTaskMutation]
  )

  const updatePersonalSectionName = useCallback(
    async (sectionId: string, name: string): Promise<any> => {
      try {
        const response = await updateSectionMutation({
          variables: {
            input: {
              id: sectionId,
              name: name,
            },
          },
        })
        return response.data?.updatePersonalSection
      } catch (err: any) {
        throw err
      }
    },
    [updateSectionMutation]
  )

  return {
    createPersonalGanttTask,
    updatePersonalGanttTask,
    updatePersonalSectionName,
    isMutating: createGanttTaskLoading || updateGanttTaskLoading || updateSectionLoading,
    mutationError: createGanttTaskError || updateGanttTaskError || updateSectionError,
  }
}