"use client"

import { KanbanBoard } from "@/components/board/kanban-board"

interface BoardViewProps {
  projectId?: string
}

export function BoardView({ projectId }: BoardViewProps) {
  return <KanbanBoard projectId={projectId} />
}
