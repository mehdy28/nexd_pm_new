import { useQuery } from "@apollo/client"
import { useCallback, useMemo } from "react"
import { GET_MY_GANTT_DATA_QUERY } from "@/graphql/queries/personal/getMyGanttData"


// --- Type Definitions specific to Personal Gantt ---
export interface CustomGanttTask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  type: string // "task" or "project" (for section groups)
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
      type: string
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

  const transformedGanttData = data?.getMyGanttData

  const ganttTasks: CustomGanttTask[] = useMemo(() => {
    if (!transformedGanttData?.tasks) return []

    const tasks = transformedGanttData.tasks.map(task => ({
      ...task,
      start: new Date(task.start),
      end: new Date(task.end),
      progress: task.progress || 0,
      hideChildren: task.hideChildren || false,
      displayOrder: task.displayOrder || 1,
      originalTaskId: task.originalTaskId,
      originalType: task.originalType as "TASK" | "SECTION",
    }))

    return tasks.sort((a, b) => {
      if (a.type === "project" && b.type !== "project") return -1
      if (a.type !== "project" && b.type === "project") return 1
      if (a.displayOrder !== b.displayOrder) {
        return (a.displayOrder || 0) - (b.displayOrder || 0)
      }
      return a.id.localeCompare(b.id)
    })
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