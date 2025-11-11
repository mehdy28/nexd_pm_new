// hooks/personal/useMyTasksAndSections.ts
import { useQuery, useMutation, useApolloClient } from "@apollo/client"
import { useCallback, useMemo, useEffect } from "react"
import { GET_MY_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/personal/getMyTasksAndSections"
import { CREATE_PERSONAL_SECTION_MUTATION } from "@/graphql/mutations/personal/createPersonalSection"
import { UPDATE_PERSONAL_SECTION_MUTATION } from "@/graphql/mutations/personal/updatePersonalSection"
import { DELETE_PERSONAL_SECTION_MUTATION } from "@/graphql/mutations/personal/deletePersonalSection"
import { REORDER_PERSONAL_SECTIONS_MUTATION } from "@/graphql/mutations/personal/reorderPersonalSections"

// --- Type Definitions ---
export type PriorityUI = "LOW" | "MEDIUM" | "HIGH"
export type TaskStatusUI = "TODO" | "DONE"

export interface TaskUI {
  id: string
  title: string
  endDate: string | null
  priority: PriorityUI
  points: number | null
  completed: boolean
  description?: string | null
  status: TaskStatusUI
  personalSectionId: string
}

export interface SectionUI {
  id: string
  title: string
  tasks: TaskUI[]
  editing?: boolean
}

// Type for the raw GraphQL response
interface MyTasksAndSectionsResponse {
  getMyTasksAndSections: {
    personalSections: Array<{
      id: string
      name: string
      tasks: Array<{
        id: string
        title: string
        description?: string | null
        status: TaskStatusUI
        priority: "LOW" | "MEDIUM" | "HIGH"
        endDate?: string | null
        points: number | null
      }>
    }>
  } | null
}

// Types for the new reorder mutation
interface ReorderSectionInput {
  id: string
  order: number
}
interface ReorderPersonalSectionsData {
  reorderPersonalSections: {
    id: string
    order: number
  }[]
}
interface ReorderPersonalSectionsVars {
  sections: ReorderSectionInput[]
}

export const mapPriorityToUI = (priority: "LOW" | "MEDIUM" | "HIGH"): PriorityUI => {
  return priority // The types are identical, direct return is fine
}

export const mapTaskStatusToUI = (status: TaskStatusUI): boolean => {
  return status === "DONE"
}

export function useMyTasksAndSections() {
  console.log("[useMyTasksAndSections] Hook initialized.")
  const client = useApolloClient()
  const { data, loading, error, refetch } = useQuery<MyTasksAndSectionsResponse>(
    GET_MY_TASKS_AND_SECTIONS_QUERY,
    {
      fetchPolicy: "network-only",
    }
  )

  useEffect(() => {
    console.log("[useMyTasksAndSections Query State] Status changed.", { loading, error: !!error })
    if (loading) {
      console.log("[useMyTasksAndSections Query State] Fetching data...")
    }
    if (error) {
      console.error("[useMyTasksAndSections Query State] Fucking error occurred:", error)
    }
    if (!loading && data) {
      console.log("[useMyTasksAndSections Query State] Data fetched or updated from cache:", data)
    }
  }, [loading, error, data])

  const [createPersonalSectionMutation] = useMutation(CREATE_PERSONAL_SECTION_MUTATION, {
    refetchQueries: [{ query: GET_MY_TASKS_AND_SECTIONS_QUERY }],
  })

  const [updatePersonalSectionMutation] = useMutation(UPDATE_PERSONAL_SECTION_MUTATION) // Manual cache update is better, but refetch is simpler

  const [deletePersonalSectionMutation] = useMutation(DELETE_PERSONAL_SECTION_MUTATION, {
    refetchQueries: [{ query: GET_MY_TASKS_AND_SECTIONS_QUERY }],
  })

  const [reorderPersonalSectionsMutation, { loading: isReordering }] = useMutation<
    ReorderPersonalSectionsData,
    ReorderPersonalSectionsVars
  >(REORDER_PERSONAL_SECTIONS_MUTATION)

  const personalSections: SectionUI[] = useMemo(() => {
    console.log("[useMyTasksAndSections Memo] Re-computing personalSections.")
    if (!data?.getMyTasksAndSections) {
      console.log("[useMyTasksAndSections Memo] No data available, returning empty array.")
      return []
    }
    console.log("[useMyTasksAndSections Memo] Mapping raw GraphQL data to UI model.")
    const mappedData = data.getMyTasksAndSections.personalSections.map(sec => ({
      id: sec.id,
      title: sec.name,
      tasks: sec.tasks.map(task => ({
        id: task.id,
        title: task.title,
        endDate: task.endDate || null,
        priority: mapPriorityToUI(task.priority),
        points: task.points,
        completed: mapTaskStatusToUI(task.status),
        description: task.description,
        status: task.status,
        personalSectionId: sec.id, // FIX: Use parent section ID for consistency
      })),
      editing: false,
    }))
    console.log("[useMyTasksAndSections Memo] Finished mapping. Result:", mappedData)
    return mappedData
  }, [data])

  const createSection = useCallback(
    async (name: string, order?: number) => {
      console.log(`[createSection] Initiated. Name: ${name}, Order: ${order}`)
      const numSections = personalSections.length
      const finalOrder = order ?? numSections
      console.log(`[createSection] Final order determined: ${finalOrder}. Current sections count: ${numSections}.`)
      try {
        await createPersonalSectionMutation({
          variables: { name, order: finalOrder },
        })
        console.log(`[createSection] Mutation successfully executed for section "${name}". It will refetch the main query.`)
      } catch (e) {
        console.error(`[createSection] Fucking failed to create section "${name}".`, e)
      }
    },
    [createPersonalSectionMutation, personalSections.length]
  )

  const updateSection = useCallback(
    async (id: string, name: string) => {
      console.log(`[updateSection] Initiated. ID: ${id}, New Name: ${name}`)
      const optimisticResponsePayload = {
        updatePersonalSection: {
          __typename: "PersonalSection",
          id,
          name,
        },
      }
      console.log(`[updateSection] Constructed optimistic response:`, optimisticResponsePayload)

      await updatePersonalSectionMutation({
        variables: { id, name },
        optimisticResponse: optimisticResponsePayload,
        update: (cache, { data: mutationData }) => {
          console.log(`[updateSection Cache Update] Received data from mutation:`, mutationData)
          const idToUpdate = mutationData?.updatePersonalSection.id
          if (!idToUpdate) {
            console.warn(`[updateSection Cache Update] No section ID returned. Aborting cache update.`)
            return
          }

          const sectionCacheId = cache.identify({ __typename: "PersonalSection", id: idToUpdate })
          if (!sectionCacheId) {
            console.error(
              `[updateSection Cache Update] Could not fucking identify section with ID ${idToUpdate} in cache.`
            )
            return
          }

          console.log(`[updateSection Cache Update] Modifying cache for section: ${sectionCacheId}`)
          cache.modify({
            id: sectionCacheId,
            fields: {
              name() {
                const newName = mutationData?.updatePersonalSection.name
                console.log(`[updateSection Cache Update] Setting new name in cache: "${newName}"`)
                return newName
              },
            },
          })
        },
      })
    },
    [updatePersonalSectionMutation]
  )

  const deleteSection = useCallback(
    async (id: string, options: { deleteTasks: boolean; reassignToSectionId?: string | null }) => {
      console.log(`[deleteSection] Initiated. ID: ${id}, Options:`, options)
      try {
        await deletePersonalSectionMutation({
          variables: { id, options },
        })
        console.log(`[deleteSection] Mutation successfully executed for section ID "${id}". It will refetch the main query.`)
      } catch (e) {
        console.error(`[deleteSection] Fucking failed to delete section ID "${id}".`, e)
      }
    },
    [deletePersonalSectionMutation]
  )

  const reorderSections = useCallback(
    async (sectionsToReorder: ReorderSectionInput[]) => {
      console.log(`[reorderSections] Initiated. New order:`, sectionsToReorder)

      console.log(`[reorderSections] Reading current sections from cache to perform optimistic update.`)
      const originalQuery = client.readQuery<MyTasksAndSectionsResponse>({
        query: GET_MY_TASKS_AND_SECTIONS_QUERY,
      })

      // Optimistically update the cache
      if (originalQuery?.getMyTasksAndSections) {
        console.log(`[reorderSections] Found original query data in cache.`)
        const currentSections = [...originalQuery.getMyTasksAndSections.personalSections]
        const sectionMap = new Map(currentSections.map(s => [s.id, s]))
        console.log(`[reorderSections] Created a map of current sections for quick lookup.`)

        const reorderedSections = sectionsToReorder
          .map(s => sectionMap.get(s.id))
          .filter((s): s is NonNullable<typeof s> => s != null)
        console.log(`[reorderSections] Constructed new optimistically reordered section list:`, reorderedSections)

        if (reorderedSections.length !== sectionsToReorder.length) {
          console.warn(
            `[reorderSections] Mismatch in reordered sections. Some sections were not found in cache. This might cause issues.`
          )
        }

        console.log(`[reorderSections] Writing the new optimistic order to the Apollo cache.`)
        client.writeQuery({
          query: GET_MY_TASKS_AND_SECTIONS_QUERY,
          data: {
            getMyTasksAndSections: {
              ...originalQuery.getMyTasksAndSections,
              personalSections: reorderedSections,
            },
          },
        })
      } else {
        console.warn(`[reorderSections] Could not read original query from cache. Skipping optimistic update.`)
      }

      try {
        console.log(`[reorderSections] Sending mutation to the server.`)
        await reorderPersonalSectionsMutation({
          variables: { sections: sectionsToReorder },
        })
        console.log(`[reorderSections] Mutation successful.`)
      } catch (err) {
        console.error("Fucking failed to reorder sections:", err)
        // On error, revert the optimistic update by refetching from the server
        console.log(`[reorderSections] Reverting optimistic update by refetching data.`)
        refetch()
        throw err
      }
    },
    [client, reorderPersonalSectionsMutation, refetch]
  )

  return {
    personalSections,
    loading,
    error,
    isReordering,
    refetchMyTasksAndSections: refetch,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  }
}
