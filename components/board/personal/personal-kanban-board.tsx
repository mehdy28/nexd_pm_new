// components/board/personal/personal-kanban-board.tsx
"use client"

import { useMemo, useRef, useState, useCallback, useEffect } from "react"
import type { Card, Column } from "../kanban-types"
import { KanbanSortableColumn } from "../kanban-sortable-column"
import { KanbanSortableCard } from "./personal-kanban-sortable-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { Loader2 } from "lucide-react"
import { useTaskDetails } from "@/hooks/personal/useTaskDetails"
import { TaskDetailSheet } from "@/components/personal/personalTaskDetailSheet"

import { TaskUI } from "@/hooks/personal/useMyTasksAndSections"
import type { TaskStatus } from "@prisma/client"

type OverlayState =
  | {
      kind: "card"
      card: Card
      width?: number
      height?: number
    }
  | {
      kind: "column"
      column: Column
      width?: number
      height?: number
    }
  | null

// This type represents the shape of the task object used by the generic TaskDetailSheet.
// It helps resolve the conflict between the hook's TaskUI and the sheet's expected props.
type SheetTaskUI = {
  id: string
  title: string
  description: string | null
  priority: "LOW" | "MEDIUM" | "HIGH"
  startDate: string | null
  endDate: string | null
  points: number | null
  sectionId: string
  assignee?: any | null
  status?: TaskStatus
  completed?: boolean
}

interface PersonalKanbanBoardProps {
  initialColumns: Column[]
  onColumnsChange: (newColumns: Column[]) => void
  onCreateColumn: (title: string) => void
  onUpdateColumn: (columnId: string, title: string) => void
  onDeleteColumn: (columnId: string) => void
  onCreateCard: (columnId: string, title: string) => void
  onUpdateCard: (columnId: string, cardId: string, updates: Partial<TaskUI & { personalSectionId?: string }>) => void
  onDeleteCard: (columnId: string, cardId: string) => void
  isMutating: boolean
  isCreatingColumn: boolean
}

