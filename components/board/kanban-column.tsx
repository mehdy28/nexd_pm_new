"use client"

import { Plus, Ellipsis, GripVertical } from "lucide-react"
import type { Column } from "./kanban-types"
import { Input } from "@/components/ui/input"
import React from "react"
import { useDroppable } from "@dnd-kit/core"

export function KanbanColumn({
  column,
  onAddCard,
  onTitleChange,
  onStartTitleEdit,
  onStopTitleEdit,
  children,
  dragHandleProps,
}: {
  column: Column
  onAddCard: () => void
  onTitleChange: (title: string) => void
  onStartTitleEdit: () => void
  onStopTitleEdit: () => void
  children: React.ReactNode
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  React.useEffect(() => {
    if (column.editing) inputRef.current?.focus()
  }, [column.editing])

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  })

  return (
    <div className="column flex h-full min-h-0 flex-col">
      <div
        className="column-header cursor-grab select-none active:cursor-grabbing flex-none"
        {...(dragHandleProps ?? {})}
      >
        <div className="flex items-center gap-2">
          <button
            aria-label="Drag column"
            title="Drag column"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {column.editing ? (
            <Input
              ref={inputRef}
              defaultValue={column.title}
              className="h-8"
              onBlur={(e) => onTitleChange(e.target.value.trim() || "Untitled")}
              onKeyDown={(e) => {
                if (e.key === "Enter") onTitleChange((e.target as HTMLInputElement).value.trim() || "Untitled")
                if (e.key === "Escape") onStopTitleEdit()
              }}
            />
          ) : (
            <button
              className="text-sm font-semibold text-left hover:underline"
              onClick={onStartTitleEdit}
              title="Rename column"
            >
              {column.title}
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label="Add card"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            onClick={onAddCard}
            title="Add card"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            aria-label="More"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            title="More"
          >
            <Ellipsis className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="column-body flex-1 min-h-0 overflow-y-auto"
        style={isOver ? { background: "var(--slate-100)" } : undefined}
      >
        {children}
      </div>
    </div>
  )
}
