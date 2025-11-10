// components/board/kanban-types.ts
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections"

export type Priority = "LOW" | "MEDIUM" | "HIGH"

export type Card = {
  id: string
  title: string
  description?: string
  priority: Priority // Changed to required as it's required in TaskUI (PriorityUI)
  due: string | null // Changed to required string | null to match TaskUI
  points: number // Changed to required to match TaskUI
  editing?: boolean // Client-side specific
  assignee: UserAvatarPartial | null; // Added from TaskUI
  completed: boolean; // Added from TaskUI
}

export type Column = {
  id: string
  title: string
  editing?: boolean // Client-side specific
  cards: Card[]
}