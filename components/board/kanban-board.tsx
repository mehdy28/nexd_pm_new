// components/board/kanban-board.tsx
"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
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
import { ChevronDown, Loader2, Trash2, EllipsisVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { UserAvatarPartial, PriorityUI } from "@/hooks/useProjectTasksAndSections";
import { useKanbanMutations } from "@/hooks/useKanbanMutations";

const priorityDot: Record<PriorityUI, string> = {
  Low: "bg-green-500",
  Medium: "bg-orange-500",
  High: "bg-red-500",
};

type OverlayState = {
  kind: "card";
  card: Card;
  width?: number;
  height?: number;
} | {
  kind: "column";
  column: Column;
  width?: number;
  height?: number;
} | null;


interface KanbanBoardProps {
  projectId: string;
  initialColumns: Column[];
  sprintOptions: { id: string; name: string }[];
  currentSprintId?: string | null;
  onSprintChange: (sprintId: string | null) => void;
  availableAssignees: UserAvatarPartial[];
}

export function KanbanBoard({
  projectId,
  initialColumns,
  sprintOptions,
  currentSprintId,
  onSprintChange,
  availableAssignees,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<{ columnId: string; cardId: string } | null>(null)
  const [overlay, setOverlay] = useState<OverlayState>(null)

  const rowRef = useRef<HTMLDivElement | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const {
    createColumn,
    updateColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    isMutating,
    mutationError,
  } = useKanbanMutations(projectId, currentSprintId);


  const openDrawer = useCallback((columnId: string, cardId: string) => {
    setSelected({ columnId, cardId });
    setDrawerOpen(true);
  }, []);

  // --- ADJUSTED useEffect for initialColumns synchronization with added logs ---
  useEffect(() => {
    console.log("--- useEffect: Initializing sync check ---");
    console.log("Current local columns state (IDs, order):", columns.map(c => ({ id: c.id, order: c.order, name: c.name })));
    console.log("Incoming initialColumns prop (IDs, order):", initialColumns.map(c => ({ id: c.id, order: c.order, name: c.name })));
    console.log("Current sprint ID:", currentSprintId);

    const isSprintIdChanged =
        currentSprintId && columns.some(col => col.sprintId && col.sprintId !== currentSprintId);
    if (isSprintIdChanged) {
        console.log("Reason for sync: Sprint ID changed.");
    }

    const hasCoreStructuralChanges =
        columns.length !== initialColumns.length ||
        columns.some((col, index) =>
            !initialColumns[index] ||
            col.id !== initialColumns[index].id
        );
    if (hasCoreStructuralChanges) {
        console.log("Reason for sync: Core structural changes detected (length or ID mismatch at position).");
    }

    const isEmptyInitialColumnsAndLocalHasData = initialColumns.length === 0 && columns.length > 0;
    if (isEmptyInitialColumnsAndLocalHasData) {
        console.log("Reason for sync: initialColumns is empty, but local state has data.");
    }

    const isInitialLoad = columns.length === 0 && initialColumns.length > 0;
    if (isInitialLoad) {
        console.log("Reason for sync: Initial load (local state empty, initialColumns has data).");
    }

    if (isSprintIdChanged || hasCoreStructuralChanges || isEmptyInitialColumnsAndLocalHasData || isInitialLoad) {
        console.log("[sprint] KANBAN_BOARD: PERFORMING FULL SYNC. Overwriting local columns with initialColumns.");
        setColumns(initialColumns);
    } else {
        console.log("[sprint] KANBAN_BOARD: No significant structural or sprint change detected. Retaining optimistic state.");
    }
    console.log("--- useEffect: Sync check finished ---");
  }, [initialColumns, currentSprintId]); 

  const activeCard: Card | undefined = useMemo(() => {
    if (!selected) return
    return columns.find((c) => c.id === selected.columnId)?.cards.find((k) => k.id === selected.cardId)
  }, [selected, columns])

  const [editingCardLocal, setEditingCardLocal] = useState<Card | null>(null);
  useEffect(() => {
    if (activeCard) {
      setEditingCardLocal(activeCard);
    } else {
      setEditingCardLocal(null);
    }
  }, [activeCard]);


  const handleSaveDrawerChanges = async () => {
    if (!selected || !editingCardLocal || !activeCard) return;

    const patch: Partial<Card> = {};
    if (editingCardLocal.title !== activeCard.title) patch.title = editingCardLocal.title;
    if (editingCardLocal.description !== activeCard.description) patch.description = editingCardLocal.description;
    if (editingCardLocal.priority !== activeCard.priority) patch.priority = editingCardLocal.priority;
    if (editingCardLocal.points !== activeCard.points) patch.points = editingCardLocal.points;
    if (editingCardLocal.due !== activeCard.due) patch.due = editingCardLocal.due;
    if (editingCardLocal.assignee?.id !== activeCard.assignee?.id) patch.assignee = editingCardLocal.assignee;

    if (Object.keys(patch).length > 0) {
      await updateCard(selected.columnId, selected.cardId, patch);
    }
    setDrawerOpen(false);
  };


  function findColumnIdByCardId(cardId: string) {
    return columns.find((c) => c.cards.some((k) => k.id === cardId))?.id
  }
  function indexOfCard(columnId: string, cardId: string) {
    const col = columns.find((c) => c.id === columnId)
    return col ? col.cards.findIndex((k) => k.id === cardId) : -1
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

  function handleDragEnd(event: DragEndEvent) {
    const activeType = event.active.data.current?.type as string | undefined
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    
    console.log("--- handleDragEnd: Drag ended ---");
    console.log(`Active type: ${activeType}, Active ID: ${activeId}, Over ID: ${overId}`);

    if (!overId) {
      console.log("handleDragEnd: No overId, resetting overlay.");
      setOverlay(null)
      return
    }

    if (activeType === "column") {
      const fromIndex = columns.findIndex((c) => c.id === activeId)
      const toIndex = columns.findIndex((c) => c.id === overId)

      console.log(`Column drag: fromIndex=${fromIndex}, toIndex=${toIndex}`);

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        console.log("Column drag: Invalid indices or no effective change, resetting overlay.");
        setOverlay(null)
        return;
      }

      setColumns((prev) => {
        console.log("Column drag: Optimistically updating local columns state.");
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)

        console.log("Column drag: New optimistic local columns order (IDs, order):", next.map(c => ({ id: c.id, order: c.order, name: c.name })));

        next.forEach((col, idx) => {
            // Apply optimistic order to the local state here as well.
            // This is crucial for the useEffect's 'hasCoreStructuralChanges' logic.
            // If the local 'order' matches the new index, and 'id' matches initialColumns[index].id,
            // then the useEffect should ideally NOT re-sync based purely on 'order' differences.
            // But since 'order' is part of the state, we update it.
            col.order = idx; 
            
            // Send to backend. These are asynchronous calls.
            if (col.order !== undefined) { 
                console.log(`[sprint] KANBAN_BOARD: Calling backend updateColumn for ${col.name} (ID: ${col.id}) to order ${idx}.`);
                updateColumn(col.id, col.name, idx); 
            }
        });
        return next
      })
      setOverlay(null);
      console.log("--- handleDragEnd: Column drag processing complete ---");
      return;
    }

    if (activeType === "card") {
      const fromColumnId = findColumnIdByCardId(activeId)
      if (!fromColumnId) {
        console.log("Card drag: Could not find source column for card, resetting overlay.");
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
          console.log("Card drag: Could not find destination column for card, resetting overlay.");
          setOverlay(null)
          return
        }
        toIndex = indexOfCard(toColumnId, overId)
        if (toIndex < 0) toIndex = 0
      }

      const fromIndex = indexOfCard(fromColumnId, activeId)
      if (fromIndex < 0 || !toColumnId) {
        console.log("Card drag: Invalid indices or no destination column, resetting overlay.");
        setOverlay(null)
        return
      }
      if (fromColumnId === toColumnId && fromIndex === toIndex) {
        console.log("Card drag: Card dropped in same spot, no change, resetting overlay.");
        setOverlay(null)
        return
      }

      // Optimistic UI update for card movement
      setColumns((prev) => {
        console.log("Card drag: Optimistically updating local cards state.");
        const next = prev.map((c) => ({ ...c, cards: [...c.cards] }))
        const fromCol = next.find((c) => c.id === fromColumnId)!
        const toCol = next.find((c) => c.id === toColumnId)!
        const [moved] = fromCol.cards.splice(fromIndex, 1)

        let insertAt = toIndex
        if (fromColumnId === toColumnId && toIndex > fromIndex) insertAt = toIndex - 1

        toCol.cards.splice(insertAt, 0, moved)
        
        // If the column changed, trigger backend update for sectionId
        if (fromColumnId !== toColumnId) {
            console.log(`[sprint] KANBAN_BOARD: Calling backend updateCard for ${moved.title} (ID: ${moved.id}) to section ${toCol.name}.`);
            updateCard(fromColumnId, moved.id, { sectionId: toCol.id });
        }
        // Note: For card reordering within the same column, we're currently not sending an update.
        // If card order matters for the backend, an update for card.order would be needed here too.

        return next
      })
    }

    setOverlay(null)
    console.log("--- handleDragEnd: Finished processing ---");
  }

  const currentSprintName = useMemo(() => {
    return sprintOptions.find(s => s.id === currentSprintId)?.name || "";
  }, [currentSprintId, sprintOptions]);

  const handleAddCard = useCallback(async (columnId: string, title: string) => {
    console.log(`Calling createCard for column ${columnId} with title "${title}"`);
    await createCard(columnId, title);
  }, [createCard]);

  const handleUpdateColumnTitle = useCallback(async (columnId: string, title: string) => {
    const currentColumn = columns.find(c => c.id === columnId);
    console.log(`Calling updateColumn for title change for column ${columnId} to "${title}"`);
    await updateColumn(columnId, title, currentColumn?.order);
  }, [updateColumn, columns]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    console.log(`Calling deleteColumn for column ${columnId}`);
    await deleteColumn(columnId);
  }, [deleteColumn]);

  const handleDeleteCard = useCallback(async (cardId: string) => {
    const currentColumnId = findColumnIdByCardId(cardId);
    if (currentColumnId) {
        console.log(`Calling deleteCard for card ${cardId} from column ${currentColumnId}`);
        await deleteCard(cardId);
    } else {
        console.warn(`[sprint] KANBAN_BOARD: Could not find column for card ${cardId} to delete. Calling deleteCard anyway.`);
        await deleteCard(cardId);
    }
    setDrawerOpen(false);
  }, [deleteCard, columns]);


  return (
    <div className="page-scroller">
      {mutationError && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
              Error performing mutation: {mutationError.message}
          </div>
      )}
      <div className="flex items-center  pr-6 pl-6 pt-3 gap-3">
        <Button onClick={() => createColumn("New Column")} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isMutating}>
          {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          + Add column
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent" disabled={isMutating}>
              {currentSprintName}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            {sprintOptions.length > 0 ? (
              <>
                {sprintOptions.map((sprint) => (
                  <DropdownMenuItem key={sprint.id} onClick={() => onSprintChange(sprint.id)} disabled={isMutating}>
                    {sprint.name}
                  </DropdownMenuItem>
                ))}
              </>
            ) : (
              <DropdownMenuItem disabled>No Sprints Available</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
          <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <KanbanSortableColumn
                key={column.id}
                column={column}
                onAddCard={() => handleAddCard(column.id, "New Task")}
                onTitleChange={(title) => handleUpdateColumnTitle(column.id, title)}
                onStartTitleEdit={() => {}}
                onStopTitleEdit={() => {}}
                onDeleteColumn={() => handleDeleteColumn(column.id)}
                isMutating={isMutating}
              >
                <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {column.cards.map((card) => (
                    <KanbanSortableCard
                      key={card.id}
                      columnId={column.id}
                      card={card}
                      onOpen={() => !card.editing && openDrawer(column.id, card.id)}
                      onStartInline={() => setColumns(prev => prev.map(c => c.id === column.id ? { ...c, cards: c.cards.map(k => k.id === card.id ? { ...k, editing: true } : k) } : c))}
                      onFinishInline={(patch) => {
                        updateCard(column.id, card.id, patch); 
                        setColumns(prev => prev.map(c => c.id === column.id ? { ...c, cards: c.cards.map(k => k.id === card.id ? { ...k, ...patch, editing: false } : k) } : c));
                      }}
                      onDeleteCard={() => handleDeleteCard(card.id)}
                      isMutating={isMutating}
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
              <div className="column-body">
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white">
          <SheetHeader>
            <SheetTitle className="text-foreground">Task details</SheetTitle>
            <SheetDescription className="text-muted-foreground">Edit the card fields below.</SheetDescription>
          </SheetHeader>

          {activeCard && editingCardLocal ? (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Title</label>
                <Input
                  value={editingCardLocal.title}
                  onChange={(e) => setEditingCardLocal(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="bg-white border-border"
                  disabled={isMutating}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={editingCardLocal.description || ""}
                  onChange={(e) => setEditingCardLocal(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={6}
                  className="bg-white border-border resize-none"
                  disabled={isMutating}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <Select
                    value={editingCardLocal.priority || "Low"}
                    onValueChange={(v: PriorityUI) =>
                      setEditingCardLocal(prev => prev ? { ...prev, priority: v } : null)
                    }
                    disabled={isMutating}
                  >
                    <SelectTrigger className="h-9 w-full bg-white border-border">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {(["Low", "Medium", "High"] as PriorityUI[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", priorityDot[p])} />
                            {p}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Story Points</label>
                  <Input
                    type="number"
                    value={editingCardLocal.points ?? ""}
                    onChange={(e) => {
                      setEditingCardLocal(prev => prev ? { ...prev, points: Number.isFinite(Number.parseInt(e.target.value)) ? Number.parseInt(e.target.value) : null } : null);
                    }}
                    className="bg-white border-border"
                    min={0}
                    disabled={isMutating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Due Date</label>
                <Input
                  type="date"
                  value={editingCardLocal.due || ""}
                  onChange={(e) => {
                    setEditingCardLocal(prev => prev ? { ...prev, due: e.target.value } : null);
                  }}
                  className="bg-white border-border"
                  disabled={isMutating}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Assignee</label>
                <Select
                  value={editingCardLocal.assignee?.id || "null"}
                  onValueChange={(v) =>
                    setEditingCardLocal(prev => prev ? { ...prev, assignee: availableAssignees.find(a => a.id === v) || null } : null)
                  }
                  disabled={isMutating}
                >
                  <SelectTrigger className="h-9 w-full bg-white border-border">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Unassigned</SelectItem>
                    <DropdownMenuSeparator />
                    {availableAssignees.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={a.avatar || undefined} />
                            <AvatarFallback className="text-xs">{`${a.firstName?.[0] || ''}${a.lastName?.[0] || ''}` || '?'}</AvatarFallback>
                          </Avatar>
                          <span>{a.firstName} {a.lastName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SheetFooter className="pt-4 flex-row justify-between">
                <Button variant="destructive" onClick={() => {
                  if (selected) handleDeleteCard(selected.cardId);
                  setDrawerOpen(false);
                }} disabled={isMutating} className="bg-red-600 hover:bg-red-700">
                  {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Delete Task
                </Button>
                <SheetClose asChild>
                  <Button type="button" onClick={handleSaveDrawerChanges} disabled={isMutating} className="bg-primary text-white hover:bg-primary/90">
                    {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
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