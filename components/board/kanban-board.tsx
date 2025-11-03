// // components/board/kanban-board.tsx
// "use client"

// import { useEffect, useMemo, useRef, useState, useCallback } from "react"
// import { formatDistanceToNow } from "date-fns";
// import type { Card, Column } from "./kanban-types"
// import { KanbanSortableColumn } from "./kanban-sortable-column"
// import { KanbanSortableCard } from "./kanban-sortable-card"
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
//   SheetDescription,
//   SheetClose,
// } from "@/components/ui/sheet"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import {
//   DndContext,
//   PointerSensor,
//   useSensor,
//   useSensors,
//   closestCorners,
//   DragOverlay,
//   MeasuringStrategy,
//   type DragEndEvent,
//   type DragStartEvent,
// } from "@dnd-kit/core"
// import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable"
// import {
//   ChevronDown, Loader2, Trash2, EllipsisVertical, X,
//   Pencil, CalendarIcon, ClockIcon, TagIcon, UserRoundIcon, MessageSquareIcon,
//   ActivityIcon, PlusCircle, Bold, Italic, Underline, List, ListOrdered,
//   AlignLeft, AlignCenter, AlignRight, Paperclip, FileText, FileCode,
//   FileImage, FileSpreadsheet, FileWarning, FileArchive, CheckCircle2
// } from "lucide-react"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { cn } from "@/lib/utils";

// import { useKanbanMutations } from "@/hooks/useKanbanMutations";
// import { useTaskDetails } from "@/hooks/useTaskDetails";
// import { UserAvatarPartial, PriorityUI } from "@/hooks/useProjectTasksAndSections";
// import { ActivityUI, CommentUI } from "@/types/taskDetails";


// const priorityDot: Record<PriorityUI, string> = {
//   Low: "bg-green-500",
//   Medium: "bg-orange-500",
//   High: "bg-red-500",
// };

// // Styling for inputs without border, like Jira
// const jiraInputStyle = "focus-visible:ring-0 focus-visible:ring-offset-0 border-none px-0 py-1 shadow-none bg-transparent";
// const jiraSelectTriggerStyle = "focus:ring-0 focus:ring-offset-0 border-none h-auto px-0 py-1 shadow-none bg-transparent";


// type OverlayState = {
//   kind: "card";
//   card: Card;
//   width?: number;
//   height?: number;
// } | {
//   kind: "column";
//   column: Column;
//   width?: number;
//   height?: number;
// } | null;

// // Helper to get file icon based on file type
// const getFileIcon = (fileType: string) => {
//     if (fileType.startsWith('image/')) return <FileImage className="h-5 w-5 text-yellow-500" />;
//     if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
//     if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
//     if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />;
//     if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <FileArchive className="h-5 w-5 text-orange-500" />;
//     if (fileType.includes('zip') || fileType.includes('archive')) return <FileArchive className="h-5 w-5 text-gray-500" />;
//     if (fileType.includes('javascript') || fileType.includes('json') || fileType.includes('typescript') || fileType.includes('html') || fileType.includes('css')) return <FileCode className="h-5 w-5 text-indigo-500" />;
//     return <FileWarning className="h-5 w-5 text-gray-500" />;
// };

// // Helper to safely format dates and prevent crashes from invalid values
// const safeFormatDistanceToNow = (dateInput: string | number | Date | null | undefined): string => {
//   if (!dateInput) { return "unknown time"; }
//   try {
//     const date = new Date(dateInput);
//     if (isNaN(date.getTime())) {
//       console.warn("Invalid date value provided to safeFormatDistanceToNow:", dateInput);
//       return "a while ago";
//     }
//     return formatDistanceToNow(date, { addSuffix: true });
//   } catch (error) {
//     console.error("Error formatting date with formatDistanceToNow:", dateInput, error);
//     return "a while ago";
//   }
// };

// // Helper to transform a Cloudinary URL to force download
// const getDownloadableUrl = (url: string) => {
//     const parts = url.split('/upload/');
//     if (parts.length === 2) { return `${parts[0]}/upload/fl_attachment/${parts[1]}`; }
//     return url;
// };

// interface KanbanBoardProps {
//   projectId: string;
//   initialColumns: Column[];
//   sprintOptions: { id: string; name: string }[];
//   currentSprintId?: string | null;
//   onSprintChange: (sprintId: string | null) => void;
//   availableAssignees: UserAvatarPartial[];
// }

// export function KanbanBoard({
//   projectId,
//   initialColumns,
//   sprintOptions,
//   currentSprintId,
//   onSprintChange,
//   availableAssignees,
// }: KanbanBoardProps) {
//   const [columns, setColumns] = useState<Column[]>(initialColumns);
//   const [drawerOpen, setDrawerOpen] = useState(false);
//   const [selected, setSelected] = useState<{ columnId: string; cardId: string } | null>(null);
//   const [overlay, setOverlay] = useState<OverlayState>(null);
//   const [activeTab, setActiveTab] = useState<"description" | "comments" | "activity" | "attachments">("description");
//   const [newComment, setNewComment] = useState("");
//   const [deleteCommentModalOpen, setDeleteCommentModalOpen] = useState(false);
//   const [commentToDelete, setCommentToDelete] = useState<CommentUI | null>(null);
//   const [editingCardLocal, setEditingCardLocal] = useState<Card | null>(null);

//   const rowRef = useRef<HTMLDivElement | null>(null);
//   const customCommentModalRef = useRef<HTMLDivElement>(null);
//   const descriptionContentEditableRef = useRef<HTMLDivElement>(null);
//   const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

//   const {
//     createColumn, updateColumn, deleteColumn,
//     createCard, updateCard, deleteCard,
//     isMutating: isKanbanMutating,
//     mutationError,
//   } = useKanbanMutations(projectId, currentSprintId);

