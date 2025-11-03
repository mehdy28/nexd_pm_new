// // components/tasks/list--view.tsx
// "use client";

// import { useMemo, useState, useEffect, useCallback, useRef } from "react";
// import { formatDistanceToNow } from "date-fns";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Separator } from "@/components/ui/separator";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import {
//   ChevronDown,
//   ChevronRight,
//   Circle,
//   CheckCircle2,
//   Pencil,
//   Trash2,
//   Loader2,
//   EllipsisVertical,
//   CalendarIcon,
//   ClockIcon,
//   TagIcon,
//   UserRoundIcon,
//   MessageSquareIcon,
//   ActivityIcon,
//   X,
//   PlusCircle,
//   Bold,
//   Italic,
//   Underline,
//   List, // This is for unordered list
//   ListOrdered, // This is for ordered list
//   AlignLeft,
//   AlignCenter,
//   AlignRight,
//   Paperclip,
//   FileText, // General text file icon, can be used for DOC, PDF
//   FileCode, // For code files
//   FileImage, // For image files
//   FileSpreadsheet, // For spreadsheet files
//   FileWarning, // Generic fallback for unsupported types
//   FileArchive, // For PPT or other archive-like files if a specific one isn't available
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
//   SheetDescription,
//   SheetClose,
// } from "@/components/ui/sheet";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";

// import {
//   useProjectTasksAndSections,
//   TaskUI,
//   SectionUI,
//   PriorityUI,
//   SprintFilterOption,
//   ProjectMemberFullDetails,
//   TaskStatusUI,
// } from "@/hooks/useProjectTasksAndSections";
// import { useProjectTaskMutations } from "@/hooks/useProjectTaskMutations";
// import { UserAvatarPartial } from "@/types/useProjectTasksAndSections";
// import { useTaskDetails } from "@/hooks/useTaskDetails";
// import { ActivityUI, CommentUI } from "@/types/taskDetails";

// type NewTaskForm = {
//   title: string;
//   assigneeId?: string | null;
//   due?: string | null;
//   priority: PriorityUI;
//   points?: number | null;
//   description?: string | null;
//   sprintId?: string | null;
// };

// const priorityStyles: Record<PriorityUI, string> = {
//   Low: "bg-green-100 text-green-700 ring-1 ring-green-200",
//   Medium: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
//   High: "bg-red-100 text-red-700 ring-1 ring-red-200",
// };
// const priorityDot: Record<PriorityUI, string> = {
//   Low: "bg-green-500",
//   Medium: "bg-orange-500",
//   High: "bg-red-500",
// };

// // Styling for inputs without border, like Jira
// const jiraInputStyle = "focus-visible:ring-0 focus-visible:ring-offset-0 border-none px-0 py-1 shadow-none bg-transparent";
// const jiraTextareaStyle = "focus-visible:ring-0 focus-visible:ring-offset-0 border-none px-0 py-1 shadow-none resize-y bg-transparent";
// const jiraSelectTriggerStyle = "focus:ring-0 focus:ring-offset-0 border-none h-auto px-0 py-1 shadow-none bg-transparent";

// interface ListViewProps {
//   projectId: string;
// }

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
//   if (!dateInput) {
//     return "unknown time";
//   }
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
//     if (parts.length === 2) {
//         // fl_attachment flag tells Cloudinary to send Content-Disposition header
//         return `${parts[0]}/upload/fl_attachment/${parts[1]}`;
//     }
//     return url; // Return original URL if format is unexpected
// };


// export function ListView({ projectId }: ListViewProps) {
//   const [internalSelectedSprintId, setInternalSelectedSprintId] = useState<string | undefined>(undefined);
  
//   const {
//     sections: fetchedSections,
//     sprintFilterOptions,
//     loading,
//     error,
//     refetchProjectTasksAndSections,
//     createSection,
//     updateSection,
//     deleteSection,
//     projectMembers,
//     defaultSelectedSprintId: suggestedDefaultSprintId,
//   } = useProjectTasksAndSections(projectId, internalSelectedSprintId);

//   useEffect(() => {
//     if (internalSelectedSprintId === undefined && suggestedDefaultSprintId) {
//       setInternalSelectedSprintId(suggestedDefaultSprintId);
//     }
//   }, [internalSelectedSprintId, suggestedDefaultSprintId]);

//   const {
//     createTask,
//     updateTask: updateTaskMutation,
//     toggleTaskCompleted: toggleTaskCompletedMutation,
//     deleteTask: deleteTaskMutation,
//     isTaskMutating,
//     taskMutationError,
//   } = useProjectTaskMutations(projectId, internalSelectedSprintId);

//   const [sections, setSections] = useState<SectionUI[]>([]);
//   const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
//   const [selected, setSelected] = useState<Record<string, boolean>>({});
//   const [sheetTask, setSheetTask] = useState<{ sectionId: string; taskId: string } | null>(null);

//   const [editingTaskLocal, setEditingTaskLocal] = useState<TaskUI | null>(null);
//   const [activeTab, setActiveTab] = useState<"description" | "comments" | "activity" | "attachments">("description");

//   const [newComment, setNewComment] = useState("");
//   const [newTaskOpen, setNewTaskOpen] = useState<Record<string, boolean>>({});
//   const [newTask, setNewTask] = useState<Record<string, NewTaskForm>>({});
//   const [isSectionMutating, setIsSectionMutating] = useState(false);

//   // State for Modals
//   const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false);
//   const [sectionToDelete, setSectionToDelete] = useState<SectionUI | null>(null);
//   const [deleteTasksConfirmed, setDeleteTasksConfirmed] = useState(false);
//   const [reassignToSectionOption, setReassignToSectionOption] = useState<string | null>(null);
  
//   const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false);
//   const [taskToDelete, setTaskToDelete] = useState<{ sectionId: string; task: TaskUI } | null>(null);
  
//   const [deleteCommentModalOpen, setDeleteCommentModalOpen] = useState(false);
//   const [commentToDelete, setCommentToDelete] = useState<CommentUI | null>(null);


//   // Refs for Modals
//   const customModalRef = useRef<HTMLDivElement>(null);
//   const customTaskModalRef = useRef<HTMLDivElement>(null);
//   const customCommentModalRef = useRef<HTMLDivElement>(null);
//   const descriptionContentEditableRef = useRef<HTMLDivElement>(null);

//   const {
//     taskDetails,
//     loading: taskDetailsLoading,
//     error: taskDetailsError,
//     addComment,
//     deleteComment,
//     uploadAttachment,
//     deleteAttachment,
//     isMutating: isTaskDetailsMutating,
//   } = useTaskDetails(sheetTask?.taskId || null);


//   const sheetData = useMemo(() => {
//     if (!sheetTask) return null;
//     const s = sections.find((x) => x.id === sheetTask.sectionId);
//     const t = s?.tasks.find((x) => x.id === sheetTask.taskId);
//     return t ? { sectionId: sheetTask.sectionId, task: t } : null;
//   }, [sheetTask, sections]);

//   useEffect(() => {
//     if (descriptionContentEditableRef.current && activeTab === "description" && sheetData && editingTaskLocal) {
//       const div = descriptionContentEditableRef.current;
//       if (!editingTaskLocal.description?.trim()) {
//         if (div.textContent?.trim() !== 'Add a detailed description...') {
//           div.classList.add('text-muted-foreground', 'italic');
//           div.textContent = 'Add a detailed description...';
//         }
//       } else {
//         if (div.classList.contains('text-muted-foreground')) {
//           div.classList.remove('text-muted-foreground', 'italic');
//         }
//         if (div.innerHTML !== editingTaskLocal.description) {
//           div.innerHTML = editingTaskLocal.description;
//         }
//       }
//     }
//   }, [editingTaskLocal?.description, sheetData, activeTab]);

//   const availableAssignees: UserAvatarPartial[] = useMemo(() => {
//     return projectMembers.map(member => ({
//       id: member.user.id,
//       firstName: member.user.firstName,
//       lastName: member.user.lastName,
//       avatar: member.user.avatar,
//     }));
//   }, [projectMembers]);

//   const toggleSection = useCallback((id: string) => {
//     setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
//   }, []);

//   const setSectionEditing = useCallback((id: string, editing: boolean) => {
//     setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing } : s)));
//   }, []);

//   const renameSection = useCallback(async (id: string, title: string) => {
//     if (!title.trim()) {
//       setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing: false } : s)));
//       return;
//     }
//     setIsSectionMutating(true);
//     try {
//       await updateSection(id, title);
//     } catch (err) {
//       console.error(`[renameSection] Failed to rename section "${id}":`, err);
//     } finally {
//       setIsSectionMutating(false);
//       setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing: false } : s)));
//     }
//   }, [updateSection]);

//   const addSection = useCallback(async () => {
//     setIsSectionMutating(true);
//     try {
//       await createSection("New Section");
//       refetchProjectTasksAndSections();
//     } catch (err) {
//       console.error("[addSection] Failed to add section:", err);
//     } finally {
//       setIsSectionMutating(false);
//     }
//   }, [createSection, refetchProjectTasksAndSections]);

//   const toggleTaskCompleted = useCallback(async (sectionId: string, taskId: string) => {
//     const taskToUpdate = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
//     if (!taskToUpdate) return;
//     setSections((prev) => prev.map((s) =>
//         s.id === sectionId
//           ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed, status: !t.completed ? 'DONE' : 'TODO' } : t)),}
//           : s,
//       ));
//     try {
//       await toggleTaskCompletedMutation(taskId, taskToUpdate.status);
//     } catch (err) {
//       console.error(`[toggleTaskCompleted] Failed to toggle task "${taskId}" completion:`, err);
//       setSections((prev) => prev.map((s) =>
//           s.id === sectionId
//             ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed, status: !t.completed ? 'TODO' : 'DONE' } : t)),}
//             : s,
//         ));
//     }
//   }, [sections, toggleTaskCompletedMutation]);

//   const updateTask = useCallback(async (sectionId: string, taskId: string, updates: Partial<TaskUI>) => {
//     const originalTask = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
//     if (!originalTask) return;

//     const mutationInput: { [key: string]: any } = { id: taskId };
//     if (updates.title !== undefined) mutationInput.title = updates.title;
//     if (updates.description !== undefined) mutationInput.description = updates.description;
//     if (updates.priority !== undefined) mutationInput.priority = updates.priority;
//     if (updates.points !== undefined) mutationInput.points = updates.points;
//     if (updates.due !== undefined) mutationInput.dueDate = updates.due;
//     if (updates.assignee !== undefined) mutationInput.assigneeId = updates.assignee?.id || null;
//     const newStatus = updates.completed !== undefined ? (updates.completed ? 'DONE' : 'TODO') : undefined;
//     if (newStatus !== undefined) mutationInput.status = newStatus;

