import { useQuery } from "@apollo/client"
import { useCallback, useMemo } from "react"
import { Task as GanttTaskReact } from "gantt-task-react"
import { GET_MY_GANTT_DATA_QUERY } from "@/graphql/queries/personal/getMyGanttData"

type GanttTaskType = GanttTaskReact["type"]

// --- Type Definitions specific to Personal Gantt ---
export interface CustomGanttTask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  type: GanttTaskType // "task", "milestone", or "project"
  project?: string // The ID of the parent task/project for the gantt library
  personalSectionId?: string // The ID of the parent section
  hideChildren?: boolean
  displayOrder?: number
  description?: string
  originalTaskId: string // The ID of the actual Task or Section object
  originalType: "TASK" | "SECTION" // To differentiate when updating
}

export interface PersonalSectionGanttFilterOption {
  id: string
  name: string
}

export interface PersonalGanttDataResponse {
  getMyGanttData: {
    sections: PersonalSectionGanttFilterOption[]
    tasks: Array<{
      id: string
      name: string
      start: string // ISO date string
      end: string // ISO date string
      progress: number
      type: string // The backend sends a string, we will cast it
      project?: string
      personalSectionId?: string
      hideChildren?: boolean
      displayOrder?: number
      description?: string
      originalTaskId: string
      originalType: "TASK" | "SECTION"
    }>
  } | null
}

// --- Main Hook ---
export function usePersonalGanttData() {
  const { data, loading, error, refetch } = useQuery<PersonalGanttDataResponse>(GET_MY_GANTT_DATA_QUERY, {
    fetchPolicy: "network-only",
  })

  // LOG 1: Raw data from the server

  const transformedGanttData = data?.getMyGanttData

  const ganttTasks: CustomGanttTask[] = useMemo(() => {
    if (!transformedGanttData?.tasks) return []

    // LOG 2: Tasks array before any processing

    // Data is pre-sorted by the backend. We only need to perform
    // client-side transformations, like converting date strings to Date objects.
    const finalList = transformedGanttData.tasks.map(task => {
      const ganttTask: CustomGanttTask = {
        ...task,
        start: new Date(task.start),
        end: new Date(task.end),
        type: task.type as GanttTaskType,
        progress: task.progress || 0,
        hideChildren: task.hideChildren ?? false,
      }
      return ganttTask
    })



    return finalList
  }, [transformedGanttData?.tasks])

  const sectionFilterOptions: PersonalSectionGanttFilterOption[] = useMemo(() => {
    return transformedGanttData?.sections || []
  }, [transformedGanttData?.sections])

  const refetchPersonalGanttData = useCallback(() => {
    refetch()
  }, [refetch])

  return {
    ganttTasks,
    sectionFilterOptions,
    loading,
    error,
    refetchPersonalGanttData,
  }
}