//   const {
//     taskDetails,
//     loading: taskDetailsLoading,
//     error: taskDetailsError,
//     addComment,
//     deleteComment,
//     uploadAttachment,
//     deleteAttachment,
//     isMutating: isTaskDetailsMutating,
//   } = useTaskDetails(selected?.cardId || null);

//   const openDrawer = useCallback((columnId: string, cardId: string) => {
//     setSelected({ columnId, cardId });
//     setDrawerOpen(true);
//   }, []);

//   useEffect(() => {
//     const isSprintIdChanged = currentSprintId && columns.some(col => col.sprintId && col.sprintId !== currentSprintId);
//     const hasCoreStructuralChanges = columns.length !== initialColumns.length || columns.some((col, index) => !initialColumns[index] || col.id !== initialColumns[index].id);
//     const isEmptyInitialColumnsAndLocalHasData = initialColumns.length === 0 && columns.length > 0;
//     const isInitialLoad = columns.length === 0 && initialColumns.length > 0;

//     if (isSprintIdChanged || hasCoreStructuralChanges || isEmptyInitialColumnsAndLocalHasData || isInitialLoad) {
//       setColumns(initialColumns);
//     }
//   }, [initialColumns, currentSprintId]);

//   useEffect(() => {
//     if (taskDetails) {
//         setEditingCardLocal({
//             id: taskDetails.id,
//             title: taskDetails.title,
//             description: taskDetails.description,
//             priority: taskDetails.priority,
//             points: taskDetails.points,
//             due: taskDetails.dueDate,
//             assignee: taskDetails.assignee,
//             editing: false,
//         });
//         setActiveTab("description");
//     } else {
//         setEditingCardLocal(null);
//     }
//   }, [taskDetails]);

//   const handleSheetSave = useCallback(async () => {
//     if (!selected || !editingCardLocal || !taskDetails) return;

//     const patch: Partial<Card> = {};
//     if (editingCardLocal.title !== taskDetails.title) patch.title = editingCardLocal.title;
//     if (editingCardLocal.description !== taskDetails.description) patch.description = editingCardLocal.description;
//     if (editingCardLocal.priority !== taskDetails.priority) patch.priority = editingCardLocal.priority;
//     if (editingCardLocal.points !== taskDetails.points) patch.points = editingCardLocal.points;
//     if (editingCardLocal.due !== taskDetails.dueDate) patch.due = editingCardLocal.due;
//     if (editingCardLocal.assignee?.id !== taskDetails.assignee?.id) patch.assignee = editingCardLocal.assignee;
    
//     if (Object.keys(patch).length > 0) {
//       await updateCard(selected.columnId, selected.cardId, patch);
//     }
//   }, [selected, editingCardLocal, taskDetails, updateCard]);


//   function findColumnIdByCardId(cardId: string) {
//     return columns.find((c) => c.cards.some((k) => k.id === cardId))?.id
//   }
//   function indexOfCard(columnId: string, cardId: string) {
//     const col = columns.find((c) => c.id === columnId)
//     return col ? col.cards.findIndex((k) => k.id === cardId) : -1
//   }

//   function handleDragStart(e: DragStartEvent) {
//     const activeType = e.active.data.current?.type as string | undefined;
//     const rect = e.active.rect?.current as any;
//     if (activeType === "card") {
//       const card = columns.flatMap(c => c.cards).find(k => k.id === String(e.active.id));
//       if (card) setOverlay({ kind: "card", card, width: rect?.width, height: rect?.height });
//     } else if (activeType === "column") {
//       const col = columns.find((c) => c.id === String(e.active.id));
//       if (col) setOverlay({ kind: "column", column: col, width: rect?.width, height: rect?.height });
//     }
//   }

//   function handleDragEnd(event: DragEndEvent) {
//     const activeType = event.active.data.current?.type as string | undefined
//     const activeId = String(event.active.id)
//     const overId = event.over?.id ? String(event.over.id) : null
//     setOverlay(null)
//     if (!overId) return

//     if (activeType === "column") {
//       const fromIndex = columns.findIndex((c) => c.id === activeId)
//       const toIndex = columns.findIndex((c) => c.id === overId)
//       if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return

//       setColumns((prev) => {
//         const next = [...prev];
//         const [moved] = next.splice(fromIndex, 1);
//         next.splice(toIndex, 0, moved);
//         next.forEach((col, idx) => {
//             col.order = idx;
//             if (col.order !== undefined) updateColumn(col.id, col.name, idx);
//         });
//         return next;
//       });
//       return;
//     }

//     if (activeType === "card") {
//       const fromColumnId = findColumnIdByCardId(activeId);
//       if (!fromColumnId) return;
//       let toColumnId: string | undefined;
//       let toIndex = 0;
//       const overIsColumn = columns.some((c) => c.id === overId);
//       if (overIsColumn) {
//         toColumnId = overId;
//         toIndex = columns.find((c) => c.id === toColumnId)!.cards.length;
//       } else {
//         toColumnId = findColumnIdByCardId(overId);
//         if (!toColumnId) return;
//         toIndex = indexOfCard(toColumnId, overId);
//         if (toIndex < 0) toIndex = 0;
//       }
//       const fromIndex = indexOfCard(fromColumnId, activeId);
//       if (fromIndex < 0 || !toColumnId || (fromColumnId === toColumnId && fromIndex === toIndex)) return;
      
//       setColumns((prev) => {
//         const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
//         const fromCol = next.find((c) => c.id === fromColumnId)!;
//         const toCol = next.find((c) => c.id === toColumnId)!;
//         const [moved] = fromCol.cards.splice(fromIndex, 1);
//         let insertAt = toIndex;
//         if (fromColumnId === toColumnId && toIndex > fromIndex) insertAt = toIndex - 1;
//         toCol.cards.splice(insertAt, 0, moved);
//         if (fromColumnId !== toColumnId) {
//             updateCard(fromColumnId, moved.id, { sectionId: toCol.id });
//         }
//         return next;
//       });
//     }
//   }