//     setSections((prev) => prev.map((s) =>
//         s.id === sectionId
//           ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),}
//           : s,
//       ));

//     if (Object.keys(mutationInput).length > 1) {
//       try {
//         await updateTaskMutation(taskId, mutationInput);
//       } catch (err) {
//         console.error(`[updateTask] Failed to update task "${taskId}":`, err);
//         setSections((prev) => prev.map((s) =>
//             s.id === sectionId
//               ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? originalTask : t)),}
//               : s,
//           ));
//       }
//     }
//   }, [sections, updateTaskMutation]);

//   const openDeleteTaskModal = useCallback((sectionId: string, task: TaskUI) => {
//     setTaskToDelete({ sectionId, task });
//     setDeleteTaskModalOpen(true);
//   }, []);

//   const closeSheet = useCallback(() => {
//     setSheetTask(null);
//     setEditingTaskLocal(null);
//   }, []);

//   const handleConfirmTaskDelete = useCallback(async () => {
//     if (!taskToDelete) return;
//     const sectionId = taskToDelete.sectionId;
//     const taskId = taskToDelete.task.id;
//     const originalSections = [...sections];

//     setSections((prev) => prev.map((s) =>
//         s.id === sectionId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s,
//       ));
//     setSelected((prev) => {
//       const copy = { ...prev };
//       delete copy[taskId];
//       return copy;
//     });

//     try {
//       await deleteTaskMutation(taskId);
//     } catch (err) {
//       console.error(`[handleConfirmTaskDelete] Failed to delete task "${taskId}":`, err);
//       setSections(originalSections);
//       refetchProjectTasksAndSections();
//     } finally {
//       setDeleteTaskModalOpen(false);
//       setTaskToDelete(null);
//       if (sheetTask?.taskId === taskId) {
//         closeSheet();
//       }
//     }
//   }, [taskToDelete, sections, deleteTaskMutation, refetchProjectTasksAndSections, sheetTask, closeSheet]);

//   const allTaskIds = useMemo(() => sections.flatMap((s) => s.tasks.map((t) => t.id)), [sections]);

//   const toggleSelect = useCallback((taskId: string, checked: boolean) => {
//     setSelected((prev) => ({ ...prev, [taskId]: checked }));
//   }, []);

//   const toggleSelectAll = useCallback((checked: boolean) => {
//     if (!checked) {
//       setSelected({});
//       return;
//     }
//     const next: Record<string, boolean> = {};
//     for (const id of allTaskIds) next[id] = true;
//     setSelected(next);
//   }, [allTaskIds]);

//   const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

//   const bulkDeleteSelected = useCallback(async () => {
//     const toDelete = new Set(Object.entries(selected).filter(([, v]) => v).map(([k]) => k));
//     if (toDelete.size === 0) return;

//     const originalSections = [...sections];
//     setSections((prev) => prev.map((s) => ({ ...s, tasks: s.tasks.filter((t) => !toDelete.has(t.id)),})));
//     setSelected({});

//     try {
//       for (const taskId of Array.from(toDelete)) {
//         await deleteTaskMutation(taskId);
//       }
//     } catch (err) {
//       console.error("[bulkDeleteSelected] Failed to bulk delete tasks:", err);
//       setSections(originalSections);
//       refetchProjectTasksAndSections();
//     }
//   }, [selected, sections, deleteTaskMutation, refetchProjectTasksAndSections]);

//   const openNewTask = useCallback((sectionId: string) => {
//     setNewTaskOpen((p) => ({ ...p, [sectionId]: true }));
//     setNewTask((p) => ({
//       ...p,
//       [sectionId]: p[sectionId] || {
//         title: "",
//         assigneeId: availableAssignees[0]?.id || null,
//         due: null,
//         priority: "Medium",
//         points: null,
//         description: null,
//         sprintId: internalSelectedSprintId || null,
//       },
//     }));
//   }, [availableAssignees, internalSelectedSprintId]);

//   const cancelNewTask = useCallback((sectionId: string) => {
//     setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
//   }, []);

//   const saveNewTask = useCallback(async (sectionId: string) => {
//     const form = newTask[sectionId];
//     if (!form || !form.title.trim()) return;
//     const assignedSprintId = internalSelectedSprintId || null;
//     try {
//       let createdTask: TaskUI = await createTask(sectionId, {
//         title: form.title,
//         description: form.description,
//         assigneeId: form.assigneeId,
//         dueDate: form.due,
//         priority: form.priority,
//         points: form.points,
//         sprintId: assignedSprintId,
//         status: 'TODO',
//       });
//       if (!createdTask.sprintId) {
//         createdTask = { ...createdTask, sprintId: assignedSprintId };
//       }
//       setSections(prevSections => prevSections.map(s => {
//           if (s.id === sectionId) {
//             const taskBelongsToCurrentSprint = !assignedSprintId || (createdTask.sprintId === assignedSprintId);
//             if (taskBelongsToCurrentSprint) {
//               return { ...s, tasks: [...s.tasks, createdTask],};
//             }
//           }
//           return s;
//         }));
//       setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
//       setNewTask((p) => { const newState = { ...p }; delete newState[sectionId]; return newState; });
//     } catch (err) {
//       console.error(`[saveNewTask] Failed to create task in section "${sectionId}":`, err);
//     }
//   }, [newTask, createTask, internalSelectedSprintId]);

//   const openSheetFor = useCallback((sectionId: string, taskId: string) => {
//     setSheetTask({ sectionId, taskId });
//   }, []);

//   useEffect(() => {
//     if (sheetData) {
//       setEditingTaskLocal(sheetData.task);
//       setActiveTab("description");
//     } else {
//       setEditingTaskLocal(null);
//     }
//   }, [sheetData]);

//   const handleSheetSave = useCallback(async () => {
//     if (!sheetTask || !editingTaskLocal || !sheetData) return;
//     const originalTask = sheetData.task;
//     const updates: Partial<TaskUI> = {};
//     if (editingTaskLocal.title !== originalTask.title) updates.title = editingTaskLocal.title;
//     if (editingTaskLocal.description !== originalTask.description) updates.description = editingTaskLocal.description;
//     if (editingTaskLocal.priority !== originalTask.priority) updates.priority = editingTaskLocal.priority;
//     if (editingTaskLocal.points !== originalTask.points) updates.points = editingTaskLocal.points;
//     if (editingTaskLocal.due !== originalTask.due) updates.due = editingTaskLocal.due;
//     if (editingTaskLocal.assignee?.id !== originalTask.assignee?.id) updates.assignee = editingTaskLocal.assignee;
//     if (Object.keys(updates).length > 0) {
//       await updateTask(sheetTask.sectionId, sheetTask.taskId, updates);
//     }
//     // THE FIX: Removed closeSheet() call to keep the modal open after saving.
//     // closeSheet();
//   }, [sheetTask, editingTaskLocal, sheetData, updateTask]);

//   const handleEditorCommand = useCallback((command: string, value?: string) => {
//     if (descriptionContentEditableRef.current) {
//       descriptionContentEditableRef.current.focus();
//       document.execCommand(command, false, value);
//       if (descriptionContentEditableRef.current) {
//         setEditingTaskLocal(prev => prev ? { ...prev, description: descriptionContentEditableRef.current?.innerHTML || '' } : null);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     if (fetchedSections) {
//       setSections(fetchedSections);
//       setCollapsed(prevCollapsed => {
//         const newCollapsedState: Record<string, boolean> = {};
//         fetchedSections.forEach(sec => {
//           newCollapsedState[sec.id] = prevCollapsed[sec.id] ?? false;
//         });
//         return newCollapsedState;
//       });
//     }
//   }, [fetchedSections]);

//   const handleOpenDeleteSectionModal = useCallback((section: SectionUI) => {
//     setSectionToDelete(section);
//     setDeleteTasksConfirmed(false);
//     const availableOtherSections = sections.filter(s => s.id !== section.id);
//     setReassignToSectionOption(availableOtherSections[0]?.id || null);
//     setDeleteSectionModalOpen(true);
//   }, [sections]);

//   const handleConfirmDeleteSection = useCallback(async () => {
//     if (!sectionToDelete) return;
//     setIsSectionMutating(true);
//     try {
//       const hasTasks = sectionToDelete.tasks.length > 0;
//       let reassignId: string | null | undefined = null;
//       if (hasTasks && !deleteTasksConfirmed) {
//         reassignId = reassignToSectionOption;
//         if (!reassignId) {
//           setIsSectionMutating(false);
//           return;
//         }
//       }
//       await deleteSection(sectionToDelete.id, {
//         deleteTasks: hasTasks ? deleteTasksConfirmed : true,
//         reassignToSectionId: reassignId,
//       });
//       refetchProjectTasksAndSections();
//     } catch (err) {
//       console.error(`[handleConfirmDeleteSection] Failed to delete section "${sectionToDelete.id}":`, err);
//     } finally {
//       setIsSectionMutating(false);
//       setDeleteSectionModalOpen(false);
//       setSectionToDelete(null);
//     }
//   }, [sectionToDelete, deleteTasksConfirmed, reassignToSectionOption, deleteSection, refetchProjectTasksAndSections]);

//   // Modal Focus Management
//   useEffect(() => {
//     if (deleteSectionModalOpen && customModalRef.current) customModalRef.current.focus();
//   }, [deleteSectionModalOpen]);
//   useEffect(() => {
//     if (deleteTaskModalOpen && customTaskModalRef.current) customTaskModalRef.current.focus();
//   }, [deleteTaskModalOpen]);
//   useEffect(() => {
//     if (deleteCommentModalOpen && customCommentModalRef.current) customCommentModalRef.current.focus();
//   }, [deleteCommentModalOpen]);

//   const allSelected = useMemo(() => selectedCount > 0 && selectedCount === allTaskIds.length, [selectedCount, allTaskIds]);
//   const otherSections = useMemo(() => sections.filter(s => s.id !== sectionToDelete?.id), [sections, sectionToDelete]);
//   const currentSprintName = useMemo(() => {
//     const activeSprintId = internalSelectedSprintId || suggestedDefaultSprintId;
//     return sprintFilterOptions.find(s => s.id === activeSprintId)?.name || "";
//   }, [internalSelectedSprintId, sprintFilterOptions, suggestedDefaultSprintId]);

