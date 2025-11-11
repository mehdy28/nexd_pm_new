import { useQuery, useMutation, useApolloClient } from "@apollo/client"
import { useCallback, useMemo, useEffect } from "react"
import { GET_PROJECT_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/getProjectTasksAndSections"
import { CREATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/createProjectSection"
import { UPDATE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/updateProjectSection"
import { DELETE_PROJECT_SECTION_MUTATION } from "@/graphql/mutations/deleteProjectSection"
import { REORDER_PROJECT_SECTIONS_MUTATION } from "@/graphql/mutations/reorderProjectSections" // <-- Import new mutation

import { UserAvatarPartial } from "@/types/useProjectTasksAndSections"
import { TaskStatus } from "@prisma/client"

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
  due: string | null
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
        dueDate?: string | null
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
      fetchPolicy: "cache-and-network",
    }
  )

  // --- Section Mutations ---
  const [createProjectSectionMutation] = useMutation(CREATE_PROJECT_SECTION_MUTATION, {
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
    if (!transformedData) return []
    return transformedData.sections.map(sec => ({
      id: sec.id,
      title: sec.name,
      tasks: sec.tasks.map(task => ({
        id: task.id,
        title: task.title,
        assignee: task.assignee,
        due: task.dueDate || null,
        priority: mapPriorityToUI(task.priority),
        points: task.points,
        completed: mapTaskStatusToUI(task.status),
        description: task.description,
        status: task.status,
        sprintId: task.sprintId,
      })),
      editing: false,
    }))
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
      await createProjectSectionMutation({
        variables: {
          projectId: projectId,
          name,
          order: order ?? numSections,
        },
      })
    },
    [projectId, createProjectSectionMutation, sections.length]
  )

  const updateSection = useCallback(
    async (id: string, name: string) => {
      await updateProjectSectionMutation({
        variables: { id, name },
        optimisticResponse: {
          updateProjectSection: { __typename: "Section", id, name },
        },
        update: (cache, { data: mutationData }) => {
          const idToUpdate = mutationData?.updateProjectSection.id
          if (!idToUpdate) return
          cache.modify({
            id: cache.identify({ __typename: "Section", id: idToUpdate }),
            fields: {
              name() {
                return mutationData?.updateProjectSection.name
              },
            },
          })
        },
      })
    },
    [updateProjectSectionMutation]
  )

  const deleteSection = useCallback(
    async (id: string, options: { deleteTasks: boolean; reassignToSectionId?: string | null }) => {
      await deleteProjectSectionMutation({
        variables: { id, options },
      })
    },
    [deleteProjectSectionMutation]
  )

  // --- NEW: Reorder Sections Function ---
  const reorderSections = useCallback(
    async (sectionsToReorder: ReorderSectionInput[]) => {
      const queryOptions = {
        query: GET_PROJECT_TASKS_AND_SECTIONS_QUERY,
        variables: { projectId, sprintId: sprintIdFromProps },
      }
      const originalQuery = client.readQuery<ProjectTasksAndSectionsResponse>(queryOptions)

      // Optimistically update the cache
      if (originalQuery?.getProjectTasksAndSections) {
        const currentSections = [...originalQuery.getProjectTasksAndSections.sections]
        const sectionMap = new Map(currentSections.map(s => [s.id, s]))

        const reorderedSections = sectionsToReorder
          .map(s => sectionMap.get(s.id))
          .filter((s): s is NonNullable<typeof s> => s != null)

        client.writeQuery({
          ...queryOptions,
          data: {
            getProjectTasksAndSections: {
              ...originalQuery.getProjectTasksAndSections,
              sections: reorderedSections,
            },
          },
        })
      }

      try {
        await reorderProjectSectionsMutation({
          variables: {
            projectId,
            sections: sectionsToReorder,
          },
        })
      } catch (err) {
        console.error("Failed to reorder sections:", err)
        refetch() // On error, revert by refetching from the server
        throw err
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
    updateSection,
    deleteSection,
    reorderSections, // <-- Expose the new function
    projectMembers,
    defaultSelectedSprintId: sprintIdFromProps !== undefined ? sprintIdFromProps : defaultSprintIdToSuggest,
  }
}