//   const currentSprintName = useMemo(() => {
//     return sprintOptions.find(s => s.id === currentSprintId)?.name || "";
//   }, [currentSprintId, sprintOptions]);

//   const handleAddCard = useCallback(async (columnId: string, title: string) => await createCard(columnId, title), [createCard]);
//   const handleUpdateColumnTitle = useCallback(async (columnId: string, title: string) => {
//     const currentColumn = columns.find(c => c.id === columnId);
//     await updateColumn(columnId, title, currentColumn?.order);
//   }, [updateColumn, columns]);
//   const handleDeleteColumn = useCallback(async (columnId: string) => await deleteColumn(columnId), [deleteColumn]);
//   const handleDeleteCard = useCallback(async (cardId: string) => {
//     await deleteCard(cardId);
//     setDrawerOpen(false);
//   }, [deleteCard]);

//   const handleAddComment = useCallback(async () => {
//     if (!newComment.trim()) return;
//     try { await addComment(newComment); setNewComment(""); }
//     catch (err) { console.error("Failed to add comment:", err); }
//   }, [addComment, newComment]);

//   const handleOpenDeleteCommentModal = useCallback((comment: CommentUI) => {
//     setCommentToDelete(comment); setDeleteCommentModalOpen(true);
//   }, []);

//   const handleConfirmCommentDelete = useCallback(async () => {
//     if (!commentToDelete) return;
//     try { await deleteComment(commentToDelete.id); }
//     catch (err) { console.error("Failed to delete comment:", err); }
//     finally { setDeleteCommentModalOpen(false); setCommentToDelete(null); }
//   }, [commentToDelete, deleteComment]);

//   const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = e.target.files; if (!files) return;
//     for (const file of Array.from(files)) {
//       try { await uploadAttachment(file); }
//       catch (err) { console.error("Upload failed for file:", file.name, err); }
//     }
//     if (e.target) e.target.value = '';
//   }, [uploadAttachment]);

//   const handleEditorCommand = useCallback((command: string, value?: string) => {
//     if (descriptionContentEditableRef.current) {
//       descriptionContentEditableRef.current.focus();
//       document.execCommand(command, false, value);
//       if (descriptionContentEditableRef.current) {
//         setEditingCardLocal(prev => prev ? { ...prev, description: descriptionContentEditableRef.current?.innerHTML || '' } : null);
//       }
//     }
//   }, []);

//   const isMutating = isKanbanMutating || isTaskDetailsMutating;


//   return (
//     <div className="page-scroller">
//       {mutationError && (
//           <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
//               Error performing mutation: {mutationError.message}
//           </div>
//       )}
//       <div className="flex items-center  pr-6 pl-6 pt-3 gap-3">
//         <Button onClick={() => createColumn("New Column")} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isMutating}>
//           {isKanbanMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
//           + Add column
//         </Button>
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent" disabled={isMutating}>
//               {currentSprintName}
//               <ChevronDown className="h-4 w-4 text-muted-foreground" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="start">
//             <DropdownMenuLabel>Sprints</DropdownMenuLabel>
//             {sprintOptions.length > 0 ? (
//                 sprintOptions.map((sprint) => (
//                   <DropdownMenuItem key={sprint.id} onClick={() => onSprintChange(sprint.id)} disabled={isMutating}>
//                     {sprint.name}
//                   </DropdownMenuItem>
//                 ))
//             ) : (
//               <DropdownMenuItem disabled>No Sprints Available</DropdownMenuItem>
//             )}
//           </DropdownMenuContent>
//         </DropdownMenu>
//         <div className="ml-auto relative w-[260px]">
//           <Input className="h-9" placeholder="Search tasks..." disabled={isMutating} />
//         </div>
//       </div>

//       <DndContext
//         sensors={sensors}
//         collisionDetection={closestCorners}
//         measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
//         onDragStart={handleDragStart}
//         onDragEnd={handleDragEnd}
//       >
//         <div ref={rowRef} className="columns-scroll" aria-label="Board columns">
//           <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
//             {columns.map((column) => (
//               <KanbanSortableColumn
//                 key={column.id} column={column}
//                 onAddCard={() => handleAddCard(column.id, "New Task")}
//                 onTitleChange={(title) => handleUpdateColumnTitle(column.id, title)}
//                 onDeleteColumn={() => handleDeleteColumn(column.id)}
//                 isMutating={isKanbanMutating} onStartTitleEdit={() => {}} onStopTitleEdit={() => {}}
//               >
//                 <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
//                   {column.cards.map((card) => (
//                     <KanbanSortableCard
//                       key={card.id} columnId={column.id} card={card}
//                       onOpen={() => !card.editing && openDrawer(column.id, card.id)}
//                       onStartInline={() => setColumns(prev => prev.map(c => c.id === column.id ? { ...c, cards: c.cards.map(k => k.id === card.id ? { ...k, editing: true } : k) } : c))}
//                       onFinishInline={(patch) => {
//                         updateCard(column.id, card.id, patch); 
//                         setColumns(prev => prev.map(c => c.id === column.id ? { ...c, cards: c.cards.map(k => k.id === card.id ? { ...k, ...patch, editing: false } : k) } : c));
//                       }}
//                       onDeleteCard={() => handleDeleteCard(card.id)}
//                       isMutating={isKanbanMutating}
//                     />
//                   ))}
//                 </SortableContext>
//               </KanbanSortableColumn>
//             ))}
//           </SortableContext>
//         </div>