//   const handleSprintSelectionChange = useCallback((sprintId: string) => {
//     setInternalSelectedSprintId(sprintId);
//     refetchProjectTasksAndSections();
//   }, [refetchProjectTasksAndSections]);

//   const handleAddComment = useCallback(async () => {
//     if (!newComment.trim()) return;
//     try {
//       await addComment(newComment);
//       setNewComment("");
//     } catch (err) {
//       console.error("Failed to add comment:", err);
//     }
//   }, [addComment, newComment]);
  
//   // Handlers for comment deletion modal
//   const handleOpenDeleteCommentModal = useCallback((comment: CommentUI) => {
//     setCommentToDelete(comment);
//     setDeleteCommentModalOpen(true);
//   }, []);

//   const handleConfirmCommentDelete = useCallback(async () => {
//     if (!commentToDelete) return;
//     try {
//         await deleteComment(commentToDelete.id);
//     } catch (err) {
//         console.error("Failed to delete comment:", err);
//     } finally {
//         setDeleteCommentModalOpen(false);
//         setCommentToDelete(null);
//     }
//   }, [commentToDelete, deleteComment]);


//   const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = e.target.files;
//     if (!files) return;
//     for (const file of Array.from(files)) {
//       try {
//         await uploadAttachment(file);
//       } catch (err) {
//         console.error("Upload failed for file:", file.name, err);
//       }
//     }
//     // Reset file input
//     if (e.target) {
//         e.target.value = '';
//     }
//   }, [uploadAttachment]);


//   if (loading) return <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30"><Loader2 className="h-10 w-10 animate-spin text-teal-500" /><p className="ml-4 text-lg text-slate-700">Loading tasks and sections...</p></div>;
//   if (error) return <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-red-100 text-red-700 p-4"><p className="text-lg">Error loading tasks: {error.message}</p></div>;

//   if (!sections || sections.length === 0) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[calc(10vh-64px)] bg-muted/30 p-8 text-center">
//         <h2 className="text-3xl font-bold text-foreground mb-4">No Tasks in "{currentSprintName}"</h2>
//         <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">The selected sprint "{currentSprintName}" has no tasks. Add a new task or select a different sprint.</p>
//         <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">{isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}+ Add Section</Button>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 pt-3">
//       <div className="flex items-center gap-3">
//         <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">{isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}+ Add section</Button>
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">{currentSprintName}<ChevronDown className="h-4 w-4 text-muted-foreground" /></Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="start">
//             <DropdownMenuLabel>Sprints</DropdownMenuLabel>
//             {sprintFilterOptions.map((sprint) => (
//               <DropdownMenuItem key={sprint.id} onClick={() => handleSprintSelectionChange(sprint.id)}>{sprint.name}</DropdownMenuItem>
//             ))}
//           </DropdownMenuContent>
//         </DropdownMenu>
//         <div className="ml-auto relative w-[260px]"><Input className="h-9" placeholder="Search tasks..." /></div>
//       </div>

//       {selectedCount > 0 && (
//         <div className="mt-4 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
//           <div>{selectedCount} selected</div>
//           <Button variant="destructive" className="h-8" onClick={bulkDeleteSelected}>Delete selected</Button>
//         </div>
//       )}

//       <div className="mt-4 w-full rounded-md overflow-x-auto">
//         <Separator />
//         {sections.map((section) => (
//           <div key={section.id} className="w-full">
//             <div className="flex w-full items-center gap-2 px-5 py-4">
//               <button onClick={() => toggleSection(section.id)} className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/40" aria-label={collapsed[section.id] ? "Expand section" : "Collapse section"} title={collapsed[section.id] ? "Expand" : "Collapse"}>
//                 {collapsed[section.id] ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
//               </button>

//               {section.editing ? (
//                 <Input autoFocus defaultValue={section.title} className="h-8 w-64" onBlur={(e) => renameSection(section.id, e.target.value.trim() || "Untitled")} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setSectionEditing(section.id, false);}} disabled={isSectionMutating}/>
//               ) : (
//                 <button className="text-sm font-semibold text-left hover:underline" onClick={() => setSectionEditing(section.id, true)} title="Rename section" disabled={isSectionMutating}>{section.title}</button>
//               )}

//               <div className="ml-auto flex items-center gap-2">
//                 {!newTaskOpen[section.id] && (<Button variant="outline" size="sm" onClick={() => openNewTask(section.id)} disabled={isTaskMutating}>+ Add task</Button>)}
//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isSectionMutating}><EllipsisVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
//                   <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleOpenDeleteSectionModal(section)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete Section</DropdownMenuItem></DropdownMenuContent>
//                 </DropdownMenu>
//               </div>
//             </div>

//             {!collapsed[section.id] && (
//               <div className="w-full">
//                 {section.tasks.map((task) => (
//                   <TaskRow key={task.id} task={task} selected={!!selected[task.id]} onSelect={(checked) => toggleSelect(task.id, checked)} onToggleCompleted={() => toggleTaskCompleted(section.id, task.id)} onChange={(updates) => updateTask(section.id, task.id, updates)} onOpen={() => openSheetFor(section.id, task.id)} onDelete={(sid, tid) => openDeleteTaskModal(sid, { id: tid, title: task.title, sectionId: sid } as TaskUI)} assignees={availableAssignees}/>
//                 ))}
//                 {newTaskOpen[section.id] && (
//                   <div className="px-10 py-4">
//                     <div className="rounded-md border p-4">
//                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                         <div className="space-y-2">
//                           <label className="text-xs text-muted-foreground">Title</label>
//                           <Input value={newTask[section.id]?.title || ""} onChange={(e) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), title: e.target.value },}))} placeholder="Task title" disabled={isTaskMutating}/>
//                         </div>
//                         <div className="space-y-2">
//                           <label className="text-xs text-muted-foreground">Assignee</label>
//                           <Select value={newTask[section.id]?.assigneeId || "null"} onValueChange={(v) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), assigneeId: v === "null" ? null : v },}))} disabled={isTaskMutating}>
//                             <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
//                             <SelectContent><SelectItem value="null">Unassigned</SelectItem><DropdownMenuSeparator />{availableAssignees.map((a) => (<SelectItem key={a.id} value={a.id}>{a.firstName || a.id} {a.lastName}</SelectItem>))}</SelectContent>
//                           </Select>
//                         </div>
//                         <div className="space-y-2">
//                           <label className="text-xs text-muted-foreground">Due date</label>
//                           <Input type="date" value={newTask[section.id]?.due || ""} onChange={(e) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), due: e.target.value },}))} disabled={isTaskMutating}/>
//                         </div>
//                         <div className="space-y-2">
//                           <label className="text-xs text-muted-foreground">Priority</label>
//                           <Select value={newTask[section.id]?.priority || "Medium"} onValueChange={(v: PriorityUI) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), priority: v },}))} disabled={isTaskMutating}>
//                             <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
//                             <SelectContent>{(["Low", "Medium", "High"] as PriorityUI[]).map((p) => (<SelectItem key={p} value={p}><div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[p])} />{p}</div></SelectItem>))}</SelectContent>
//                           </Select>
//                         </div>
//                         <div className="space-y-2">
//                           <label className="text-xs text-muted-foreground">Story Points</label>
//                           <div className="flex items-center gap-2">
//                             <Input type="number" className="w-24" value={newTask[section.id]?.points ?? ""} onChange={(e) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), points: Number.isFinite(Number.parseInt(e.target.value)) ? Number.parseInt(e.target.value) : null,},}))} min={0} disabled={isTaskMutating}/>
//                             <Button aria-label="Create task" onClick={() => saveNewTask(section.id)} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isTaskMutating || !newTask[section.id]?.title.trim()}>{isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create</Button>
//                             <Button aria-label="Cancel task creation" variant="ghost" className="h-9 bg-red-600 hover:bg-red-700 text-white" onClick={() => cancelNewTask(section.id)} disabled={isTaskMutating}>Cancel</Button>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}
//             <Separator />
//           </div>
//         ))}
//       </div>

//       <Sheet open={!!sheetData} onOpenChange={(open) => (!open ? closeSheet() : null)}>
//         <SheetContent side="right" className="w-full sm:max-w-[800px] bg-gray-100 border-l p-0 flex flex-col h-full max-h-screen">
//           {sheetData && editingTaskLocal ? (
//             <>
//               <SheetHeader className="p-6 pt-0 pb-0 border-b bg-white flex-shrink-0 sticky top-0 z-20">
//                 <SheetTitle className="sr-only">Edit Task</SheetTitle><SheetDescription className="sr-only">View and modify task details.</SheetDescription>
//                 <div className="flex justify-between items-center">
//                 <Input value={editingTaskLocal.title} onChange={(e) => setEditingTaskLocal(prev => prev ? { ...prev, title: e.target.value } : null)} className={cn("text-2xl font-bold mt-2", jiraInputStyle, "text-gray-800")} disabled={isTaskMutating}/>
//                   <div className="flex gap-2">
//                     <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => openDeleteTaskModal(sheetData.sectionId, sheetData.task)} title="Delete task"><Trash2 className="h-4 w-4" /></Button>
//                     <SheetClose asChild><Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4 text-gray-500" /><span className="sr-only">Close</span></Button></SheetClose>
//                   </div>
//                 </div>
//               </SheetHeader>

