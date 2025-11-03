import { useQuery, useMutation } from "@apollo/client"
import { useCallback, useMemo, useEffect } from "react"
import { GET_MY_TASKS_AND_SECTIONS_QUERY } from "@/graphql/queries/personal/getMyTasksAndSections"
import { CREATE_PERSONAL_SECTION_MUTATION } from "@/graphql/mutations/personal/createPersonalSection"
import { UPDATE_PERSONAL_SECTION_MUTATION } from "@/graphql/mutations/personal/updatePersonalSection"
import { DELETE_PERSONAL_SECTION_MUTATION } from "@/graphql/mutations/personal/deletePersonalSection"

import { UserAvatarPartial } from "@/types/useProjectTasksAndSections"
import { TaskStatus, Priority } from "@prisma/client"

// --- Type Definitions for the hook's return ---
export type PriorityUI = "Low" | "Medium" | "High"
export type TaskStatusUI = "TODO" | "DONE"

export interface TaskUI {
  id: string
  title: string
  due: string | null // YYYY-MM-DD
  priority: PriorityUI
  points: number
  completed: boolean // Derived from TaskStatusUI
  description?: string
  status: TaskStatusUI
  sectionId: string
}

export interface SectionUI {
  id: string
  title: string // Mapped from 'name'
  tasks: TaskUI[]
  editing?: boolean // Client-side state
}

// Full response type for the main query
interface MyTasksAndSectionsResponse {
  getMyTasksAndSections: {
    personalSections: Array<{
      id: string
      name: string
      tasks: Array<{
        id: string
        title: string
        description?: string
        status: TaskStatusUI
        priority: "LOW" | "MEDIUM" | "HIGH"
        dueDate?: string // YYYY-MM-DD
        points: number
        sectionId: string
      }>
    }>
  } | null
}

export const mapPriorityToUI = (priority: "LOW" | "MEDIUM" | "HIGH"): PriorityUI => {
  switch (priority) {
    case "LOW":
      return "Low"
    case "MEDIUM":
      return "Medium"
    case "HIGH":
      return "High"
  }
}

export const mapTaskStatusToUI = (status: TaskStatus): boolean => {
  return status === "DONE"
}

export function useMyTasksAndSections() {
  const { data, loading, error, refetch } = useQuery<MyTasksAndSectionsResponse>(
    GET_MY_TASKS_AND_SECTIONS_QUERY,
    {
      fetchPolicy: "network-only",
    }
  )

  const [createPersonalSectionMutation] = useMutation<any, any>(CREATE_PERSONAL_SECTION_MUTATION, {
    refetchQueries: [{ query: GET_MY_TASKS_AND_SECTIONS_QUERY }],
  })

  const [updatePersonalSectionMutation] = useMutation<any, any>(UPDATE_PERSONAL_SECTION_MUTATION, {
    refetchQueries: [{ query: GET_MY_TASKS_AND_SECTIONS_QUERY }],
  })

  const [deletePersonalSectionMutation] = useMutation<any, any>(DELETE_PERSONAL_SECTION_MUTATION, {
    refetchQueries: [{ query: GET_MY_TASKS_AND_SECTIONS_QUERY }],
  })

  const transformedData = data?.getMyTasksAndSections

  const personalSections: SectionUI[] = useMemo(() => {
    const tempSections: SectionUI[] = []
    if (transformedData) {
      transformedData.personalSections.forEach(sec => {
        tempSections.push({
          id: sec.id,
          title: sec.name,
          tasks: sec.tasks.map(task => ({
            id: task.id,
            title: task.title,
            due: task.dueDate || null,
            priority: mapPriorityToUI(task.priority),
            points: task.points,
            completed: mapTaskStatusToUI(task.status),
            description: task.description,
            status: task.status,
            sectionId: task.sectionId,
          })),
          editing: false,
        })
      })
    }
    return tempSections
  }, [transformedData])

  const createSection = useCallback(
    async (name: string, order?: number | null) => {
      try {
        const response = await createPersonalSectionMutation({
          variables: { name, order: order ?? null },
        })
        return response.data?.createPersonalSection
      } catch (err: any) {
        throw err
      }
    },
    [createPersonalSectionMutation]
  )

  const updateSection = useCallback(
    async (id: string, name?: string | null, order?: number | null) => {
      try {
        const response = await updatePersonalSectionMutation({
          variables: { id, name: name ?? null, order: order ?? null },
        })
        return response.data?.updatePersonalSection
      } catch (err: any) {
        throw err
      }
    },
    [updatePersonalSectionMutation]
  )

  const deleteSection = useCallback(
    async (id: string, options: { deleteTasks: boolean; reassignToSectionId?: string | null }) => {
      try {
        const response = await deletePersonalSectionMutation({
          variables: { id, options },
        })
        return response.data?.deletePersonalSection
      } catch (err: any) {
        throw err
      }
    },
    [deletePersonalSectionMutation]
  )

  return {
    personalSections,
    loading,
    error,
    refetchMyTasksAndSections: refetch,
    createSection,
    updateSection,
    deleteSection,
  }
}