//         <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
//           {overlay?.kind === "card" ? (
//             <div className="card pointer-events-none shadow-[var(--shadow-lg)]" style={{ width: overlay.width ? `${overlay.width}px` : undefined, height: overlay.height ? `${overlay.height}px` : undefined }}>
//               <div className="flex items-start">
//                 <span className={ overlay.card.priority === "High" ? "badge-high" : overlay.card.priority === "Medium" ? "badge-medium" : "badge-low" } >
//                   {overlay.card.priority || "Low"}
//                 </span>
//                 <div className="ml-auto text-xs text-slate-500">{overlay.card.points ? `${overlay.card.points} SP` : ""}</div>
//               </div>
//               <div className="mt-2 text-sm font-semibold">{overlay.card.title}</div>
//               {overlay.card.description ? <div className="mt-1 line-clamp-2 text-xs text-slate-500">{overlay.card.description}</div> : null}
//             </div>
//           ) : overlay?.kind === "column" ? (
//             <div className="column pointer-events-none" style={{ width: overlay.width ? `${overlay.width}px` : undefined, height: overlay.height ? `${overlay.height}px` : undefined }}>
//               <div className="column-header"><div className="text-sm font-semibold">{overlay.column.title}</div></div>
//               <div className="column-body"></div>
//             </div>
//           ) : null}
//         </DragOverlay>
//       </DndContext>

//       <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
//         <SheetContent side="right" className="w-full sm:max-w-[800px] bg-gray-100 border-l p-0 flex flex-col h-full max-h-screen">
//           <SheetHeader className="p-6 pt-0 pb-0 border-b bg-white flex-shrink-0 sticky top-0 z-20">
//               {/* THE FIX: Unconditional SheetTitle and SheetDescription for accessibility */}
//               <SheetTitle className="sr-only">
//                   {editingCardLocal ? `Editing Task: ${editingCardLocal.title}` : "Task Details"}
//               </SheetTitle>
//               <SheetDescription className="sr-only">
//                   View and modify task details.
//               </SheetDescription>

//               {/* Conditionally render the VISIBLE part of the header */}
//               {editingCardLocal && (
//                   <div className="flex justify-between items-center">
//                       <Input value={editingCardLocal.title} onChange={(e) => setEditingCardLocal(prev => prev ? { ...prev, title: e.target.value } : null)} className={cn("text-2xl font-bold mt-2", jiraInputStyle, "text-gray-800")} disabled={isMutating}/>
//                       <div className="flex gap-2">
//                           <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteCard(editingCardLocal.id)} title="Delete task"><Trash2 className="h-4 w-4" /></Button>
//                           <SheetClose asChild><Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4 text-gray-500" /><span className="sr-only">Close</span></Button></SheetClose>
//                       </div>
//                   </div>
//               )}
//           </SheetHeader>
          
