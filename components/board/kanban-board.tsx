"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Card, Column, Priority } from "./kanban-types"
import { KanbanSortableColumn } from "./kanban-sortable-column"
import { KanbanSortableCard } from "./kanban-sortable-card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  MeasuringStrategy,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Removed the 'seed' mock data

type CardOverlay = { kind: "card"; card: Card; width?: number; height?: number }
type ColumnOverlay = { kind: "column"; column: Column; width?: number; height?: number }
type OverlayState = CardOverlay | ColumnOverlay | null

interface KanbanBoardProps {
  projectId?: string;
  initialColumns: Column[]; // New prop for initial data
  sprintOptions: { id: string; name: string }[]; // New prop for sprint options
  currentSprintId?: string | null; // New prop for current sprint
  onSprintChange: (sprintId: string | null) => void; // New prop for changing sprint
  onColumnsChange: (newColumns: Column[]) => void; // New callback for when columns change
}

export function KanbanBoard({
  projectId,
  initialColumns,
  sprintOptions,
  currentSprintId,
  onSprintChange,
  onColumnsChange,
}: KanbanBoardProps) {
  // Initialize columns state with initialColumns prop
  const [columns, setColumns] = useState<Column[]>(initialColumns);

  // Effect to update internal columns state when initialColumns prop changes
  // This is crucial for when the parent hook fetches new data (e.g., sprint changes)
  useEffect(() => {
    // Only update if initialColumns is a different reference or has truly changed content
    // Deep comparison might be needed here if initialColumns reference changes but content doesn't.
    // For now, assuming Apollo's memoization handles this for `initialColumns` from `useProjectTasksAndSections`.
    setColumns(initialColumns);
  }, [initialColumns]);


  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<{ columnId: string; cardId: string } | null>(null)
  const [overlay, setOverlay] = useState<OverlayState>(null)

  // Use the currentSprintId prop for the displayed sprint
  const displaySprintName = sprintOptions.find(s => s.id === currentSprintId)?.name || "Select Sprint";

  const nextCol = useRef(5) // Still useful for new client-side columns
  const nextCard = useRef(12) // Still useful for new client-side cards
  const rowRef = useRef<HTMLDivElement | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Helper to update columns and then call the parent's onColumnsChange callback
  const updateColumnsState = (updater: (prev: Column[]) => Column[]) => {
    setColumns((prev) => {
      const newCols = updater(prev);
      onColumnsChange(newCols); // Notify parent of the change
      return newCols;
    });
  };

  function addColumn() {
    const id = `col-${nextCol.current++}` // Simple ID generation, consider UUID for real apps
    const col: Column = { id, title: "New Column", editing: true, cards: [] }
    updateColumnsState((prev) => [...prev, col])
    setTimeout(() => rowRef.current?.scrollTo({ left: rowRef.current.scrollWidth, behavior: "smooth" }), 0)
  }

  function addCard(columnId: string) {
    const id = `c-${nextCard.current++}` // Simple ID generation, consider UUID for real apps
    updateColumnsState((prev) =>
      prev.map((c) =>
        c.id === columnId ? { ...c, cards: [{ id, title: "New Task", editing: true }, ...c.cards] } : c,
      ),
    )
  }

  function updateColumn(columnId: string, patch: Partial<Column>) {
    updateColumnsState((prev) => prev.map((c) => (c.id === columnId ? { ...c, ...patch } : c)))
  }

  function updateCard(columnId: string, cardId: string, patch: Partial<Card>) {
    updateColumnsState((prev) =>
      prev.map((c) =>
        c.id === columnId ? { ...c, cards: c.cards.map((k) => (k.id === cardId ? { ...k, ...patch } : k)) } : c,
      ),
    )
  }

  function openDrawer(columnId: string, cardId: string) {
    setSelected({ columnId, cardId })
    setDrawerOpen(true)
  }

  const activeCard: Card | undefined = useMemo(() => {
    if (!selected) return
    return columns.find((c) => c.id === selected.columnId)?.cards.find((k) => k.id === selected.cardId)
  }, [selected, columns])

  function findColumnIdByCardId(cardId: string) {
    return columns.find((c) => c.cards.some((k) => k.id === cardId))?.id
  }
  function indexOfCard(columnId: string, cardId: string) {
    const col = columns.find((c) => c.id === columnId)
    return col ? col.cards.findIndex((k) => k.id === cardId) : -1
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeType = event.active.data.current?.type as string | undefined
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId) {
      setOverlay(null)
      return
    }

    // Column reordering
    if (activeType === "column") {
      const fromIndex = columns.findIndex((c) => c.id === activeId)
      const toIndex = columns.findIndex((c) => c.id === overId)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        setOverlay(null)
        return
      }
      updateColumnsState((prev) => {
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        return next
      })
      setOverlay(null)
      return
    }

    // Card moving/reordering
    if (activeType === "card") {
      const fromColumnId = findColumnIdByCardId(activeId)
      if (!fromColumnId) {
        setOverlay(null)
        return
      }

      let toColumnId: string | undefined
      let toIndex = 0

      const overIsColumn = columns.some((c) => c.id === overId)
      if (overIsColumn) {
        toColumnId = overId
        const dest = columns.find((c) => c.id === toColumnId)!
        toIndex = dest.cards.length
      } else {
        toColumnId = findColumnIdByCardId(overId)
        if (!toColumnId) {
          setOverlay(null)
          return
        }
        toIndex = indexOfCard(toColumnId, overId)
        if (toIndex < 0) toIndex = 0
      }

      const fromIndex = indexOfCard(fromColumnId, activeId)
      if (fromIndex < 0 || !toColumnId) {
        setOverlay(null)
        return
      }
      if (fromColumnId === toColumnId && fromIndex === toIndex) {
        setOverlay(null)
        return
      }

      updateColumnsState((prev) => {
        const next = prev.map((c) => ({ ...c, cards: [...c.cards] }))
        const fromCol = next.find((c) => c.id === fromColumnId)!
        const toCol = next.find((c) => c.id === toColumnId)!
        const [moved] = fromCol.cards.splice(fromIndex, 1)

        let insertAt = toIndex
        if (fromColumnId === toColumnId && toIndex > fromIndex) insertAt = toIndex - 1

        toCol.cards.splice(insertAt, 0, moved)
        return next
      })
    }

    setOverlay(null)
  }

  function handleDragStart(e: DragStartEvent) {
    const activeType = e.active.data.current?.type as string | undefined
    const rect = e.active.rect?.current as any
    if (activeType === "card") {
      const activeId = String(e.active.id)
      const fromCol = columns.find((c) => c.cards.some((k) => k.id === activeId))
      const card = fromCol?.cards.find((k) => k.id === activeId)
      if (card) {
        setOverlay({
          kind: "card",
          card,
          width: rect?.width,
          height: rect?.height,
        })
      }
    } else if (activeType === "column") {
      const col = columns.find((c) => c.id === String(e.active.id))
      if (col) {
        setOverlay({
          kind: "column",
          column: col,
          width: rect?.width,
          height: rect?.height,
        })
      }
    }
  }

  return (
    <div className="page-scroller">
      <div className="flex items-center  pr-6 pl-6 pt-3 gap-3">
        <Button onClick={addColumn} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          + Add column
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">
              {displaySprintName} <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            {sprintOptions.length > 0 ? (
              <>
                {sprintOptions.map((sprint) => (
                  <DropdownMenuItem key={sprint.id} onClick={() => onSprintChange(sprint.id)}>
                    {sprint.name}
                  </DropdownMenuItem>
                ))}
                 <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSprintChange(null)}>
                  All Sprints
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled>No Sprints Available</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={rowRef} className="columns-scroll" aria-label="Board columns">
          {/* Columns are sortable horizontally */}
          <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <KanbanSortableColumn
                key={column.id}
                column={column}
                onAddCard={() => addCard(column.id)}
                onTitleChange={(title) => updateColumn(column.id, { title, editing: false })}
                onStartTitleEdit={() => updateColumn(column.id, { editing: true })}
                onStopTitleEdit={() => updateColumn(column.id, { editing: false })}
              >
                {/* Cards are sortable vertically within each column */}
                <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {column.cards.map((card) => (
                    <KanbanSortableCard
                      key={card.id}
                      columnId={column.id}
                      card={card}
                      onOpen={() => !card.editing && openDrawer(column.id, card.id)}
                      onStartInline={() => updateCard(column.id, card.id, { editing: true })}
                      onFinishInline={(patch) => updateCard(column.id, card.id, { ...patch, editing: false })}
                    />
                  ))}
                </SortableContext>
              </KanbanSortableColumn>
            ))}
          </SortableContext>
        </div>

        {/* Unified overlay for smooth dragging (cards and columns) */}
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {overlay?.kind === "card" ? (
            <div
              className="card pointer-events-none shadow-[var(--shadow-lg)]"
              style={{
                width: overlay.width ? `${overlay.width}px` : undefined,
                height: overlay.height ? `${overlay.height}px` : undefined,
              }}
            >
              <div className="flex items-start">
                <span
                  className={
                    overlay.card.priority === "High"
                      ? "badge-high"
                      : overlay.card.priority === "Medium"
                        ? "badge-medium"
                        : "badge-low"
                  }
                >
                  {overlay.card.priority || "Low"}
                </span>
                <div className="ml-auto text-xs text-slate-500">
                  {overlay.card.points ? `${overlay.card.points} SP` : ""}
                </div>
              </div>
              <div className="mt-2 text-sm font-semibold">{overlay.card.title}</div>
              {overlay.card.description ? (
                <div className="mt-1 line-clamp-2 text-xs text-slate-500">{overlay.card.description}</div>
              ) : null}
            </div>
          ) : overlay?.kind === "column" ? (
            <div
              className="column pointer-events-none"
              style={{
                width: overlay.width ? `${overlay.width}px` : undefined,
                height: overlay.height ? `${overlay.height}px` : undefined,
              }}
            >
              <div className="column-header">
                <div className="text-sm font-semibold">{overlay.column.title}</div>
              </div>
              <div className="column-body">
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Right Drawer for details */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white">
          <SheetHeader>
            <SheetTitle className="text-foreground">Task details</SheetTitle>
            <SheetDescription className="text-muted-foreground">Edit the card fields below.</SheetDescription>
          </SheetHeader>

          {activeCard ? (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Title</label>
                <Input
                  value={activeCard.title}
                  onChange={(e) => {
                    if (!selected) return
                    updateCard(selected.columnId, selected.cardId, { title: e.target.value })
                  }}
                  className="bg-white border-border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={activeCard.description || ""}
                  onChange={(e) => {
                    if (!selected) return
                    updateCard(selected.columnId, selected.cardId, { description: e.target.value })
                  }}
                  rows={6}
                  className="bg-white border-border resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground"
                    value={activeCard.priority || "Low"}
                    onChange={(e) => {
                      if (!selected) return
                      updateCard(selected.columnId, selected.cardId, { priority: e.target.value as Priority })
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Story Points</label>
                  <Input
                    type="number"
                    value={activeCard.points ?? 0}
                    onChange={(e) => {
                      if (!selected) return
                      updateCard(selected.columnId, selected.cardId, { points: Number(e.target.value) })
                    }}
                    className="bg-white border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Due</label>
                <Input
                  placeholder="e.g. May 31"
                  value={activeCard.due || ""}
                  onChange={(e) => {
                    if (!selected) return
                    updateCard(selected.columnId, selected.cardId, { due: e.target.value })
                  }}
                  className="bg-white border-border"
                />
              </div>

              <SheetFooter className="pt-4">
                <SheetClose asChild>
                  <Button type="button" className="bg-primary text-white hover:bg-primary/90">
                    Close
                  </Button>
                </SheetClose>
              </SheetFooter>
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">No card selected.</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}