//               <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 h-full min-h-0">
//                 <div className="lg:col-span-2 flex flex-col h-full min-h-0">
//                   <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-2 pb-2 border-b border-gray-200 flex-shrink-0">
//                     <div className="grid w-full grid-cols-4 h-10 bg-gray-200 rounded-md p-1">
//                       <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "description" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("description")} aria-selected={activeTab === "description"}>Description</button>
//                       <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "comments" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("comments")} aria-selected={activeTab === "comments"}>Comments</button>
//                       <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "activity" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("activity")} aria-selected={activeTab === "activity"}>Activity</button>
//                       <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "attachments" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("attachments")} aria-selected={activeTab === "attachments"}>Attachments</button>
//                     </div>
//                   </div>
//                   <div className="flex-1 h-full min-h-0">
//                     {taskDetailsLoading ? ( <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div> ) : taskDetailsError ? ( <div className="p-6 text-red-600">Error: {taskDetailsError.message}</div> ) : !taskDetails ? ( <div className="p-6 text-muted-foreground">No task details found.</div> ) : ( <>
//                     {activeTab === "description" && (
//                       <div className="px-6 py-4  h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
//                         <div className="mb-2 p-1 rounded-md bg-white border border-gray-200 flex gap-1 flex-wrap">
//                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('bold')} title="Bold"><Bold className="h-4 w-4" /></Button>
//                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('italic')} title="Italic"><Italic className="h-4 w-4" /></Button>
//                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('underline')} title="Underline"><Underline className="h-4 w-4" /></Button>
//                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('insertUnorderedList')} title="Unordered List"><List className="h-4 w-4" /></Button>
//                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('insertOrderedList')} title="Ordered List"><ListOrdered className="h-4 w-4" /></Button>
//                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('justifyLeft')} title="Align Left"><AlignLeft className="h-4 w-4" /></Button>
//                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('justifyCenter')} title="Align Center"><AlignCenter className="h-4 w-4" /></Button>
//                           <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('justifyRight')} title="Align Right"><AlignRight className="h-4 w-4" /></Button>
//                         </div>
//                         <div>
//                           <div ref={descriptionContentEditableRef} contentEditable="true" onInput={(e) => { const target = e.target as HTMLDivElement; setEditingTaskLocal(prev => prev ? { ...prev, description: target.innerHTML || '' } : null);}} onFocus={(e) => { const target = e.target as HTMLDivElement; if (target.classList.contains('text-muted-foreground') && target.textContent === 'Add a detailed description...') { target.textContent = ''; target.classList.remove('text-muted-foreground', 'italic');}}} onBlur={(e) => { const target = e.target as HTMLDivElement; if (!target.textContent?.trim() && target.innerHTML?.trim() === '') { target.classList.add('text-muted-foreground', 'italic'); target.textContent = 'Add a detailed description...'; setEditingTaskLocal(prev => prev ? { ...prev, description: '' } : null); } else { setEditingTaskLocal(prev => prev ? { ...prev, description: target.innerHTML || '' } : null);}}} onKeyDown={(e) => { if (e.key === 'Enter' && descriptionContentEditableRef.current) { e.preventDefault(); if (e.shiftKey) { document.execCommand('insertHTML', false, '<br>'); } else { document.execCommand('insertParagraph', false, ''); }}}} dangerouslySetInnerHTML={{ __html: (editingTaskLocal.description && editingTaskLocal.description.trim() !== '') ? editingTaskLocal.description : 'Add a detailed description...' }} className={cn("text-base w-full p-2 border border-gray-200 rounded-md bg-white text-gray-700", "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", "resize-none break-words", "min-h-[100px]", !editingTaskLocal.description && "text-muted-foreground italic")} style={{ whiteSpace: 'pre-wrap' }}></div>
//                         </div>
//                       </div>
//                     )}
//                     {activeTab === "comments" && (
//                       <div className="relative flex flex-col h-full min-h-0">
//                         <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
//                           {taskDetails.comments.map((comment: CommentUI) => (
//                             <div key={comment.id} className="group flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-gray-200">
//                               <Avatar className="h-8 w-8">
//                                 <AvatarImage src={comment.author.avatar || undefined} />
//                                 <AvatarFallback className="bg-blue-200 text-blue-800">{`${comment.author.firstName?.[0] || ''}${comment.author.lastName?.[0] || ''}`}</AvatarFallback>
//                               </Avatar>
//                               <div className="flex-1">
//                                 <p className="text-sm font-semibold text-gray-800">{comment.author.firstName} {comment.author.lastName} <span className="text-xs text-muted-foreground font-normal">{safeFormatDistanceToNow(comment.createdAt)}</span></p>
//                                 <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
//                               </div>
//                               <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleOpenDeleteCommentModal(comment)} disabled={isTaskDetailsMutating}><Trash2 className="h-3 w-3 text-red-500"/></Button>
//                             </div>
//                           ))}
//                         </div>
//                         <div className="mt-4 bg-white p-4 border-t border-gray-200 flex-shrink-0">
//                           <div className="flex items-end gap-2">
//                             <Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src="https://github.com/shadcn.png" /><AvatarFallback className="bg-gray-200 text-gray-800">You</AvatarFallback></Avatar>
//                             <Textarea placeholder="Add a comment..." rows={1} value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 resize-none overflow-hidden" style={{ minHeight: '38px' }}/>
//                             <Button size="sm" onClick={handleAddComment} className="h-9 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0" disabled={isTaskDetailsMutating || !newComment.trim()}>{isTaskDetailsMutating ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Send'}</Button>
//                           </div>
//                         </div>

//                         {/* THE FIX: Modal moved inside the comments tab container */}
//                         {commentToDelete && deleteCommentModalOpen && (
//                             <div ref={customCommentModalRef} role="alertdialog" aria-labelledby="delete-comment-title" aria-describedby="delete-comment-description" tabIndex={-1} className="absolute inset-0 z-20 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setDeleteCommentModalOpen(false);}} onKeyDown={(e) => { if (e.key === "Escape") setDeleteCommentModalOpen(false);}}>
//                             <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
//                                 <div className="flex flex-col space-y-2 text-center sm:text-left">
//                                 <h2 id="delete-comment-title" className="text-lg font-semibold text-foreground">Delete Comment?</h2>
//                                 <p id="delete-comment-description" className="text-sm text-muted-foreground">Are you sure you want to delete this comment? This action cannot be undone.</p>
//                                 </div>
//                                 <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
//                                 <Button variant="outline" className="mt-2 sm:mt-0" onClick={() => setDeleteCommentModalOpen(false)} disabled={isTaskDetailsMutating}>Cancel</Button>
//                                 <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmCommentDelete} disabled={isTaskDetailsMutating}>{isTaskDetailsMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Comment"}</Button>
//                                 </div>
//                             </div>
//                             </div>
//                         )}
//                       </div>
//                     )}
//                     {activeTab === "activity" && (
//                       <div className="px-6 py-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
//                         <div className="space-y-4 text-sm text-muted-foreground">
//                             {taskDetails.activities.map((activity) => (
//                                 <ParsedActivityLogItem key={activity.id} activity={activity} />
//                             ))}
//                         </div>
//                       </div>
//                     )}
//                     {activeTab === "attachments" && (
//                       <div className="px-6 py-4 h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
//                         <h3 className="text-lg font-semibold mb-4 text-gray-800">Attachments</h3>
//                         <div className="mb-6 border-2 border-dashed border-gray-300 rounded-md p-6 text-center text-gray-600 hover:border-blue-500 hover:text-blue-700 transition-colors cursor-pointer">
//                           <label htmlFor="file-upload" className="block cursor-pointer">
//                             <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-400" />
//                             <span>Drag and drop files here or <span className="font-semibold text-blue-600">browse</span></span>
//                             <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isTaskDetailsMutating}/>
//                           </label>
//                         </div>
//                         <div className="flex-1 space-y-3">
//                             {taskDetails.attachments.map(attachment => (
//                                 <div key={attachment.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
//                                     <div className="flex items-center gap-3">
//                                         {getFileIcon(attachment.fileType)}
//                                         <a href={getDownloadableUrl(attachment.url)} download={attachment.fileName} rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:underline">{attachment.fileName}</a>
//                                     </div>
//                                     <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment" onClick={() => deleteAttachment(attachment.id)} disabled={isTaskDetailsMutating}><X className="h-4 w-4 text-gray-500" /></Button>
//                                 </div>
//                             ))}
//                         </div>
//                       </div>
//                     )}
//                     </>)}
//                   </div>
//                 </div>

//                 <div className="lg:col-span-1 border-l border-gray-200 bg-white pl-6 pr-6 mb-2 mr-2  py-6 flex flex-col flex-shrink-0 min-h-0 rounded-lg">
//                   <div className="space-y-4 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
//                     <h3 className="text-base font-semibold text-gray-800 mb-4">Details</h3>
//                     <div className="flex items-center gap-4 text-sm">
//                       <UserRoundIcon className="h-4 w-4 text-gray-500" />
//                       <div className="flex-1">
//                         <Label htmlFor="assignee-select" className="sr-only">Assignee</Label>
//                         <Select value={editingTaskLocal.assignee?.id || "null"} onValueChange={(v) => setEditingTaskLocal(prev => prev ? { ...prev, assignee: availableAssignees.find(a => a.id === v) || null } : null)} disabled={isTaskMutating}>
//                           <SelectTrigger id="assignee-select" className={cn("w-full text-gray-700 hover:bg-gray-50 rounded-md py-2 px-3 transition-colors", jiraSelectTriggerStyle)}>
//                             <SelectValue placeholder="Unassigned">
//                               <div className="flex items-center gap-2">
//                                 <Avatar className="h-6 w-6"><AvatarImage src={editingTaskLocal.assignee?.avatar || undefined} /><AvatarFallback className="text-xs bg-gray-100 text-gray-700">{`${editingTaskLocal.assignee?.firstName?.[0] || ''}${editingTaskLocal.assignee?.lastName?.[0] || ''}` || '?'}</AvatarFallback></Avatar>
//                                 <span>{editingTaskLocal.assignee?.firstName} {editingTaskLocal.assignee?.lastName || 'Unassigned'}</span>
//                               </div>
//                             </SelectValue>
//                           </SelectTrigger>
//                           <SelectContent className="bg-white border-border">
//                             <SelectItem value="null"><div className="flex items-center gap-2"><Avatar className="h-6 w-6 border bg-gray-100"><AvatarImage src={undefined} /><AvatarFallback className="text-xs text-gray-700">?</AvatarFallback></Avatar><span>Unassigned</span></div></SelectItem>
//                             <DropdownMenuSeparator />
//                             {availableAssignees.map((a) => (<SelectItem key={a.id} value={a.id}><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarImage src={a.avatar || undefined} /><AvatarFallback className="text-xs bg-gray-100 text-gray-700">{`${a.firstName?.[0] || ''}${a.lastName?.[0] || ''}` || '?'}</AvatarFallback></Avatar><span>{a.firstName} {a.lastName}</span></div></SelectItem>))}
//                           </SelectContent>
//                         </Select>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-4 text-sm">
//                       <TagIcon className="h-4 w-4 text-gray-500" />
//                       <div className="flex-1">
//                         <Label htmlFor="priority-select" className="sr-only">Priority</Label>
//                         <Select value={editingTaskLocal.priority} onValueChange={(v: PriorityUI) => setEditingTaskLocal(prev => prev ? { ...prev, priority: v } : null)} disabled={isTaskMutating}>
//                           <SelectTrigger id="priority-select" className={cn("w-full text-gray-700 hover:bg-gray-50 rounded-md py-2 px-3 transition-colors", jiraSelectTriggerStyle)}>
//                             <SelectValue><div className="inline-flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[editingTaskLocal.priority])} /><span>{editingTaskLocal.priority}</span></div></SelectValue>
//                           </SelectTrigger>
//                           <SelectContent className="bg-white border-border">{(["Low", "Medium", "High"] as PriorityUI[]).map((p) => (<SelectItem key={p} value={p}><div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[p])} />{p}</div></SelectItem>))}</SelectContent>
//                         </Select>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-4 text-sm">
//                       <ListOrdered className="h-4 w-4 text-gray-500" />
//                       <div className="flex-1 flex items-center bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors">
//                         <Label htmlFor="story-points-input" className="sr-only">Story Points</Label>
//                         <Input id="story-points-input" type="number" value={editingTaskLocal.points ?? ""} onChange={(e) => setEditingTaskLocal(prev => prev ? { ...prev, points: Number.isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value) } : null)} className={cn("w-full text-gray-700", jiraInputStyle)} min={0} placeholder="Add points" disabled={isTaskMutating}/>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-4 text-sm">
//                       <CalendarIcon className="h-4 w-4 text-gray-500" />
//                       <div className="flex-1 flex items-center bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors">
//                         <Label htmlFor="start-date-input" className="sr-only">Start Date</Label>
//                         <Input id="start-date-input" type="date" value={""} onChange={(e) => {}} className={cn("w-full text-gray-700", jiraInputStyle)} placeholder="Set start date" disabled={isTaskMutating}/>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-4 text-sm">
//                       <ClockIcon className="h-4 w-4 text-gray-500" />
//                       <div className="flex-1 flex items-center bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors">
//                         <Label htmlFor="due-date-input" className="sr-only">Due Date</Label>
//                         <Input id="due-date-input" type="date" value={editingTaskLocal.due || ""} onChange={(e) => setEditingTaskLocal(prev => prev ? { ...prev, due: e.target.value } : null)} className={cn("w-full text-gray-700", jiraInputStyle)} placeholder="Set due date" disabled={isTaskMutating}/>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="mt-8 flex flex-col gap-2 flex-shrink-0">
//                     <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSheetSave} disabled={isTaskMutating}>{isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Changes</Button>
//                     <SheetClose asChild><Button variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-200" disabled={isTaskMutating}>Cancel</Button></SheetClose>
//                   </div>
//                 </div>
//               </div>
//             </>
//           ) : ( <div className="flex items-center justify-center p-6 text-muted-foreground flex-1">No task selected or data loading...</div> )}
//         </SheetContent>
//       </Sheet>