//           {/* Conditionally render the entire BODY of the sheet */}
//           {editingCardLocal ? (
//             <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 h-full min-h-0">
//               <div className="lg:col-span-2 flex flex-col h-full min-h-0">
//                 <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-2 pb-2 border-b border-gray-200 flex-shrink-0">
//                   <div className="grid w-full grid-cols-4 h-10 bg-gray-200 rounded-md p-1">
//                     <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "description" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("description")}>Description</button>
//                     <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "comments" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("comments")}>Comments</button>
//                     <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "activity" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("activity")}>Activity</button>
//                     <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "attachments" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("attachments")}>Attachments</button>
//                   </div>
//                 </div>
//                 <div className="flex-1 h-full min-h-0">
//                   {taskDetailsLoading ? ( <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div> ) : taskDetailsError ? ( <div className="p-6 text-red-600">Error: {taskDetailsError.message}</div> ) : !taskDetails ? ( <div className="p-6 text-muted-foreground">No task details found.</div> ) : ( <>
//                   {activeTab === "description" && (
//                     <div className="px-6 py-4  h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
//                       <div className="mb-2 p-1 rounded-md bg-white border border-gray-200 flex gap-1 flex-wrap">
//                         <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('bold')} title="Bold"><Bold className="h-4 w-4" /></Button>
//                         <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('italic')} title="Italic"><Italic className="h-4 w-4" /></Button>
//                         <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('underline')} title="Underline"><Underline className="h-4 w-4" /></Button>
//                         <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('insertUnorderedList')} title="Unordered List"><List className="h-4 w-4" /></Button>
//                         <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('insertOrderedList')} title="Ordered List"><ListOrdered className="h-4 w-4" /></Button>
//                         <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('justifyLeft')} title="Align Left"><AlignLeft className="h-4 w-4" /></Button>
//                         <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('justifyCenter')} title="Align Center"><AlignCenter className="h-4 w-4" /></Button>
//                         <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('justifyRight')} title="Align Right"><AlignRight className="h-4 w-4" /></Button>
//                       </div>
//                       <div>
//                         <div ref={descriptionContentEditableRef} contentEditable="true" onInput={(e) => { const target = e.target as HTMLDivElement; setEditingCardLocal(prev => prev ? { ...prev, description: target.innerHTML || '' } : null);}} onFocus={(e) => { const target = e.target as HTMLDivElement; if (target.classList.contains('text-muted-foreground') && target.textContent === 'Add a detailed description...') { target.textContent = ''; target.classList.remove('text-muted-foreground', 'italic');}}} onBlur={(e) => { const target = e.target as HTMLDivElement; if (!target.textContent?.trim() && target.innerHTML?.trim() === '') { target.classList.add('text-muted-foreground', 'italic'); target.textContent = 'Add a detailed description...'; setEditingCardLocal(prev => prev ? { ...prev, description: '' } : null); } else { setEditingCardLocal(prev => prev ? { ...prev, description: target.innerHTML || '' } : null);}}} onKeyDown={(e) => { if (e.key === 'Enter' && descriptionContentEditableRef.current) { e.preventDefault(); if (e.shiftKey) { document.execCommand('insertHTML', false, '<br>'); } else { document.execCommand('insertParagraph', false, ''); }}}} dangerouslySetInnerHTML={{ __html: (editingCardLocal.description && editingCardLocal.description.trim() !== '') ? editingCardLocal.description : 'Add a detailed description...' }} className={cn("text-base w-full p-2 border border-gray-200 rounded-md bg-white text-gray-700", "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", "resize-none break-words", "min-h-[100px]", !editingCardLocal.description && "text-muted-foreground italic")} style={{ whiteSpace: 'pre-wrap' }}></div>
//                       </div>
//                     </div>
//                   )}
//                   {activeTab === "comments" && (
//                     <div className="relative flex flex-col h-full min-h-0">
//                       <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
//                         {taskDetails.comments.map((comment: CommentUI) => (
//                           <div key={comment.id} className="group flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-gray-200">
//                             <Avatar className="h-8 w-8"><AvatarImage src={comment.author.avatar || undefined} /><AvatarFallback className="bg-blue-200 text-blue-800">{`${comment.author.firstName?.[0] || ''}${comment.author.lastName?.[0] || ''}`}</AvatarFallback></Avatar>
//                             <div className="flex-1">
//                               <p className="text-sm font-semibold text-gray-800">{comment.author.firstName} {comment.author.lastName} <span className="text-xs text-muted-foreground font-normal">{safeFormatDistanceToNow(comment.createdAt)}</span></p>
//                               <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
//                             </div>
//                             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleOpenDeleteCommentModal(comment)} disabled={isMutating}><Trash2 className="h-3 w-3 text-red-500"/></Button>
//                           </div>
//                         ))}
//                       </div>
//                       <div className="mt-4 bg-white p-4 border-t border-gray-200 flex-shrink-0">
//                         <div className="flex items-end gap-2">
//                           <Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src="https://github.com/shadcn.png" /><AvatarFallback className="bg-gray-200 text-gray-800">You</AvatarFallback></Avatar>
//                           <Textarea placeholder="Add a comment..." rows={1} value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 resize-none overflow-hidden" style={{ minHeight: '38px' }}/>
//                           <Button size="sm" onClick={handleAddComment} className="h-9 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0" disabled={isMutating || !newComment.trim()}>{isMutating ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Send'}</Button>
//                         </div>
//                       </div>
//                       {commentToDelete && deleteCommentModalOpen && (
//                         <div ref={customCommentModalRef} role="alertdialog" tabIndex={-1} className="absolute inset-0 z-20 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setDeleteCommentModalOpen(false);}}>
//                           <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
//                             <div className="flex flex-col space-y-2 text-center sm:text-left"><h2 className="text-lg font-semibold text-foreground">Delete Comment?</h2><p className="text-sm text-muted-foreground">Are you sure you want to delete this comment? This action cannot be undone.</p></div>
//                             <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
//                               <Button variant="outline" className="mt-2 sm:mt-0" onClick={() => setDeleteCommentModalOpen(false)} disabled={isMutating}>Cancel</Button>
//                               <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmCommentDelete} disabled={isMutating}>{isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Comment"}</Button>
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   )}
//                   {activeTab === "activity" && (
//                     <div className="px-6 py-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
//                       <div className="space-y-4 text-sm text-muted-foreground">{taskDetails.activities.map((activity) => (<ParsedActivityLogItem key={activity.id} activity={activity} />))}</div>
//                     </div>
//                   )}
//                   {activeTab === "attachments" && (
//                     <div className="px-6 py-4 h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
//                       <h3 className="text-lg font-semibold mb-4 text-gray-800">Attachments</h3>
//                       <div className="mb-6 border-2 border-dashed border-gray-300 rounded-md p-6 text-center text-gray-600 hover:border-blue-500 hover:text-blue-700 transition-colors cursor-pointer">
//                         <label htmlFor="file-upload" className="block cursor-pointer"><Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-400" /><span>Drag and drop files here or <span className="font-semibold text-blue-600">browse</span></span><input id="file-upload" type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isMutating}/></label>
//                       </div>
//                       <div className="flex-1 space-y-3">
//                         {taskDetails.attachments.map(attachment => (
//                           <div key={attachment.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
//                             <div className="flex items-center gap-3">{getFileIcon(attachment.fileType)}<a href={getDownloadableUrl(attachment.url)} download={attachment.fileName} rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:underline">{attachment.fileName}</a></div>
//                             <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment" onClick={() => deleteAttachment(attachment.id)} disabled={isMutating}><X className="h-4 w-4 text-gray-500" /></Button>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                   </>)}
//                 </div>
//               </div>

