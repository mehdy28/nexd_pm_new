import { useQuery } from "@apollo/client"
import { useCallback, useMemo } from "react"
import { GET_GANTT_DATA_QUERY } from "@/graphql/queries/getGanttData"
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections" // Reuse UserAvatarPartial

// --- Type Definitions specific to Gantt ---
export interface CustomGanttTask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  type: string // "task", "milestone", "project" (for sprint groups)
  sprint?: string // The ID of the parent sprint from the original data
  project?: string // ID of the parent project/sprint, for gantt-task-react library
  hideChildren?: boolean
  displayOrder?: number
  description?: string
  assignee?: UserAvatarPartial
  // New fields for linking back to original model for mutations
  originalTaskId: string // The ID of the actual Task or Milestone object
  originalType: "TASK" | "MILESTONE" | "SPRINT" // To differentiate when updating
}

export interface SprintGanttFilterOption {
  id: string
  name: string
}

// Full response type for the Gantt query - EXPORTED FOR useGanttMutations.ts
export interface GanttDataResponse {
  getGanttData: {
    sprints: SprintGanttFilterOption[]
    tasks: Array<{
      id: string // This is the GanttTaskData's ID (sprint.id or task.id or milestone.id)
      name: string
      start: string // ISO date string
      end: string // ISO date string
      progress: number
      type: string
      sprint?: string
      hideChildren?: boolean
      displayOrder?: number
      description?: string
      assignee?: UserAvatarPartial
      originalTaskId: string
      originalType: "TASK" | "MILESTONE" | "SPRINT"
    }>
  } | null
}

// --- Main Hook ---
export function useGanttData(projectId: string, selectedSprintIdFromProps?: string | null) {


  // Apollo Query for Gantt data
  const { data, loading, error, refetch } = useQuery<GanttDataResponse>(GET_GANTT_DATA_QUERY, {
    variables: { projectId, sprintId: selectedSprintIdFromProps || null }, // Pass selectedSprintId or null
    skip: !projectId,
    fetchPolicy: "network-only",
  })

  // Derived state from query data
  const transformedGanttData = data?.getGanttData

  const ganttTasks: CustomGanttTask[] = useMemo(() => {
    if (!transformedGanttData?.tasks) return []

    const tasks = transformedGanttData.tasks.map(task => ({
      ...task,
      // The gantt-task-react library uses the 'project' property to link tasks.
      // We are mapping the 'sprint' ID from our data to this property.
      project: task.sprint,
      start: new Date(task.start),
      end: new Date(task.end),
      progress: task.progress || 0,
      hideChildren: task.hideChildren || false,
      displayOrder: task.displayOrder || 1, // Default order
      originalTaskId: task.originalTaskId,
      originalType: task.originalType,
    }))

    // NEW: Apply consistent sorting
    return tasks.sort((a, b) => {
      // Prioritize projects (sprints) first
      if (a.type === "project" && b.type !== "project") return -1
      if (a.type !== "project" && b.type === "project") return 1

      // Then sort by displayOrder
      if (a.displayOrder !== b.displayOrder) {
        return (a.displayOrder || 0) - (b.displayOrder || 0)
      }
      // Fallback for stable sort: sort by ID
      return a.id.localeCompare(b.id)
    })
  }, [transformedGanttData?.tasks])

  const sprintFilterOptions: SprintGanttFilterOption[] = useMemo(() => {
    return transformedGanttData?.sprints || []
  }, [transformedGanttData?.sprints])

  const refetchGanttData = useCallback(() => {
    refetch()
  }, [refetch])

  // Determine a default sprint to suggest for the dropdown on initial load
  const defaultSelectedSprintIdToSuggest: string | undefined = useMemo(() => {
    if (sprintFilterOptions.length > 0) {
      // Pick the first sprint from the fetched options as a default suggestion
      return sprintFilterOptions[0].id
    }
    return undefined
  }, [sprintFilterOptions])

  return {
    ganttTasks,
    sprintFilterOptions,
    loading,
    error,
    refetchGanttData,
    defaultSelectedSprintId:
      selectedSprintIdFromProps !== undefined ? selectedSprintIdFromProps : defaultSelectedSprintIdToSuggest,
  }
}