//       {/* MODALS */}

//       {sectionToDelete && deleteSectionModalOpen && (
//         <div ref={customModalRef} role="alertdialog" aria-labelledby="delete-section-title" aria-describedby="delete-section-description" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setDeleteSectionModalOpen(false); }} onKeyDown={(e) => { if (e.key === "Escape") setDeleteSectionModalOpen(false); }}>
//           <div className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
//             <div className="flex flex-col space-y-2 text-center sm:text-left">
//               <h2 id="delete-section-title" className="text-lg font-semibold text-foreground">Delete Section "{sectionToDelete.title}"?</h2>
//               <div id="delete-section-description" className="text-sm text-muted-foreground">
//                 {sectionToDelete.tasks.length > 0 ? (
//                   <>
//                     <p>This section contains {sectionToDelete.tasks.length} tasks. What would you like to do with them?</p>
//                     <div className="mt-4 space-y-2">
//                       <div className="flex items-center space-x-2"><Checkbox id="deleteTasks" checked={deleteTasksConfirmed} onCheckedChange={(checked: boolean) => setDeleteTasksConfirmed(checked)} disabled={isSectionMutating}/><Label htmlFor="deleteTasks">Delete all {sectionToDelete.tasks.length} tasks</Label></div>
//                       {!deleteTasksConfirmed && otherSections.length > 0 && (
//                         <div className="flex items-center space-x-2"><Checkbox id="reassignTasks" checked={!deleteTasksConfirmed && !!reassignToSectionOption} onCheckedChange={(checked: boolean) => { if (checked) setReassignToSectionOption(otherSections[0]?.id || null); else setReassignToSectionOption(null); }} disabled={isSectionMutating}/><Label htmlFor="reassignTasks">Reassign tasks to:</Label>
//                           {(!deleteTasksConfirmed && !!reassignToSectionOption) && (<Select value={reassignToSectionOption || undefined} onValueChange={(v) => setReassignToSectionOption(v)} disabled={isSectionMutating}><SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Select section" /></SelectTrigger><SelectContent>{otherSections.map(sec => (<SelectItem key={sec.id} value={sec.id}>{sec.title}</SelectItem>))}</SelectContent></Select>)}
//                         </div>
//                       )}
//                       {!deleteTasksConfirmed && otherSections.length === 0 && sectionToDelete.tasks.length > 0 && (<p className="text-red-500 text-sm">Cannot reassign tasks. No other sections available. You must delete the tasks.</p>)}
//                     </div>
//                   </>
//                 ) : (<p>Are you sure you want to delete this section? This action cannot be undone.</p>)}
//               </div>
//             </div>
//             <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
//               <Button variant="outline" className="mt-2 sm:mt-0" onClick={() => setDeleteSectionModalOpen(false)} disabled={isSectionMutating}>Cancel</Button>
//               <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmDeleteSection} disabled={isSectionMutating || (sectionToDelete.tasks.length > 0 && !deleteTasksConfirmed && !reassignToSectionOption)}>{isSectionMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Section"}</Button>
//             </div>
//           </div>
//         </div>
//       )}

//       {taskToDelete && deleteTaskModalOpen && (
//         <div ref={customTaskModalRef} role="alertdialog" aria-labelledby="delete-task-title" aria-describedby="delete-task-description" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTaskModalOpen(false);}} onKeyDown={(e) => { if (e.key === "Escape") setDeleteTaskModalOpen(false);}}>
//           <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
//             <div className="flex flex-col space-y-2 text-center sm:text-left"><h2 id="delete-task-title" className="text-lg font-semibold text-foreground">Delete Task "{taskToDelete.task.title}"?</h2><p id="delete-task-description" className="text-sm text-muted-foreground">Are you sure you want to delete this task? This action cannot be undone.</p></div>
//             <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
//               <Button variant="outline" className="mt-2 sm:mt-0" onClick={() => setDeleteTaskModalOpen(false)} disabled={isTaskMutating}>Cancel</Button>
//               <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmTaskDelete} disabled={isTaskMutating}>{isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Task"}</Button>
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// }

// // Helper component to parse and render activity logs
// function ParsedActivityLogItem({ activity }: { activity: ActivityUI }) {
//     let action = "performed an action";
//     let details: string | undefined = undefined;
//     let icon = <ActivityIcon className="h-4 w-4 text-gray-500" />;
//     let accentColor = "bg-gray-50";

//     try {
//         const data = activity.data;

//         if (!data || typeof data !== 'object') {
//             throw new Error("Activity data is missing or not an object.");
//         }
        
//         switch (activity.type) {
//             case 'TASK_CREATED':
//                 action = "created the task";
//                 icon = <PlusCircle className="h-4 w-4 text-green-600" />;
//                 accentColor = "bg-green-50";
//                 break;
//             case 'DESCRIPTION_UPDATED':
//                 action = "updated the description";
//                 icon = <Pencil className="h-4 w-4 text-blue-500" />;
//                 accentColor = "bg-blue-50";
//                 break;
//             case 'ASSIGNEE_CHANGED':
//                 action = "changed the assignee";
//                 details = `${(data as any).oldAssignee || 'Unassigned'} → ${(data as any).newAssignee || 'Unassigned'}`;
//                 icon = <UserRoundIcon className="h-4 w-4 text-emerald-500" />;
//                 accentColor = "bg-emerald-50";
//                 break;
//             case 'PRIORITY_CHANGED':
//                 action = "changed the priority";
//                 details = `${(data as any).oldPriority} → ${(data as any).newPriority}`;
//                 icon = <TagIcon className="h-4 w-4 text-orange-500" />;
//                 accentColor = "bg-orange-50";
//                 break;
//             case 'POINTS_UPDATED':
//                 action = "updated story points";
//                 details = `${(data as any).oldPoints ?? 'No'} points → ${(data as any).newPoints ?? 'No'} points`;
//                 icon = <ListOrdered className="h-4 w-4 text-purple-500" />;
//                 accentColor = "bg-purple-50";
//                 break;
//             case 'STATUS_CHANGED':
//                  action = "changed the status";
//                  details = `${(data as any).oldStatus} → ${(data as any).newStatus}`;
//                  icon = <CheckCircle2 className="h-4 w-4 text-green-600" />;
//                  accentColor = "bg-green-50";
//                  break;
//              case 'COMMENT_ADDED':
//                  action = "added a new comment";
//                  details = `"${(data as any).content}"`;
//                  icon = <MessageSquareIcon className="h-4 w-4 text-gray-500" />;
//                  accentColor = "bg-gray-50";
//                  break;
//             default:
//                 action = `performed an action: ${activity.type}`;
//         }
//     } catch (e) {
//         console.error("Failed to process activity data", activity.data, e);
//         if (typeof activity.data === 'string') {
//              details = activity.data;
//         } else {
//             details = "Could not display activity details.";
//         }
//     }
    
//     return (
//         <ActivityLogItem
//             user={activity.user}
//             action={action}
//             details={details}
//             time={safeFormatDistanceToNow(activity.createdAt)}
//             icon={icon}
//             accentColor={accentColor}
//         />
//     )
// }

// // Helper component for Activity Log Items styling
// interface ActivityLogItemProps {
//   user: {
//     firstName: string;
//     lastName: string;
//     avatar?: string;
//   };
//   action: string;
//   details?: string;
//   time: string;
//   icon: React.ReactNode;
//   accentColor: string;
// }

// function ActivityLogItem({ user, action, details, time, icon, accentColor }: ActivityLogItemProps) {
//   const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.trim() || '?';
//   const userName = `${user.firstName} ${user.lastName}`.trim();