//               <div className="lg:col-span-1 border-l border-gray-200 bg-white pl-6 pr-6 mb-2 mr-2  py-6 flex flex-col flex-shrink-0 min-h-0 rounded-lg">
//                 <div className="space-y-4 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
//                   <h3 className="text-base font-semibold text-gray-800 mb-4">Details</h3>
//                   <div className="flex items-center gap-4 text-sm">
//                     <UserRoundIcon className="h-4 w-4 text-gray-500" />
//                     <div className="flex-1">
//                       <Label htmlFor="assignee-select" className="sr-only">Assignee</Label>
//                       <Select value={editingCardLocal.assignee?.id || "null"} onValueChange={(v) => setEditingCardLocal(prev => prev ? { ...prev, assignee: availableAssignees.find(a => a.id === v) || null } : null)} disabled={isMutating}>
//                         <SelectTrigger id="assignee-select" className={cn("w-full text-gray-700 hover:bg-gray-50 rounded-md py-2 px-3 transition-colors", jiraSelectTriggerStyle)}>
//                           <SelectValue placeholder="Unassigned"><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarImage src={editingCardLocal.assignee?.avatar || undefined} /><AvatarFallback className="text-xs bg-gray-100 text-gray-700">{`${editingCardLocal.assignee?.firstName?.[0] || ''}${editingCardLocal.assignee?.lastName?.[0] || ''}` || '?'}</AvatarFallback></Avatar><span>{editingCardLocal.assignee?.firstName} {editingCardLocal.assignee?.lastName || 'Unassigned'}</span></div></SelectValue>
//                         </SelectTrigger>
//                         <SelectContent className="bg-white border-border">
//                           <SelectItem value="null"><div className="flex items-center gap-2"><Avatar className="h-6 w-6 border bg-gray-100"><AvatarImage src={undefined} /><AvatarFallback className="text-xs text-gray-700">?</AvatarFallback></Avatar><span>Unassigned</span></div></SelectItem><DropdownMenuSeparator />
//                           {availableAssignees.map((a) => (<SelectItem key={a.id} value={a.id}><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarImage src={a.avatar || undefined} /><AvatarFallback className="text-xs bg-gray-100 text-gray-700">{`${a.firstName?.[0] || ''}${a.lastName?.[0] || ''}` || '?'}</AvatarFallback></Avatar><span>{a.firstName} {a.lastName}</span></div></SelectItem>))}
//                         </SelectContent>
//                       </Select>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-4 text-sm">
//                     <TagIcon className="h-4 w-4 text-gray-500" />
//                     <div className="flex-1">
//                       <Label htmlFor="priority-select" className="sr-only">Priority</Label>
//                       <Select value={editingCardLocal.priority} onValueChange={(v: PriorityUI) => setEditingCardLocal(prev => prev ? { ...prev, priority: v } : null)} disabled={isMutating}>
//                         <SelectTrigger id="priority-select" className={cn("w-full text-gray-700 hover:bg-gray-50 rounded-md py-2 px-3 transition-colors", jiraSelectTriggerStyle)}>
//                           <SelectValue><div className="inline-flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[editingCardLocal.priority])} /><span>{editingCardLocal.priority}</span></div></SelectValue>
//                         </SelectTrigger>
//                         <SelectContent className="bg-white border-border">{(["Low", "Medium", "High"] as PriorityUI[]).map((p) => (<SelectItem key={p} value={p}><div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[p])} />{p}</div></SelectItem>))}</SelectContent>
//                       </Select>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-4 text-sm">
//                     <ListOrdered className="h-4 w-4 text-gray-500" />
//                     <div className="flex-1 flex items-center bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors">
//                       <Label htmlFor="story-points-input" className="sr-only">Story Points</Label>
//                       <Input id="story-points-input" type="number" value={editingCardLocal.points ?? ""} onChange={(e) => setEditingCardLocal(prev => prev ? { ...prev, points: Number.isNaN(parseInt(e.target.value)) ? null : parseInt(e.target.value) } : null)} className={cn("w-full text-gray-700", jiraInputStyle)} min={0} placeholder="Add points" disabled={isMutating}/>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-4 text-sm">
//                     <ClockIcon className="h-4 w-4 text-gray-500" />
//                     <div className="flex-1 flex items-center bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors">
//                       <Label htmlFor="due-date-input" className="sr-only">Due Date</Label>
//                       <Input id="due-date-input" type="date" value={editingCardLocal.due || ""} onChange={(e) => setEditingCardLocal(prev => prev ? { ...prev, due: e.target.value } : null)} className={cn("w-full text-gray-700", jiraInputStyle)} placeholder="Set due date" disabled={isMutating}/>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="mt-8 flex flex-col gap-2 flex-shrink-0">
//                   <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSheetSave} disabled={isMutating}>{isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Changes</Button>
//                   <SheetClose asChild><Button variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-200" disabled={isMutating}>Cancel</Button></SheetClose>
//                 </div>
//               </div>
//             </div>
//           ) : ( <div className="flex items-center justify-center p-6 text-muted-foreground flex-1">No task selected or data loading...</div> )}
//         </SheetContent>
//       </Sheet>
//     </div>
//   )
// }


// // Helper component to parse and render activity logs
// function ParsedActivityLogItem({ activity }: { activity: ActivityUI }) {
//   let action = "performed an action";
//   let details: string | undefined = undefined;
//   let icon = <ActivityIcon className="h-4 w-4 text-gray-500" />;
//   let accentColor = "bg-gray-50";

//   try {
//       const data = activity.data;
//       if (!data || typeof data !== 'object') { throw new Error("Activity data is missing or not an object."); }
//       switch (activity.type) {
//           case 'TASK_CREATED': action = "created the task"; icon = <PlusCircle className="h-4 w-4 text-green-600" />; accentColor = "bg-green-50"; break;
//           case 'DESCRIPTION_UPDATED': action = "updated the description"; icon = <Pencil className="h-4 w-4 text-blue-500" />; accentColor = "bg-blue-50"; break;
//           case 'ASSIGNEE_CHANGED': action = "changed the assignee"; details = `${(data as any).oldAssignee || 'Unassigned'} → ${(data as any).newAssignee || 'Unassigned'}`; icon = <UserRoundIcon className="h-4 w-4 text-emerald-500" />; accentColor = "bg-emerald-50"; break;
//           case 'PRIORITY_CHANGED': action = "changed the priority"; details = `${(data as any).oldPriority} → ${(data as any).newPriority}`; icon = <TagIcon className="h-4 w-4 text-orange-500" />; accentColor = "bg-orange-50"; break;
//           case 'POINTS_UPDATED': action = "updated story points"; details = `${(data as any).oldPoints ?? 'No'} points → ${(data as any).newPoints ?? 'No'} points`; icon = <ListOrdered className="h-4 w-4 text-purple-500" />; accentColor = "bg-purple-50"; break;
//           case 'STATUS_CHANGED': action = "changed the status"; details = `${(data as any).oldStatus} → ${(data as any).newStatus}`; icon = <CheckCircle2 className="h-4 w-4 text-green-600" />; accentColor = "bg-green-50"; break;
//           case 'COMMENT_ADDED': action = "added a new comment"; details = `"${(data as any).content}"`; icon = <MessageSquareIcon className="h-4 w-4 text-gray-500" />; accentColor = "bg-gray-50"; break;
//           default: action = `performed an action: ${activity.type}`;
//       }
//   } catch (e) {
//       console.error("Failed to process activity data", activity.data, e);
//       details = typeof activity.data === 'string' ? activity.data : "Could not display activity details.";
//   }
  
