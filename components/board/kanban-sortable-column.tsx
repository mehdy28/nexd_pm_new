"use client"

import type React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Column } from "./kanban-types"
import { KanbanColumn } from "./kanban-column"

export function KanbanSortableColumn({
  column,
  onAddCard,
  onTitleChange,
  onStartTitleEdit,
  onStopTitleEdit,
  children,
}: {
  column: Column
  onAddCard: () => void
  onTitleChange: (title: string) => void
  onStartTitleEdit: () => void
  onStopTitleEdit: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column" },
    animateLayoutChanges: (args) => {
      // Animate siblings during sorting and the dragged item when it was dragging.
      return args.isSorting || args.wasDragging
    },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: "transform",
    // Hide the source column while overlay follows cursor; keep layout space
    opacity: isDragging ? 0 : 1,
    pointerEvents: isDragging ? "none" : "auto",
    zIndex: isDragging ? 15 : "auto",
  }

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanColumn
        column={column}
        onAddCard={onAddCard}
        onTitleChange={onTitleChange}
        onStartTitleEdit={onStartTitleEdit}
        onStopTitleEdit={onStopTitleEdit}
        // Drag handle (header grip)
        dragHandleProps={{ ...attributes, ...listeners }}
      >
        {children}
      </KanbanColumn>
    </div>
  )
}
