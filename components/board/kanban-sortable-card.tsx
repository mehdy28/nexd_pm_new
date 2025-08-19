"use client"

import type React from "react"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Card } from "./kanban-types"
import { KanbanCard } from "./kanban-card"

export function KanbanSortableCard({
  columnId,
  card,
  onOpen,
  onFinishInline,
  onStartInline,
}: {
  columnId: string
  card: Card
  onOpen: () => void
  onFinishInline: (patch: Partial<Card>) => void
  onStartInline: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", columnId },
    animateLayoutChanges: (args) => args.isSorting || args.wasDragging,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: "transform",
    opacity: isDragging ? 0.2 : 1,
    cursor: card.editing ? "text" : "grab",
    pointerEvents: isDragging ? "none" : "auto",
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard card={card} onOpen={onOpen} onFinishInline={onFinishInline} onStartInline={onStartInline} />
    </div>
  )
}