//   return <ActivityLogItem user={activity.user} action={action} details={details} time={safeFormatDistanceToNow(activity.createdAt)} icon={icon} accentColor={accentColor} />
// }

// interface ActivityLogItemProps { user: { firstName: string; lastName: string; avatar?: string; }; action: string; details?: string; time: string; icon: React.ReactNode; accentColor: string; }
// function ActivityLogItem({ user, action, details, time, icon, accentColor }: ActivityLogItemProps) {
//   const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.trim() || '?';
//   const userName = `${user.firstName} ${user.lastName}`.trim();
//   return (
//     <div className={cn("flex items-start gap-3 p-3 rounded-md shadow-sm border border-gray-200", accentColor)}>
//       <Avatar className="h-8 w-8">{user.avatar && <AvatarImage src={user.avatar} />}<AvatarFallback className="bg-gray-200 text-gray-800">{userInitials}</AvatarFallback></Avatar>
//       <div className="flex-1">
//         <div className="flex items-center gap-2">{icon}<p className="font-semibold text-gray-800">{userName} <span className="text-sm text-muted-foreground font-normal">{action}</span></p></div>
//         {details && <p className="text-xs text-gray-600 italic mt-1">{details}</p>}
//         <span className="text-xs text-muted-foreground block mt-1">{time}</span>
//       </div>
//     </div>
//   );
// }