//   return (
//     <div className={cn("flex items-start gap-3 p-3 rounded-md shadow-sm border border-gray-200", accentColor)}>
//       <Avatar className="h-8 w-8">
//         {user.avatar && <AvatarImage src={user.avatar} />}
//         <AvatarFallback className="bg-gray-200 text-gray-800">{userInitials}</AvatarFallback>
//       </Avatar>
//       <div className="flex-1">
//         <div className="flex items-center gap-2">
//           {icon}
//           <p className="font-semibold text-gray-800">{userName} <span className="text-sm text-muted-foreground font-normal">{action}</span></p>
//         </div>
//         {details && <p className="text-xs text-gray-600 italic mt-1">{details}</p>}
//         <span className="text-xs text-muted-foreground block mt-1">{time}</span>
//       </div>
//     </div>
//   );
// }

// interface TaskRowProps {
//   task: TaskUI;
//   selected: boolean;
//   onSelect: (checked: boolean) => void;
//   onToggleCompleted: () => void;
//   onChange: (updates: Partial<TaskUI>) => void;
//   onOpen: () => void;
//   onDelete: (sectionId: string, taskId: string) => void;
//   assignees: UserAvatarPartial[];
// }

// function TaskRow({ task, selected, onSelect, onToggleCompleted, onChange, onOpen, onDelete, assignees }: TaskRowProps) {
//   const Icon = task.completed ? CheckCircle2 : Circle;
//   const cellInput = "h-8 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:border-0 focus:outline-none text-sm";
//   const assignee = task.assignee || { id: "unassigned", firstName: "Unassigned", lastName: "", avatar: "" };
//   const assigneeInitials = `${assignee.firstName?.[0] || ''}${assignee.lastName?.[0] || ''}`.trim() || '?';
//   const assigneeName = `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || 'Unassigned';

//   return (
//     <div className="grid grid-cols-[40px_1fr_180px_160px_140px_100px_96px] items-center gap-2 px-10 py-2 hover:bg-muted/40 focus-within:bg-emerald-50/50 focus-within:ring-1 focus-within:ring-emerald-200 rounded-md">
//       <div className="flex items-center"><Checkbox checked={selected} onCheckedChange={(v) => onSelect(!!v)} aria-label="Select task" /></div>
//       <div className="flex items-center gap-3 min-w-0">
//         <button onClick={onToggleCompleted} aria-pressed={!!task.completed} className={cn("inline-flex items-center justify-center rounded-full", task.completed ? "text-emerald-600" : "text-muted-foreground")} title="Toggle completed"><Icon className="h-4 w-4" /></button>
//         <Input className={cn(cellInput, "min-w-0 rounded-sm focus-visible:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0", task.completed && "line-through text-muted-foreground")} value={task.title} onChange={(e) => onChange({ title: e.target.value })} onFocus={(e) => e.currentTarget.select()}/>
//       </div>
//       <div className="justify-self-end w-[180px]">
//         <Select value={assignee.id} onValueChange={(v) => onChange({ assignee: assignees.find(a => a.id === v) || null })}>
//           <SelectTrigger className="h-8"><div className="flex items-center gap-2"><Avatar className="h-6 w-6 border"><AvatarImage src={assignee.avatar || undefined} /><AvatarFallback className="text-[10px]">{assigneeInitials}</AvatarFallback></Avatar><span className="text-sm truncate">{assigneeName}</span></div></SelectTrigger>
//           <SelectContent>{assignees.map((a) => (<SelectItem key={a.id} value={a.id}><div className="flex items-center gap-2"><Avatar className="h-5 w-5"><AvatarImage src={a.avatar || undefined} /><AvatarFallback className="text-xs">{`${a.firstName?.[0] || ''}${a.lastName?.[0] || ''}` || '?'}</AvatarFallback></Avatar><span>{a.firstName} {a.lastName}</span></div></SelectItem>))}</SelectContent>
//         </Select>
//       </div>
//       <div className="justify-self-end w-[160px]"><Input type="date" value={task.due || ""} onChange={(e) => onChange({ due: e.target.value })} className="h-8"/></div>
//       <div className="justify-self-end w-[140px]">
//         <Select value={task.priority} onValueChange={(v: PriorityUI) => onChange({ priority: v })}>
//           <SelectTrigger className="h-8"><div className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", priorityStyles[task.priority])}><span className={cn("mr-2 h-2 w-2 rounded-full", priorityDot[task.priority])} />{task.priority}</div></SelectTrigger>
//           <SelectContent>{(["Low", "Medium", "High"] as PriorityUI[]).map((p) => (<SelectItem key={p} value={p}><div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[p])} /><span>{p}</span></div></SelectItem>))}</SelectContent>
//         </Select>
//       </div>
//       <div className="justify-self-end w-[100px]"><Input className={cellInput} type="number" value={task.points ?? ""} onChange={(e) => onChange({ points: Number.isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value),})} min={0}/></div>
//       <div className="flex items-center justify-end gap-2 pr-2 w-[96px]">
//         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpen} title="Open task"><Pencil className="h-4 w-4" /></Button>
//         <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(task.sectionId, task.id)} title="Delete task"><Trash2 className="h-4 w-4" /></Button>
//       </div>
//     </div>
//   );
// }


"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  Pencil,
  Trash2,
  Loader2,
  EllipsisVertical,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

import {
  useProjectTasksAndSections,
  TaskUI,
  SectionUI,
  PriorityUI,
} from "@/hooks/useProjectTasksAndSections";
import { useProjectTaskMutations } from "@/hooks/useProjectTaskMutations";
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections";
import { TaskDetailSheet } from "../modals/task-detail-sheet";

type NewTaskForm = {
  title: string;
  assigneeId?: string | null;
  due?: string | null;
  priority: PriorityUI;
  points?: number | null;
  description?: string | null;
  sprintId?: string | null;
};

const priorityStyles: Record<PriorityUI, string> = {
  Low: "bg-green-100 text-green-700 ring-1 ring-green-200",
  Medium: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  High: "bg-red-100 text-red-700 ring-1 ring-red-200",
};
const priorityDot: Record<PriorityUI, string> = {
  Low: "bg-green-500",
  Medium: "bg-orange-500",
  High: "bg-red-500",
};

interface ListViewProps {
  projectId: string;
}