export function PersonalKanbanBoard({
  initialColumns,
  onColumnsChange,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  isMutating,
  isCreatingColumn,
}: PersonalKanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<{ columnId: string; cardId: string } | null>(null)
  const [overlay, setOverlay] = useState<OverlayState>(null)

  const rowRef = useRef<HTMLDivElement | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const { isMutating: isTaskDetailsMutating } = useTaskDetails(selected?.cardId || null)

  const openDrawer = useCallback((columnId: string, cardId: string) => {
    setSelected({ columnId, cardId })
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setSelected(null)
  }, [])

  useEffect(() => {
    setColumns(initialColumns)
  }, [initialColumns])

  const handleUpdateTask = useCallback(
    async (sectionId: string, taskId: string, updates: Partial<SheetTaskUI>) => {
      // Create an update object that is compatible with the `Card` type.
      const cardCompatibleUpdates: Partial<Card> = { ...updates }

      // Coerce `description` from `string | null` to `string | undefined`.
      if ("description" in updates) {
        cardCompatibleUpdates.description = updates.description === null ? undefined : updates.description
      }

      // Coerce `points` from `number | null` to `number`.
      if ("points" in updates) {
        cardCompatibleUpdates.points = updates.points ?? 0
      }

      // Optimistically update the local state for an instant UI change on the card.
      setColumns(prev =>
        prev.map(column =>
          column.id === sectionId
            ? {
                ...column,
                cards: column.cards.map(card => (card.id === taskId ? { ...card, ...cardCompatibleUpdates } : card)),
              }
            : column
        )
      )

      // Then, trigger the actual mutation in the background.
      await onUpdateCard(sectionId, taskId, updates)
    },
    [onUpdateCard]
  )

  const handleDeleteRequest = useCallback(
    (sectionId: string, task: { id: string }) => {
      onDeleteCard(sectionId, task.id)
      setDrawerOpen(false)
    },
    [onDeleteCard]
  )

  function findColumnIdByCardId(cardId: string) {
    return columns.find(c => c.cards.some(k => k.id === cardId))?.id
  }
  function indexOfCard(columnId: string, cardId: string) {
    const col = columns.find(c => c.id === columnId)
    return col ? col.cards.findIndex(k => k.id === cardId) : -1
  }

  function handleDragStart(e: DragStartEvent) {
    const activeType = e.active.data.current?.type as string | undefined
    const rect = e.active.rect?.current as any
    if (activeType === "card") {
      const card = columns.flatMap(c => c.cards).find(k => k.id === String(e.active.id))
      if (card) setOverlay({ kind: "card", card, width: rect?.width, height: rect?.height })
    } else if (activeType === "column") {
      const col = columns.find(c => c.id === String(e.active.id))
      if (col) setOverlay({ kind: "column", column: col, width: rect?.width, height: rect?.height })
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const activeType = active.data.current?.type as string | undefined
    const activeId = String(active.id)
    const overId = over?.id ? String(over.id) : null

    setOverlay(null)
    if (!overId || activeId === overId) return

    if (activeType === "column") {
      // *** FIX STARTS HERE ***
      const fromIndex = columns.findIndex(c => c.id === activeId)
      const toIndex = columns.findIndex(c => c.id === overId)

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        const reorderedColumns = arrayMove(columns, fromIndex, toIndex)
        // First, update the local state for a smooth UI transition
        setColumns(reorderedColumns)
        // THEN, call the function prop to trigger the mutation (the side effect)
        onColumnsChange(reorderedColumns)
      }
      return
      // *** FIX ENDS HERE ***
    }

    if (activeType === "card") {
      const fromColumnId = findColumnIdByCardId(activeId)
      if (!fromColumnId) return

      let toColumnId: string | undefined
      const overIsColumn = columns.some(c => c.id === overId)

      if (overIsColumn) {
        toColumnId = overId
      } else {
        toColumnId = findColumnIdByCardId(overId)
      }
      if (!toColumnId) return

      const fromIndex = indexOfCard(fromColumnId, activeId)
      const toIndex = overIsColumn ? columns.find(c => c.id === toColumnId)!.cards.length : indexOfCard(toColumnId, overId)

      if (fromColumnId === toColumnId && fromIndex === toIndex) return

      // Optimistically update local UI
      setColumns(prev => {
        const next = prev.map(c => ({ ...c, cards: [...c.cards] }))
        const fromCol = next.find(c => c.id === fromColumnId)!
        const toCol = next.find(c => c.id === toColumnId)!
        const [moved] = fromCol.cards.splice(fromIndex, 1)

        // FIX: If moving to a new column, add the card to the TOP.
        if (fromColumnId !== toColumnId) {
          toCol.cards.unshift(moved)
        } else {
          // If staying in the same column, respect the precise drop index.
          toCol.cards.splice(toIndex, 0, moved)
        }

        return next
      })

      // If card moved to a new column, notify the parent to trigger mutation
      if (fromColumnId !== toColumnId) {
        onUpdateCard(fromColumnId, activeId, { personalSectionId: toColumnId })
      }
      // NOTE: A mutation for reordering within the same column would be needed here.
    }
  }

  const isBoardMutating = isMutating || isTaskDetailsMutating

  const sheetTaskProp = useMemo(() => {
    if (!selected) return null
    return { sectionId: selected.columnId, taskId: selected.cardId }
  }, [selected])

  return (
    <div className="page-scroller">
      <div className="flex items-center  pr-6 pl-6 pt-3 gap-3">
        <Button
          onClick={() => onCreateColumn("New Column")}
          className="bg-[#4ab5ae] text-white hover:bg-[#419d97] h-9 rounded-md"
          // Disable if the board is mutating OR a column is being created.
          disabled={isCreatingColumn}
        >
          {/* Only show spinner when a column is being created. */}
          {isCreatingColumn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}+ Add column
        </Button>
        {/* <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." disabled={isBoardMutating} />
        </div> */}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={rowRef} className="columns-scroll" aria-label="Board columns">
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map(column => (
              <KanbanSortableColumn
                key={column.id}
                column={column}
                onAddCard={() => onCreateCard(column.id, "New Task")}
                onTitleChange={title => onUpdateColumn(column.id, title)}
                onDeleteColumn={() => onDeleteColumn(column.id)}
                isMutating={isMutating}
                onStartTitleEdit={() => {}}
                onStopTitleEdit={() => {}}
              >
                <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {column.cards.map(card => (
                    <KanbanSortableCard
                      key={card.id}
                      columnId={column.id}
                      card={card}
                      onOpen={() => !card.editing && openDrawer(column.id, card.id)}
                      onStartInline={() =>
                        setColumns(prev =>
                          prev.map(c =>
                            c.id === column.id
                              ? { ...c, cards: c.cards.map(k => (k.id === card.id ? { ...k, editing: true } : k)) }
                              : c
                          )
                        )
                      }
                      onFinishInline={patch => {
                        onUpdateCard(column.id, card.id, patch)
                        setColumns(prev =>
                          prev.map(c =>
                            c.id === column.id
                              ? {
                                  ...c,
                                  cards: c.cards.map(k =>
                                    k.id === card.id ? { ...k, ...patch, editing: false } : k
                                  ),
                                }
                              : c
                          )
                        )
                      }}
                      onDeleteCard={() => onDeleteCard(column.id, card.id)}
                      isMutating={isMutating}
                    />
                  ))}
                </SortableContext>
              </KanbanSortableColumn>
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {overlay?.kind === "card" && overlay.card ? (
            <KanbanSortableCard
              card={overlay.card}
              columnId={findColumnIdByCardId(overlay.card.id) || ""}
              onOpen={() => {}}
              onStartInline={() => {}}
              onFinishInline={() => {}}
              onDeleteCard={() => {}}
              isMutating={false}
            />
          ) : overlay?.kind === "column" && overlay.column ? (
            <KanbanSortableColumn
              column={overlay.column}
              onAddCard={() => {}}
              onTitleChange={() => {}}
              onDeleteColumn={() => {}}
              isMutating={false}
              onStartTitleEdit={() => {}}
              onStopTitleEdit={() => {}}
            >
              <SortableContext items={overlay.column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {overlay.column.cards.map(card => (
                  <KanbanSortableCard
                    key={card.id}
                    columnId={overlay.column.id}
                    card={card}
                    onOpen={() => {}}
                    onStartInline={() => {}}
                    onFinishInline={() => {}}
                    onDeleteCard={() => {}}
                    isMutating={false}
                  />
                ))}
              </SortableContext>
            </KanbanSortableColumn>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailSheet
        sheetTask={sheetTaskProp}
        onClose={closeDrawer}
        onUpdateTask={handleUpdateTask}
        onRequestDelete={handleDeleteRequest}
        availableAssignees={[]}
        isTaskMutating={isBoardMutating}
      />
    </div>
  )
}