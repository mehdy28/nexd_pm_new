// components/board/personal-kanban-board.tsx

"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import type { Card, Column } from "../kanban-types"
import { KanbanSortableColumn } from "../kanban-sortable-column"
import { KanbanSortableCard } from "../kanban-sortable-card"
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
} from "@dnd-kit/sortable"
import { Loader2 } from "lucide-react"

import { usePersonalKanbanMutations } from "@/hooks/personal/usePersonalKanbanMutations"
import { useTaskDetails } from "@/hooks/personal/useTaskDetails"
import { TaskDetailSheet } from "@/components/modals/task-detail-sheet"
import { TaskUI } from "@/hooks/personal/useMyTasksAndSections"

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

interface PersonalKanbanBoardProps {
  initialColumns: Column[]
}

export function PersonalKanbanBoard({ initialColumns }: PersonalKanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<{ columnId: string; cardId: string } | null>(null)
  const [overlay, setOverlay] = useState<OverlayState>(null)
  const [editingCardLocal, setEditingCardLocal] = useState<Card | null>(null)

  const rowRef = useRef<HTMLDivElement | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const {
    createColumn,
    updateColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    isMutating: isKanbanMutating,
    mutationError,
  } = usePersonalKanbanMutations()

  const { taskDetails, isMutating: isTaskDetailsMutating } = useTaskDetails(selected?.cardId || null)

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

  useEffect(() => {
    if (taskDetails) {
      setEditingCardLocal({
        id: taskDetails.id,
        title: taskDetails.title,
        description: taskDetails.description,
        priority: taskDetails.priority,
        points: taskDetails.points,
        due: taskDetails.dueDate,
        assignee: null, // Personal tasks have no assignee
        editing: false,
      })
    } else {
      setEditingCardLocal(null)
    }
  }, [taskDetails])

  const handleUpdateTask = useCallback(
    async (sectionId: string, taskId: string, updates: Partial<TaskUI>) => {
      await updateCard(sectionId, taskId, updates)
    },
    [updateCard]
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
    const activeType = event.active.data.current?.type as string | undefined
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    setOverlay(null)
    if (!overId) return

    if (activeType === "column") {
      const fromIndex = columns.findIndex(c => c.id === activeId)
      const toIndex = columns.findIndex(c => c.id === overId)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return

      setColumns(prev => {
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        next.forEach((col, idx) => {
          col.order = idx
          if (col.order !== undefined) updateColumn(col.id, undefined, idx)
        })
        return next
      })
      return
    }

    if (activeType === "card") {
      const fromColumnId = findColumnIdByCardId(activeId)
      if (!fromColumnId) return
      let toColumnId: string | undefined
      let toIndex = 0
      const overIsColumn = columns.some(c => c.id === overId)
      if (overIsColumn) {
        toColumnId = overId
        toIndex = columns.find(c => c.id === toColumnId)!.cards.length
      } else {
        toColumnId = findColumnIdByCardId(overId)
        if (!toColumnId) return
        toIndex = indexOfCard(toColumnId, overId)
        if (toIndex < 0) toIndex = 0
      }
      const fromIndex = indexOfCard(fromColumnId, activeId)
      if (fromIndex < 0 || !toColumnId || (fromColumnId === toColumnId && fromIndex === toIndex)) return

      setColumns(prev => {
        const next = prev.map(c => ({ ...c, cards: [...c.cards] }))
        const fromCol = next.find(c => c.id === fromColumnId)!
        const toCol = next.find(c => c.id === toColumnId)!
        const [moved] = fromCol.cards.splice(fromIndex, 1)
        let insertAt = toIndex
        if (fromColumnId === toColumnId && toIndex > fromIndex) insertAt = toIndex - 1
        toCol.cards.splice(insertAt, 0, moved)
        if (fromColumnId !== toColumnId) {
          updateCard(toColumnId, moved.id, { sectionId: toCol.id })
        }
        return next
      })
    }
  }

  const handleAddCard = useCallback(
    async (columnId: string, title: string) => await createCard(columnId, title),
    [createCard]
  )
  const handleUpdateColumnTitle = useCallback(
    async (columnId: string, title: string) => {
      const currentColumn = columns.find(c => c.id === columnId)
      await updateColumn(columnId, title, currentColumn?.order)
    },
    [updateColumn, columns]
  )
  const handleDeleteColumn = useCallback(
    async (columnId: string) => await deleteColumn(columnId),
    [deleteColumn]
  )
  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      await deleteCard(cardId)
      setDrawerOpen(false)
    },
    [deleteCard]
  )
  const handleDeleteRequest = useCallback(
    (sectionId: string, task: TaskUI) => {
      handleDeleteCard(task.id)
    },
    [handleDeleteCard]
  )

  const isMutating = isKanbanMutating || isTaskDetailsMutating

  const sheetTaskProp = useMemo(() => {
    if (!selected) return null
    return { sectionId: selected.columnId, taskId: selected.cardId }
  }, [selected])

  const initialTaskForSheet = useMemo(() => {
    if (!editingCardLocal || !selected) return null
    return {
      ...editingCardLocal,
      id: editingCardLocal.id,
      sectionId: selected.columnId,
      assignee: null,
      completed: false, // Kanban doesn't use this field directly
      status: "TODO", // Status is derived from column, not needed here
    }
  }, [editingCardLocal, selected])

  return (
    <div className="page-scroller">
      {mutationError && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          Error performing mutation: {mutationError.message}
        </div>
      )}
      <div className="flex items-center  pr-6 pl-6 pt-3 gap-3">
        <Button
          onClick={() => createColumn("New Column")}
          className="bg-[#4ab5ae] text-white h-9 rounded-md"
          disabled={isMutating}
        >
          {isKanbanMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}+ Add column
        </Button>
        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." disabled={isMutating} />
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
          <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map(column => (
              <KanbanSortableColumn
                key={column.id}
                column={column}
                onAddCard={() => handleAddCard(column.id, "New Task")}
                onTitleChange={title => handleUpdateColumnTitle(column.id, title)}
                onDeleteColumn={() => handleDeleteColumn(column.id)}
                isMutating={isKanbanMutating}
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
                        updateCard(column.id, card.id, patch)
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
                      onDeleteCard={() => handleDeleteCard(card.id)}
                      isMutating={isKanbanMutating}
                    />
                  ))}
                </SortableContext>
              </KanbanSortableColumn>
            ))}
          </SortableContext>
        </div>

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
              <div className="column-body"></div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailSheet
        sheetTask={sheetTaskProp}
        initialTaskData={initialTaskForSheet}
        onClose={closeDrawer}
        onUpdateTask={handleUpdateTask}
        onRequestDelete={handleDeleteRequest}
        availableAssignees={[]}
        isTaskMutating={isMutating}
      />
    </div>
  )
}
