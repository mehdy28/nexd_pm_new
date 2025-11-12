// components/board/kanban-types.ts
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections"

export type Priority = "LOW" | "MEDIUM" | "HIGH"

export type Card = {
  id: string
  title: string
  description?: string
  priority: Priority
  points: number
  startDate: string | null
  endDate: string | null
  editing?: boolean // Client-side specific
  assignee: UserAvatarPartial | null
  completed: boolean
}

export type Column = {
  id: string
  title: string
  editing?: boolean // Client-side specific
  cards: Card[]
}