export function ListView({ projectId }: ListViewProps) {
  const [internalSelectedSprintId, setInternalSelectedSprintId] = useState<string | undefined>(undefined);
  
  const {
    sections: fetchedSections,
    sprintFilterOptions,
    loading,
    error,
    refetchProjectTasksAndSections,
    createSection,
    updateSection,
    deleteSection,
    projectMembers,
    defaultSelectedSprintId: suggestedDefaultSprintId,
  } = useProjectTasksAndSections(projectId, internalSelectedSprintId);

  useEffect(() => {
    if (internalSelectedSprintId === undefined && suggestedDefaultSprintId) {
      setInternalSelectedSprintId(suggestedDefaultSprintId);
    }
  }, [internalSelectedSprintId, suggestedDefaultSprintId]);

  const {
    createTask,
    updateTask: updateTaskMutation,
    toggleTaskCompleted: toggleTaskCompletedMutation,
    deleteTask: deleteTaskMutation,
    isTaskMutating,
    taskMutationError,
  } = useProjectTaskMutations(projectId, internalSelectedSprintId);

  const [sections, setSections] = useState<SectionUI[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sheetTask, setSheetTask] = useState<{ sectionId: string; taskId: string } | null>(null);

  const [newTaskOpen, setNewTaskOpen] = useState<Record<string, boolean>>({});
  const [newTask, setNewTask] = useState<Record<string, NewTaskForm>>({});
  const [isSectionMutating, setIsSectionMutating] = useState(false);

  // State for Modals
  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<SectionUI | null>(null);
  const [deleteTasksConfirmed, setDeleteTasksConfirmed] = useState(false);
  const [reassignToSectionOption, setReassignToSectionOption] = useState<string | null>(null);
  
  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ sectionId: string; task: TaskUI } | null>(null);

  // Refs for Modals
  const customModalRef = useRef<HTMLDivElement>(null);
  const customTaskModalRef = useRef<HTMLDivElement>(null);

  const sheetData = useMemo(() => {
    if (!sheetTask) return null;
    const s = sections.find((x) => x.id === sheetTask.sectionId);
    const t = s?.tasks.find((x) => x.id === sheetTask.taskId);
    return t ? { sectionId: sheetTask.sectionId, task: t } : null;
  }, [sheetTask, sections]);

  const availableAssignees: UserAvatarPartial[] = useMemo(() => {
    return projectMembers.map(member => ({
      id: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatar: member.user.avatar,
    }));
  }, [projectMembers]);

  const toggleSection = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const setSectionEditing = useCallback((id: string, editing: boolean) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing } : s)));
  }, []);

  const renameSection = useCallback(async (id: string, title: string) => {
    if (!title.trim()) {
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing: false } : s)));
      return;
    }
    setIsSectionMutating(true);
    try {
      await updateSection(id, title);
    } catch (err) {
      console.error(`[renameSection] Failed to rename section "${id}":`, err);
    } finally {
      setIsSectionMutating(false);
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing: false } : s)));
    }
  }, [updateSection]);

  const addSection = useCallback(async () => {
    setIsSectionMutating(true);
    try {
      await createSection("New Section");
      refetchProjectTasksAndSections();
    } catch (err) {
      console.error("[addSection] Failed to add section:", err);
    } finally {
      setIsSectionMutating(false);
    }
  }, [createSection, refetchProjectTasksAndSections]);

  const toggleTaskCompleted = useCallback(async (sectionId: string, taskId: string) => {
    const taskToUpdate = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;
    setSections((prev) => prev.map((s) =>
        s.id === sectionId
          ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed, status: !t.completed ? 'DONE' : 'TODO' } : t)),}
          : s,
      ));
    try {
      await toggleTaskCompletedMutation(taskId, taskToUpdate.status);
    } catch (err) {
      console.error(`[toggleTaskCompleted] Failed to toggle task "${taskId}" completion:`, err);
      setSections((prev) => prev.map((s) =>
          s.id === sectionId
            ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed, status: !t.completed ? 'TODO' : 'DONE' } : t)),}
            : s,
        ));
    }
  }, [sections, toggleTaskCompletedMutation]);

  const updateTask = useCallback(async (sectionId: string, taskId: string, updates: Partial<TaskUI>) => {
    const originalTask = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    const mutationInput: { [key: string]: any } = { id: taskId };
    if (updates.title !== undefined) mutationInput.title = updates.title;
    if (updates.description !== undefined) mutationInput.description = updates.description;
    if (updates.priority !== undefined) mutationInput.priority = updates.priority;
    if (updates.points !== undefined) mutationInput.points = updates.points;
    if (updates.due !== undefined) mutationInput.dueDate = updates.due;
    if (updates.assignee !== undefined) mutationInput.assigneeId = updates.assignee?.id || null;
    const newStatus = updates.completed !== undefined ? (updates.completed ? 'DONE' : 'TODO') : undefined;
    if (newStatus !== undefined) mutationInput.status = newStatus;

    setSections((prev) => prev.map((s) =>
        s.id === sectionId
          ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),}
          : s,
      ));

    if (Object.keys(mutationInput).length > 1) {
      try {
        await updateTaskMutation(taskId, mutationInput);
      } catch (err) {
        console.error(`[updateTask] Failed to update task "${taskId}":`, err);
        setSections((prev) => prev.map((s) =>
            s.id === sectionId
              ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? originalTask : t)),}
              : s,
          ));
      }
    }
  }, [sections, updateTaskMutation]);

  const openDeleteTaskModal = useCallback((sectionId: string, task: TaskUI) => {
    setTaskToDelete({ sectionId, task });
    setDeleteTaskModalOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetTask(null);
  }, []);

  const handleConfirmTaskDelete = useCallback(async () => {
    if (!taskToDelete) return;
    const sectionId = taskToDelete.sectionId;
    const taskId = taskToDelete.task.id;
    const originalSections = [...sections];

    setSections((prev) => prev.map((s) =>
        s.id === sectionId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s,
      ));
    setSelected((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });

    try {
      await deleteTaskMutation(taskId);
    } catch (err) {
      console.error(`[handleConfirmTaskDelete] Failed to delete task "${taskId}":`, err);
      setSections(originalSections);
      refetchProjectTasksAndSections();
    } finally {
      setDeleteTaskModalOpen(false);
      setTaskToDelete(null);
      if (sheetTask?.taskId === taskId) {
        closeSheet();
      }
    }
  }, [taskToDelete, sections, deleteTaskMutation, refetchProjectTasksAndSections, sheetTask, closeSheet]);

  const allTaskIds = useMemo(() => sections.flatMap((s) => s.tasks.map((t) => t.id)), [sections]);

  const toggleSelect = useCallback((taskId: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [taskId]: checked }));
  }, []);

  const toggleSelectAll = useCallback((checked: boolean) => {
    if (!checked) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const id of allTaskIds) next[id] = true;
    setSelected(next);
  }, [allTaskIds]);

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const bulkDeleteSelected = useCallback(async () => {
    const toDelete = new Set(Object.entries(selected).filter(([, v]) => v).map(([k]) => k));
    if (toDelete.size === 0) return;

    const originalSections = [...sections];
    setSections((prev) => prev.map((s) => ({ ...s, tasks: s.tasks.filter((t) => !toDelete.has(t.id)),})));
    setSelected({});

    try {
      for (const taskId of Array.from(toDelete)) {
        await deleteTaskMutation(taskId);
      }
    } catch (err) {
      console.error("[bulkDeleteSelected] Failed to bulk delete tasks:", err);
      setSections(originalSections);
      refetchProjectTasksAndSections();
    }
  }, [selected, sections, deleteTaskMutation, refetchProjectTasksAndSections]);

  const openNewTask = useCallback((sectionId: string) => {
    setNewTaskOpen((p) => ({ ...p, [sectionId]: true }));
    setNewTask((p) => ({
      ...p,
      [sectionId]: p[sectionId] || {
        title: "",
        assigneeId: availableAssignees[0]?.id || null,
        due: null,
        priority: "Medium",
        points: null,
        description: null,
        sprintId: internalSelectedSprintId || null,
      },
    }));
  }, [availableAssignees, internalSelectedSprintId]);

  const cancelNewTask = useCallback((sectionId: string) => {
    setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
  }, []);

  const saveNewTask = useCallback(async (sectionId: string) => {
    const form = newTask[sectionId];
    if (!form || !form.title.trim()) return;
    const assignedSprintId = internalSelectedSprintId || null;
    try {
      let createdTask: TaskUI = await createTask(sectionId, {
        title: form.title,
        description: form.description,
        assigneeId: form.assigneeId,
        dueDate: form.due,
        priority: form.priority,
        points: form.points,
        sprintId: assignedSprintId,
        status: 'TODO',
      });
      if (!createdTask.sprintId) {
        createdTask = { ...createdTask, sprintId: assignedSprintId };
      }
      setSections(prevSections => prevSections.map(s => {
          if (s.id === sectionId) {
            const taskBelongsToCurrentSprint = !assignedSprintId || (createdTask.sprintId === assignedSprintId);
            if (taskBelongsToCurrentSprint) {
              return { ...s, tasks: [...s.tasks, createdTask],};
            }
          }
          return s;
        }));
      setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
      setNewTask((p) => { const newState = { ...p }; delete newState[sectionId]; return newState; });
    } catch (err) {
      console.error(`[saveNewTask] Failed to create task in section "${sectionId}":`, err);
    }
  }, [newTask, createTask, internalSelectedSprintId]);

  const openSheetFor = useCallback((sectionId: string, taskId: string) => {
    setSheetTask({ sectionId, taskId });
  }, []);

  useEffect(() => {
    if (fetchedSections) {
      setSections(fetchedSections);
      setCollapsed(prevCollapsed => {
        const newCollapsedState: Record<string, boolean> = {};
        fetchedSections.forEach(sec => {
          newCollapsedState[sec.id] = prevCollapsed[sec.id] ?? false;
        });
        return newCollapsedState;
      });
    }
  }, [fetchedSections]);

  const handleOpenDeleteSectionModal = useCallback((section: SectionUI) => {
    setSectionToDelete(section);
    setDeleteTasksConfirmed(false);
    const availableOtherSections = sections.filter(s => s.id !== section.id);
    setReassignToSectionOption(availableOtherSections[0]?.id || null);
    setDeleteSectionModalOpen(true);
  }, [sections]);

  const handleConfirmDeleteSection = useCallback(async () => {
    if (!sectionToDelete) return;
    setIsSectionMutating(true);
    try {
      const hasTasks = sectionToDelete.tasks.length > 0;
      let reassignId: string | null | undefined = null;
      if (hasTasks && !deleteTasksConfirmed) {
        reassignId = reassignToSectionOption;
        if (!reassignId) {
          setIsSectionMutating(false);
          return;
        }
      }
      await deleteSection(sectionToDelete.id, {
        deleteTasks: hasTasks ? deleteTasksConfirmed : true,
        reassignToSectionId: reassignId,
      });
      refetchProjectTasksAndSections();
    } catch (err) {
      console.error(`[handleConfirmDeleteSection] Failed to delete section "${sectionToDelete.id}":`, err);
    } finally {
      setIsSectionMutating(false);
      setDeleteSectionModalOpen(false);
      setSectionToDelete(null);
    }
  }, [sectionToDelete, deleteTasksConfirmed, reassignToSectionOption, deleteSection, refetchProjectTasksAndSections]);

  // Modal Focus Management
  useEffect(() => {
    if (deleteSectionModalOpen && customModalRef.current) customModalRef.current.focus();
  }, [deleteSectionModalOpen]);
  useEffect(() => {
    if (deleteTaskModalOpen && customTaskModalRef.current) customTaskModalRef.current.focus();
  }, [deleteTaskModalOpen]);
  
  const allSelected = useMemo(() => selectedCount > 0 && selectedCount === allTaskIds.length, [selectedCount, allTaskIds]);
  const otherSections = useMemo(() => sections.filter(s => s.id !== sectionToDelete?.id), [sections, sectionToDelete]);
  const currentSprintName = useMemo(() => {
    const activeSprintId = internalSelectedSprintId || suggestedDefaultSprintId;
    return sprintFilterOptions.find(s => s.id === activeSprintId)?.name || "";
  }, [internalSelectedSprintId, sprintFilterOptions, suggestedDefaultSprintId]);

  const handleSprintSelectionChange = useCallback((sprintId: string) => {
    setInternalSelectedSprintId(sprintId);
    refetchProjectTasksAndSections();
  }, [refetchProjectTasksAndSections]);

  if (loading) return <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30"><Loader2 className="h-10 w-10 animate-spin text-teal-500" /><p className="ml-4 text-lg text-slate-700">Loading tasks and sections...</p></div>;
  if (error) return <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-red-100 text-red-700 p-4"><p className="text-lg">Error loading tasks: {error.message}</p></div>;

  if (!sections || sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(10vh-64px)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Tasks in "{currentSprintName}"</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">The selected sprint "{currentSprintName}" has no tasks. Add a new task or select a different sprint.</p>
        <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">{isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}+ Add Section</Button>
      </div>
    );
  }

  return (
    <div className="p-6 pt-3">
      <div className="flex items-center gap-3">
        <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">{isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}+ Add section</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">{currentSprintName}<ChevronDown className="h-4 w-4 text-muted-foreground" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            {sprintFilterOptions.map((sprint) => (
              <DropdownMenuItem key={sprint.id} onClick={() => handleSprintSelectionChange(sprint.id)}>{sprint.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto relative w-[260px]"><Input className="h-9" placeholder="Search tasks..." /></div>
      </div>

      {selectedCount > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
          <div>{selectedCount} selected</div>
          <Button variant="destructive" className="h-8" onClick={bulkDeleteSelected}>Delete selected</Button>
        </div>
      )}

      <div className="mt-4 w-full rounded-md overflow-x-auto">
        <Separator />
        {sections.map((section) => (
          <div key={section.id} className="w-full">
            <div className="flex w-full items-center gap-2 px-5 py-4">
              <button onClick={() => toggleSection(section.id)} className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/40" aria-label={collapsed[section.id] ? "Expand section" : "Collapse section"} title={collapsed[section.id] ? "Expand" : "Collapse"}>
                {collapsed[section.id] ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {section.editing ? (
                <Input autoFocus defaultValue={section.title} className="h-8 w-64" onBlur={(e) => renameSection(section.id, e.target.value.trim() || "Untitled")} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setSectionEditing(section.id, false);}} disabled={isSectionMutating}/>
              ) : (
                <button className="text-sm font-semibold text-left hover:underline" onClick={() => setSectionEditing(section.id, true)} title="Rename section" disabled={isSectionMutating}>{section.title}</button>
              )}

              <div className="ml-auto flex items-center gap-2">
                {!newTaskOpen[section.id] && (<Button variant="outline" size="sm" onClick={() => openNewTask(section.id)} disabled={isTaskMutating}>+ Add task</Button>)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isSectionMutating}><EllipsisVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleOpenDeleteSectionModal(section)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete Section</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {!collapsed[section.id] && (
              <div className="w-full">
                {section.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} selected={!!selected[task.id]} onSelect={(checked) => toggleSelect(task.id, checked)} onToggleCompleted={() => toggleTaskCompleted(section.id, task.id)} onChange={(updates) => updateTask(section.id, task.id, updates)} onOpen={() => openSheetFor(section.id, task.id)} onDelete={(sid, tid) => openDeleteTaskModal(sid, { id: tid, title: task.title, sectionId: sid } as TaskUI)} assignees={availableAssignees}/>
                ))}
                {newTaskOpen[section.id] && (
                  <div className="px-10 py-4">
                    <div className="rounded-md border p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Title</label>
                          <Input value={newTask[section.id]?.title || ""} onChange={(e) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), title: e.target.value },}))} placeholder="Task title" disabled={isTaskMutating}/>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Assignee</label>
                          <Select value={newTask[section.id]?.assigneeId || "null"} onValueChange={(v) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), assigneeId: v === "null" ? null : v },}))} disabled={isTaskMutating}>
                            <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
                            <SelectContent><SelectItem value="null">Unassigned</SelectItem><DropdownMenuSeparator />{availableAssignees.map((a) => (<SelectItem key={a.id} value={a.id}>{a.firstName || a.id} {a.lastName}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Due date</label>
                          <Input type="date" value={newTask[section.id]?.due || ""} onChange={(e) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), due: e.target.value },}))} disabled={isTaskMutating}/>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Priority</label>
                          <Select value={newTask[section.id]?.priority || "Medium"} onValueChange={(v: PriorityUI) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), priority: v },}))} disabled={isTaskMutating}>
                            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                            <SelectContent>{(["Low", "Medium", "High"] as PriorityUI[]).map((p) => (<SelectItem key={p} value={p}><div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[p])} />{p}</div></SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Story Points</label>
                          <div className="flex items-center gap-2">
                            <Input type="number" className="w-24" value={newTask[section.id]?.points ?? ""} onChange={(e) => setNewTask((p) => ({ ...p, [section.id]: { ...(p[section.id] as NewTaskForm), points: Number.isFinite(Number.parseInt(e.target.value)) ? Number.parseInt(e.target.value) : null,},}))} min={0} disabled={isTaskMutating}/>
                            <Button aria-label="Create task" onClick={() => saveNewTask(section.id)} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isTaskMutating || !newTask[section.id]?.title.trim()}>{isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create</Button>
                            <Button aria-label="Cancel task creation" variant="ghost" className="h-9 bg-red-600 hover:bg-red-700 text-white" onClick={() => cancelNewTask(section.id)} disabled={isTaskMutating}>Cancel</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <Separator />
          </div>
        ))}
      </div>

      <TaskDetailSheet
        sheetTask={sheetTask}
        initialTaskData={sheetData?.task || null}
        onClose={closeSheet}
        onUpdateTask={updateTask}
        onRequestDelete={openDeleteTaskModal}
        availableAssignees={availableAssignees}
        isTaskMutating={isTaskMutating}
      />

      {/* MODALS */}

      {sectionToDelete && deleteSectionModalOpen && (
        <div ref={customModalRef} role="alertdialog" aria-labelledby="delete-section-title" aria-describedby="delete-section-description" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setDeleteSectionModalOpen(false); }} onKeyDown={(e) => { if (e.key === "Escape") setDeleteSectionModalOpen(false); }}>
          <div className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 id="delete-section-title" className="text-lg font-semibold text-foreground">Delete Section "{sectionToDelete.title}"?</h2>
              <div id="delete-section-description" className="text-sm text-muted-foreground">
                {sectionToDelete.tasks.length > 0 ? (
                  <>
                    <p>This section contains {sectionToDelete.tasks.length} tasks. What would you like to do with them?</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2"><Checkbox id="deleteTasks" checked={deleteTasksConfirmed} onCheckedChange={(checked: boolean) => setDeleteTasksConfirmed(checked)} disabled={isSectionMutating}/><Label htmlFor="deleteTasks">Delete all {sectionToDelete.tasks.length} tasks</Label></div>
                      {!deleteTasksConfirmed && otherSections.length > 0 && (
                        <div className="flex items-center space-x-2"><Checkbox id="reassignTasks" checked={!deleteTasksConfirmed && !!reassignToSectionOption} onCheckedChange={(checked: boolean) => { if (checked) setReassignToSectionOption(otherSections[0]?.id || null); else setReassignToSectionOption(null); }} disabled={isSectionMutating}/><Label htmlFor="reassignTasks">Reassign tasks to:</Label>
                          {(!deleteTasksConfirmed && !!reassignToSectionOption) && (<Select value={reassignToSectionOption || undefined} onValueChange={(v) => setReassignToSectionOption(v)} disabled={isSectionMutating}><SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Select section" /></SelectTrigger><SelectContent>{otherSections.map(sec => (<SelectItem key={sec.id} value={sec.id}>{sec.title}</SelectItem>))}</SelectContent></Select>)}
                        </div>
                      )}
                      {!deleteTasksConfirmed && otherSections.length === 0 && sectionToDelete.tasks.length > 0 && (<p className="text-red-500 text-sm">Cannot reassign tasks. No other sections available. You must delete the tasks.</p>)}
                    </div>
                  </>
                ) : (<p>Are you sure you want to delete this section? This action cannot be undone.</p>)}
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button variant="outline" className="mt-2 sm:mt-0" onClick={() => setDeleteSectionModalOpen(false)} disabled={isSectionMutating}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmDeleteSection} disabled={isSectionMutating || (sectionToDelete.tasks.length > 0 && !deleteTasksConfirmed && !reassignToSectionOption)}>{isSectionMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Section"}</Button>
            </div>
          </div>
        </div>
      )}

      {taskToDelete && deleteTaskModalOpen && (
        <div ref={customTaskModalRef} role="alertdialog" aria-labelledby="delete-task-title" aria-describedby="delete-task-description" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTaskModalOpen(false);}} onKeyDown={(e) => { if (e.key === "Escape") setDeleteTaskModalOpen(false);}}>
          <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
            <div className="flex flex-col space-y-2 text-center sm:text-left"><h2 id="delete-task-title" className="text-lg font-semibold text-foreground">Delete Task "{taskToDelete.task.title}"?</h2><p id="delete-task-description" className="text-sm text-muted-foreground">Are you sure you want to delete this task? This action cannot be undone.</p></div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button variant="outline" className="mt-2 sm:mt-0" onClick={() => setDeleteTaskModalOpen(false)} disabled={isTaskMutating}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmTaskDelete} disabled={isTaskMutating}>{isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Task"}</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

interface TaskRowProps {
  task: TaskUI;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onToggleCompleted: () => void;
  onChange: (updates: Partial<TaskUI>) => void;
  onOpen: () => void;
  onDelete: (sectionId: string, taskId: string) => void;
  assignees: UserAvatarPartial[];
}

function TaskRow({ task, selected, onSelect, onToggleCompleted, onChange, onOpen, onDelete, assignees }: TaskRowProps) {
  const Icon = task.completed ? CheckCircle2 : Circle;
  const cellInput = "h-8 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:border-0 focus:outline-none text-sm";
  const assignee = task.assignee || { id: "unassigned", firstName: "Unassigned", lastName: "", avatar: "" };
  const assigneeInitials = `${assignee.firstName?.[0] || ''}${assignee.lastName?.[0] || ''}`.trim() || '?';
  const assigneeName = `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || 'Unassigned';

  return (
    <div className="grid grid-cols-[40px_1fr_180px_160px_140px_100px_96px] items-center gap-2 px-10 py-2 hover:bg-muted/40 focus-within:bg-emerald-50/50 focus-within:ring-1 focus-within:ring-emerald-200 rounded-md">
      <div className="flex items-center"><Checkbox checked={selected} onCheckedChange={(v) => onSelect(!!v)} aria-label="Select task" /></div>
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onToggleCompleted} aria-pressed={!!task.completed} className={cn("inline-flex items-center justify-center rounded-full", task.completed ? "text-emerald-600" : "text-muted-foreground")} title="Toggle completed"><Icon className="h-4 w-4" /></button>
        <Input className={cn(cellInput, "min-w-0 rounded-sm focus-visible:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0", task.completed && "line-through text-muted-foreground")} value={task.title} onChange={(e) => onChange({ title: e.target.value })} onFocus={(e) => e.currentTarget.select()}/>
      </div>
      <div className="justify-self-end w-[180px]">
        <Select value={assignee.id} onValueChange={(v) => onChange({ assignee: assignees.find(a => a.id === v) || null })}>
          <SelectTrigger className="h-8"><div className="flex items-center gap-2"><Avatar className="h-6 w-6 border"><AvatarImage src={assignee.avatar || undefined} /><AvatarFallback className="text-[10px]">{assigneeInitials}</AvatarFallback></Avatar><span className="text-sm truncate">{assigneeName}</span></div></SelectTrigger>
          <SelectContent>{assignees.map((a) => (<SelectItem key={a.id} value={a.id}><div className="flex items-center gap-2"><Avatar className="h-5 w-5"><AvatarImage src={a.avatar || undefined} /><AvatarFallback className="text-xs">{`${a.firstName?.[0] || ''}${a.lastName?.[0] || ''}` || '?'}</AvatarFallback></Avatar><span>{a.firstName} {a.lastName}</span></div></SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div className="justify-self-end w-[160px]"><Input type="date" value={task.due || ""} onChange={(e) => onChange({ due: e.target.value })} className="h-8"/></div>
      <div className="justify-self-end w-[140px]">
        <Select value={task.priority} onValueChange={(v: PriorityUI) => onChange({ priority: v })}>
          <SelectTrigger className="h-8"><div className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", priorityStyles[task.priority])}><span className={cn("mr-2 h-2 w-2 rounded-full", priorityDot[task.priority])} />{task.priority}</div></SelectTrigger>
          <SelectContent>{(["Low", "Medium", "High"] as PriorityUI[]).map((p) => (<SelectItem key={p} value={p}><div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[p])} /><span>{p}</span></div></SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div className="justify-self-end w-[100px]"><Input className={cellInput} type="number" value={task.points ?? ""} onChange={(e) => onChange({ points: Number.isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value),})} min={0}/></div>
      <div className="flex items-center justify-end gap-2 pr-2 w-[96px]">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpen} title="Open task"><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(task.sectionId, task.id)} title="Delete task"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
