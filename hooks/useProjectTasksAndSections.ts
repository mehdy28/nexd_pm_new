import { useQuery, useMutation, useApolloClient } from "@apollo/client"
import { useCallback, useMemo, useEffect } from "react"
import { GET_PROJECT_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/getProjectTasksAndSections"
import { CREATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/createProjectSection"
import { UPDATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/updateProjectSection"
import { DELETE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/deleteProjectSection"
import { REORDER_PROJECT_SECTIONS_MUTATION } from "@/graphql/mutations/reorderProjectSections" // <-- Import new mutation

import { UserAvatarPartial } from "@/types/useProjectTasksAndSections"

// --- Type Definitions ---
export type PriorityUI = "LOW" | "MEDIUM" | "HIGH"
export type TaskStatusUI = "TODO" | "DONE" // Simplified for this context, expand if needed

export interface ProjectMemberFullDetails {
  id: string
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
  user: UserAvatarPartial
}

export interface TaskUI {
  id: string
  title: string
  assignee: UserAvatarPartial | null
  endDate: string | null
  priority: PriorityUI
  points: number | null
  completed: boolean
  description?: string | null
  status: TaskStatusUI
  sprintId?: string | null
  sectionId?: string | undefined
}

export interface SectionUI {
  id: string
  title: string
  tasks: TaskUI[]
  editing?: boolean
}

export interface SprintFilterOption {
  id: string
  name: string
}

// Type for the raw GraphQL response
interface ProjectTasksAndSectionsResponse {
  getProjectTasksAndSections: {
    sprints: SprintFilterOption[]
    sections: Array<{
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
        assignee: UserAvatarPartial | null
        sprintId?: string | null
      }>
    }>
    projectMembers: ProjectMemberFullDetails[]
  } | null
}

// Types for the new reorder mutation
interface ReorderSectionInput {
  id: string
  order: number
}
interface ReorderProjectSectionsData {
  reorderProjectSections: {
    id: string
    order: number
  }[]
}
interface ReorderProjectSectionsVars {
  projectId: string
  sections: ReorderSectionInput[]
}

export const mapPriorityToUI = (priority: "LOW" | "MEDIUM" | "HIGH"): PriorityUI => {
  return priority
}

export const mapTaskStatusToUI = (status: TaskStatusUI): boolean => {
  return status === "DONE"
}

export function useProjectTasksAndSections(projectId: string, sprintIdFromProps?: string | null) {
  const client = useApolloClient() // <-- Get Apollo Client instance

  const { data, loading, error, refetch } = useQuery<ProjectTasksAndSectionsResponse>(
    GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
    {
      variables: { projectId, sprintId: sprintIdFromProps },
      skip: !projectId,
      fetchPolicy: "network-only",
    }
  )

  useEffect(() => {
    console.groupCollapsed(`[useProjectTasksAndSections] Query State Change (Project: ${projectId})`)
    console.log("Query Variables:", { projectId, sprintId: sprintIdFromProps })
    console.log("Loading state:", loading)
    console.log("Error state:", error)
    console.log("Raw GraphQL Data from useQuery:", data)
    console.groupEnd()
  }, [data, loading, error, projectId, sprintIdFromProps])


  // --- Section Mutations ---
  const [createProjectSectionMutation, { loading: isCreatingSection }] = useMutation(CREATE_PROJECT_SECTION_MUTATION, {
    refetchQueries: ["GetProjectTasksAndSections"],
  })


  const [updateProjectSectionMutation] = useMutation(UPDATE_PROJECT_SECTION_MUTATION) // Manual cache update is better

  const [deleteProjectSectionMutation] = useMutation(DELETE_PROJECT_SECTION_MUTATION, {
    refetchQueries: ["GetProjectTasksAndSections"],
  })

  // --- NEW: Reorder Mutation Hook ---
  const [reorderProjectSectionsMutation, { loading: isReordering }] = useMutation<
    ReorderProjectSectionsData,
    ReorderProjectSectionsVars
  >(REORDER_PROJECT_SECTIONS_MUTATION)
  // -------------------------

  const transformedData = data?.getProjectTasksAndSections

  const sections: SectionUI[] = useMemo(() => {
    console.groupCollapsed(`[useProjectTasksAndSections] Transforming Data into UI State`)
    if (!transformedData) {
      console.log("No transformedData available. Returning empty array.")
      console.groupEnd()
      return []
    }
    console.log("Input (raw sections from GraphQL):", transformedData.sections)

    const uiSections = transformedData.sections.map(sec => ({
      id: sec.id,
      title: sec.name,
      tasks: sec.tasks.map(task => ({
        id: task.id,
        title: task.title,
        assignee: task.assignee,
        endDate: task.endDate || null,
        priority: mapPriorityToUI(task.priority),
        points: task.points,
        completed: mapTaskStatusToUI(task.status),
        description: task.description,
        status: task.status,
        sprintId: task.sprintId,
      })),
      editing: false,
    }))

    console.log("Output (sections formatted for UI):", uiSections)
    console.groupEnd()
    return uiSections
  }, [transformedData])

  const projectMembers: ProjectMemberFullDetails[] = useMemo(() => {
    return transformedData?.projectMembers || []
  }, [transformedData])

  const defaultSprintIdToSuggest: string | undefined = useMemo(() => {
    if (transformedData?.sprints && transformedData.sprints.length > 0) {
      return transformedData.sprints[0].id
    }
    return undefined
  }, [transformedData?.sprints])

  const createSection = useCallback(
    async (name: string, order?: number) => {
      const numSections = sections.length
      const variables = {
        projectId: projectId,
        name,
        order: order ?? numSections,
      }
      console.log("[useProjectTasksAndSections] Calling createSection with variables:", variables)
      await createProjectSectionMutation({ variables })
    },
    [projectId, createProjectSectionMutation, sections.length]
  )

  const updateSection = useCallback(
    async (id: string, name: string) => {
      const variables = { id, name }
      const optimisticResponse = {
        updateProjectSection: { __typename: "Section", id, name },
      }
      console.group(`[useProjectTasksAndSections] Calling updateSection for section ID: ${id}`)
      console.log("Variables:", variables)
      console.log("Optimistic Response:", optimisticResponse)

      await updateProjectSectionMutation({
        variables: variables,
        optimisticResponse: optimisticResponse,
        update: (cache, { data: mutationData }) => {
          console.group(`[useProjectTasksAndSections] Cache update for updateSection (ID: ${id})`)
          const idToUpdate = mutationData?.updateProjectSection.id
          console.log("Mutation data received by update function:", mutationData)
          if (!idToUpdate) {
            console.log("No ID to update found in mutation data. Aborting cache update.")
            console.groupEnd()
            return
          }

          const cacheId = cache.identify({ __typename: "Section", id: idToUpdate })
          console.log(`Modifying cache for fragment with ID: ${cacheId}`)
          cache.modify({
            id: cacheId,
            fields: {
              name() {
                console.log(`Updating 'name' field in cache to: '${mutationData?.updateProjectSection.name}'`)
                return mutationData?.updateProjectSection.name
              },
            },
          })
          console.groupEnd()
        },
      })
      console.groupEnd()
    },
    [updateProjectSectionMutation]
  )

  const deleteSection = useCallback(
    async (id: string, options: { deleteTasks: boolean; reassignToSectionId?: string | null }) => {
      const variables = { id, options }
      console.log("[useProjectTasksAndSections] Calling deleteSection with variables:", variables)
      await deleteProjectSectionMutation({ variables })
    },
    [deleteProjectSectionMutation]
  )

  // --- NEW: Reorder Sections Function ---
  const reorderSections = useCallback(
    async (sectionsToReorder: ReorderSectionInput[]) => {
      console.group(`[useProjectTasksAndSections] Calling reorderSections for project ID: ${projectId}`)
      console.log("Input: Sections with new order:", sectionsToReorder)

      const queryOptions = {
        query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
        variables: { projectId, sprintId: sprintIdFromProps },
      }

      const originalQuery = client.readQuery<ProjectTasksAndSectionsResponse>(queryOptions)
      console.log("State of cache BEFORE optimistic update:", originalQuery)


      // Optimistically update the cache
      if (originalQuery?.getProjectTasksAndSections) {
        const currentSections = [...originalQuery.getProjectTasksAndSections.sections]
        const sectionMap = new Map(currentSections.map(s => [s.id, s]))

        const reorderedSections = sectionsToReorder
          .map(s => sectionMap.get(s.id))
          .filter((s): s is NonNullable<typeof s> => s != null)

        const newCacheData = {
          ...queryOptions,
          data: {
            getProjectTasksAndSections: {
              ...originalQuery.getProjectTasksAndSections,
              sections: reorderedSections,
            },
          },
        }

        console.log("Data being written to cache for optimistic update:", newCacheData.data)
        client.writeQuery(newCacheData)

        const updatedCache = client.readQuery<ProjectTasksAndSectionsResponse>(queryOptions)
        console.log("State of cache AFTER optimistic update:", updatedCache)
      } else {
        console.warn("Could not find original query in cache. Skipping optimistic update.")
      }

      try {
        const mutationVariables = { projectId, sections: sectionsToReorder }
        console.log("Executing reorderProjectSectionsMutation with variables:", mutationVariables)
        await reorderProjectSectionsMutation({ variables: mutationVariables })
        console.log("Reorder mutation successful.")
      } catch (err) {
        console.error("Failed to reorder sections:", err)
        console.log("Reverting optimistic update by refetching from server.")
        refetch() // On error, revert by refetching from the server
        throw err
      } finally {
        console.groupEnd()
      }
    },
    [client, reorderProjectSectionsMutation, refetch, projectId, sprintIdFromProps]
  )

  return {
    sprintFilterOptions: transformedData?.sprints || [],
    sections: sections,
    loading,
    error,
    isReordering, // <-- Expose loading state
    refetchProjectTasksAndSections: refetch,
    createSection,
    isCreatingSection,
    updateSection,
    deleteSection,
    reorderSections, // <-- Expose the new function
    projectMembers,
    defaultSelectedSprintId: sprintIdFromProps !== undefined ? sprintIdFromProps : defaultSprintIdToSuggest,
  }
}