// components/board/kanban-board.tsx
"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import type { Card, Column } from "./kanban-types"
import { KanbanSortableColumn } from "./kanban-sortable-column"
import { KanbanSortableCard } from "./kanban-sortable-card"
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
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { ChevronDown, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useKanbanMutations } from "@/hooks/useKanbanMutations";
import { useTaskDetails } from "@/hooks/useTaskDetails";
import { UserAvatarPartial, TaskUI } from "@/hooks/useProjectTasksAndSections";
import { TaskDetailSheet } from "../modals/task-detail-sheet"



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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<{ columnId: string; cardId: string } | null>(null);
  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [editingCardLocal, setEditingCardLocal] = useState<Card | null>(null);

  const rowRef = useRef<HTMLDivElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const {
    createColumn, updateColumn, deleteColumn,
    createCard, updateCard, deleteCard,
    isMutating: isKanbanMutating,
    mutationError,
  } = useKanbanMutations(projectId, currentSprintId);

  const {
    taskDetails,
    isMutating: isTaskDetailsMutating,
  } = useTaskDetails(selected?.cardId || null);

  const openDrawer = useCallback((columnId: string, cardId: string) => {
    setSelected({ columnId, cardId });
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelected(null);
  }, []);

  useEffect(() => {
    const isSprintIdChanged = currentSprintId && columns.some(col => col.sprintId && col.sprintId !== currentSprintId);
    const hasCoreStructuralChanges = columns.length !== initialColumns.length || columns.some((col, index) => !initialColumns[index] || col.id !== initialColumns[index].id);
    const isEmptyInitialColumnsAndLocalHasData = initialColumns.length === 0 && columns.length > 0;
    const isInitialLoad = columns.length === 0 && initialColumns.length > 0;

    if (isSprintIdChanged || hasCoreStructuralChanges || isEmptyInitialColumnsAndLocalHasData || isInitialLoad) {
      setColumns(initialColumns);
    }
  }, [initialColumns, currentSprintId]);

  useEffect(() => {
    if (taskDetails) {
        setEditingCardLocal({
            id: taskDetails.id,
            title: taskDetails.title,
            description: taskDetails.description,
            priority: taskDetails.priority,
            points: taskDetails.points,
            due: taskDetails.dueDate,
            assignee: taskDetails.assignee,
            editing: false,
        });
    } else {
        setEditingCardLocal(null);
    }
  }, [taskDetails]);

  const handleUpdateTask = useCallback(async (sectionId: string, taskId: string, updates: Partial<TaskUI>) => {
    await updateCard(sectionId, taskId, updates);
  }, [updateCard]);

  const handleDeleteRequest = useCallback((sectionId: string, task: TaskUI) => {
      deleteCard(task.id);
      closeDrawer();
  }, [deleteCard, closeDrawer]);

  function findColumnIdByCardId(cardId: string) {
    return columns.find((c) => c.cards.some((k) => k.id === cardId))?.id
  }
  function indexOfCard(columnId: string, cardId: string) {
    const col = columns.find((c) => c.id === columnId)
    return col ? col.cards.findIndex((k) => k.id === cardId) : -1
  }

  function handleDragStart(e: DragStartEvent) {
    const activeType = e.active.data.current?.type as string | undefined;
    const rect = e.active.rect?.current as any;
    if (activeType === "card") {
      const card = columns.flatMap(c => c.cards).find(k => k.id === String(e.active.id));
      if (card) setOverlay({ kind: "card", card, width: rect?.width, height: rect?.height });
    } else if (activeType === "column") {
      const col = columns.find((c) => c.id === String(e.active.id));
      if (col) setOverlay({ kind: "column", column: col, width: rect?.width, height: rect?.height });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeType = event.active.data.current?.type as string | undefined
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    setOverlay(null)
    if (!overId) return

    if (activeType === "column") {
      const fromIndex = columns.findIndex((c) => c.id === activeId)
      const toIndex = columns.findIndex((c) => c.id === overId)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return

      setColumns((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        next.forEach((col, idx) => {
            col.order = idx;
            if (col.order !== undefined) updateColumn(col.id, col.name, idx);
        });
        return next;
      });
      return;
    }

    if (activeType === "card") {
      const fromColumnId = findColumnIdByCardId(activeId);
      if (!fromColumnId) return;
      let toColumnId: string | undefined;
      let toIndex = 0;
      const overIsColumn = columns.some((c) => c.id === overId);
      if (overIsColumn) {
        toColumnId = overId;
        toIndex = columns.find((c) => c.id === toColumnId)!.cards.length;
      } else {
        toColumnId = findColumnIdByCardId(overId);
        if (!toColumnId) return;
        toIndex = indexOfCard(toColumnId, overId);
        if (toIndex < 0) toIndex = 0;
      }
      const fromIndex = indexOfCard(fromColumnId, activeId);
      if (fromIndex < 0 || !toColumnId || (fromColumnId === toColumnId && fromIndex === toIndex)) return;
      
      setColumns((prev) => {
        const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
        const fromCol = next.find((c) => c.id === fromColumnId)!;
        const toCol = next.find((c) => c.id === toColumnId)!;
        const [moved] = fromCol.cards.splice(fromIndex, 1);
        let insertAt = toIndex;
        if (fromColumnId === toColumnId && toIndex > fromIndex) insertAt = toIndex - 1;
        toCol.cards.splice(insertAt, 0, moved);
        if (fromColumnId !== toColumnId) {
            updateCard(fromColumnId, moved.id, { sectionId: toCol.id });
        }
        return next;
      });
    }
  }

  const currentSprintName = useMemo(() => {
    return sprintOptions.find(s => s.id === currentSprintId)?.name || "";
  }, [currentSprintId, sprintOptions]);

  const handleAddCard = useCallback(async (columnId: string, title: string) => await createCard(columnId, title), [createCard]);
  const handleUpdateColumnTitle = useCallback(async (columnId: string, title: string) => {
    const currentColumn = columns.find(c => c.id === columnId);
    await updateColumn(columnId, title, currentColumn?.order);
  }, [updateColumn, columns]);
  const handleDeleteColumn = useCallback(async (columnId: string) => await deleteColumn(columnId), [deleteColumn]);
  const handleDeleteCard = useCallback(async (cardId: string) => {
    await deleteCard(cardId);
    setDrawerOpen(false);
  }, [deleteCard]);
  
  const isMutating = isKanbanMutating || isTaskDetailsMutating;

  const sheetTaskProp = useMemo(() => {
    if (!selected) return null;
    return { sectionId: selected.columnId, taskId: selected.cardId };
  }, [selected]);
  
  const initialTaskForSheet = useMemo(() => {
      if (!editingCardLocal || !selected) return null;
      return {
          ...editingCardLocal,
          id: editingCardLocal.id,
          sectionId: selected.columnId,
          completed: false, 
          status: 'TODO', 
      };
  }, [editingCardLocal, selected]);

  return (
    <div className="page-scroller">
      {mutationError && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
              Error performing mutation: {mutationError.message}
          </div>
      )}
      <div className="flex items-center  pr-6 pl-6 pt-3 gap-3">
        <Button onClick={() => createColumn("New Column")} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isMutating}>
          {isKanbanMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
                sprintOptions.map((sprint) => (
                  <DropdownMenuItem key={sprint.id} onClick={() => onSprintChange(sprint.id)} disabled={isMutating}>
                    {sprint.name}
                  </DropdownMenuItem>
                ))
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
                key={column.id} column={column}
                onAddCard={() => handleAddCard(column.id, "New Task")}
                onTitleChange={(title) => handleUpdateColumnTitle(column.id, title)}
                onDeleteColumn={() => handleDeleteColumn(column.id)}
                isMutating={isKanbanMutating} onStartTitleEdit={() => {}} onStopTitleEdit={() => {}}
              >
                <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {column.cards.map((card) => (
                    <KanbanSortableCard
                      key={card.id} columnId={column.id} card={card}
                      onOpen={() => !card.editing && openDrawer(column.id, card.id)}
                      onStartInline={() => setColumns(prev => prev.map(c => c.id === column.id ? { ...c, cards: c.cards.map(k => k.id === card.id ? { ...k, editing: true } : k) } : c))}
                      onFinishInline={(patch) => {
                        updateCard(column.id, card.id, patch); 
                        setColumns(prev => prev.map(c => c.id === column.id ? { ...c, cards: c.cards.map(k => k.id === card.id ? { ...k, ...patch, editing: false } : k) } : c));
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
            <div className="card pointer-events-none shadow-[var(--shadow-lg)]" style={{ width: overlay.width ? `${overlay.width}px` : undefined, height: overlay.height ? `${overlay.height}px` : undefined }}>
              <div className="flex items-start">
                <span className={ overlay.card.priority === "High" ? "badge-high" : overlay.card.priority === "Medium" ? "badge-medium" : "badge-low" } >
                  {overlay.card.priority || "Low"}
                </span>
                <div className="ml-auto text-xs text-slate-500">{overlay.card.points ? `${overlay.card.points} SP` : ""}</div>
              </div>
              <div className="mt-2 text-sm font-semibold">{overlay.card.title}</div>
              {overlay.card.description ? <div className="mt-1 line-clamp-2 text-xs text-slate-500">{overlay.card.description}</div> : null}
            </div>
          ) : overlay?.kind === "column" ? (
            <div className="column pointer-events-none" style={{ width: overlay.width ? `${overlay.width}px` : undefined, height: overlay.height ? `${overlay.height}px` : undefined }}>
              <div className="column-header"><div className="text-sm font-semibold">{overlay.column.title}</div></div>
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
        availableAssignees={availableAssignees}
        isTaskMutating={isMutating}
      />
    </div>
  )
}