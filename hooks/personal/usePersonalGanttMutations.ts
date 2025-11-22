// hooks/personal/usePersonalGanttMutations.ts

import { useMutation, ApolloCache } from "@apollo/client"
import { useCallback } from "react"
import {
  CREATE_PERSONAL_GANTT_TASK_MUTATION,
  UPDATE_PERSONAL_GANTT_TASK_MUTATION,
  UPDATE_PERSONAL_SECTION_MUTATION,
} from "@/graphql/mutations/personal/personalGanttMutations"
import { GET_MY_GANTT_DATA_QUERY } from "@/graphql/queries/personal/getMyGanttData"
import { PersonalGanttDataResponse } from "./usePersonalGanttData"

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
    displayOrder?: number | null
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
  // --- Apollo useMutation Hooks ---
  const [createGanttTaskMutation, { loading: createGanttTaskLoading, error: createGanttTaskError }] = useMutation(
    CREATE_PERSONAL_GANTT_TASK_MUTATION,
    {
      // This `update` function is the key to solving the problem.
      update(cache: ApolloCache<any>, { data: { createPersonalGanttTask: newTask } }) {
        // Read the existing data from the cache for the gantt query.
        const existingData = cache.readQuery<PersonalGanttDataResponse>({
          query: GET_MY_GANTT_DATA_QUERY,
        })

        if (existingData && existingData.getMyGanttData && newTask) {
          // Write the updated data back to the cache.
          cache.writeQuery({
            query: GET_MY_GANTT_DATA_QUERY,
            data: {
              getMyGanttData: {
                ...existingData.getMyGanttData,
                // Add the new task to the end of the existing tasks array.
                tasks: [...existingData.getMyGanttData.tasks, newTask],
              },
            },
          })
        }
      },
    }
  )

  const [updateGanttTaskMutation, { loading: updateGanttTaskLoading, error: updateGanttTaskError }] = useMutation<
    any,
    UpdatePersonalGanttTaskVariables
  >(UPDATE_PERSONAL_GANTT_TASK_MUTATION)

  const [updateSectionMutation, { loading: updateSectionLoading, error: updateSectionError }] = useMutation<
    { updatePersonalSection: any },
    UpdatePersonalSectionVariables
  >(UPDATE_PERSONAL_SECTION_MUTATION)

  // --- Exposed Functions ---

  const createPersonalGanttTask = useCallback(
    async (input: CreatePersonalGanttTaskVariables["input"]): Promise<any> => {
      console.log("usePersonalGanttMutations: Attempting to create task with input:", input)
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
        console.log("usePersonalGanttMutations: Create task successful. Response:", response.data)
        return response.data?.createPersonalGanttTask
      } catch (err: any) {
        console.error("usePersonalGanttMutations: Failed to create task.", { error: err, input })
        throw err
      }
    },
    [createGanttTaskMutation]
  )

  const updatePersonalGanttTask = useCallback(
    async (input: UpdatePersonalGanttTaskVariables["input"]): Promise<any> => {
      console.log("[UPDATE GANTT TASK] Attempting to update task with input:", input)
      try {
        const response = await updateGanttTaskMutation({
          variables: { input: input },
        })
        console.log("[UPDATE GANTT TASK] Update successful. Response:", response.data)
        return response.data?.updatePersonalGanttTask
      } catch (err: any) {
        console.error("[UPDATE GANTT TASK] Failed to update task.", { error: err, input: input })
        throw err
      }
    },
    [updateGanttTaskMutation]
  )

  const updatePersonalSectionName = useCallback(
    async (sectionId: string, name: string): Promise<any> => {
      console.log(`usePersonalGanttMutations: Attempting to update section ${sectionId} with new name: "${name}"`)
      try {
        const response = await updateSectionMutation({
          variables: {
            input: {
              id: sectionId,
              name: name,
            },
          },
        })
        console.log(`usePersonalGanttMutations: Update section successful. Response:`, response.data)
        return response.data?.updatePersonalSection
      } catch (err: any) {
        console.error("usePersonalGanttMutations: Failed to update section.", { error: err, sectionId, name })
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