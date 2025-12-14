"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pencil,
  Trash2,
  Loader2,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  UserRoundIcon,
  MessageSquareIcon,
  ActivityIcon,
  X,
  PlusCircle,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Paperclip,
  FileText,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileWarning,
  FileArchive,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections";
import { useTaskDetails } from "@/hooks/useTaskDetails";
import { ActivityUI, CommentUI } from "@/types/taskDetails";
import type { TaskStatus } from "@prisma/client";

// Define generic types that work for both personal and project tasks
type PriorityUI = "LOW" | "MEDIUM" | "HIGH";
type TaskStatusUI = TaskStatus; // "TODO" | "IN_PROGRESS" | "DONE"

type TaskUI = {
  id: string;
  title: string;
  description: string | null;
  priority: PriorityUI;
  startDate: string | null;
  endDate: string | null;
  points: number | null;
  sectionId: string; // Required for callbacks like delete
  assignee?: UserAvatarPartial | null; // Project-specific, but optional for personal
  status?: TaskStatusUI; // Project-specific, optional
  completed?: boolean; // Personal-specific, optional
};


const priorityDot: Record<PriorityUI, string> = {
  LOW: "bg-green-500",
  MEDIUM: "bg-orange-500",
  HIGH: "bg-red-500",
};

// Styling for inputs without border, like Jira
const jiraInputStyle = "focus-visible:ring-0 focus-visible:ring-offset-0 border-none px-0 py-1 shadow-none bg-transparent";
const jiraTextareaStyle = "focus-visible:ring-0 focus-visible:ring-offset-0 border-none px-0 py-1 shadow-none resize-y bg-transparent";
const jiraSelectTriggerStyle = "focus:ring-0 focus:ring-offset-0 border-none h-auto px-0 py-1 shadow-none bg-transparent";

// Helper to get file icon based on file type
const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-5 w-5 text-yellow-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <FileArchive className="h-5 w-5 text-orange-500" />;
    if (fileType.includes('zip') || fileType.includes('archive')) return <FileArchive className="h-5 w-5 text-gray-500" />;
    if (fileType.includes('javascript') || fileType.includes('json') || fileType.includes('typescript') || fileType.includes('html') || fileType.includes('css')) return <FileCode className="h-5 w-5 text-indigo-500" />;
    return <FileWarning className="h-5 w-5 text-gray-500" />;
};

// Helper to safely format dates and prevent crashes from invalid values
const safeFormatDistanceToNow = (dateInput: string | number | Date | null | undefined): string => {
  if (!dateInput) {
    return "unknown time";
  }
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date value provided to safeFormatDistanceToNow:", dateInput);
      return "a while ago";
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting date with formatDistanceToNow:", dateInput, error);
    return "a while ago";
  }
};

const formatDateForDisplay = (dateString: string | null | undefined) => {
  if (!dateString) return "None";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "Invalid Date";
  }
};

// Helper to format an ISO date string into YYYY-MM-DD for date inputs
const formatDateForInput = (isoDateString: string | null | undefined): string => {
  if (!isoDateString) return ""; // Return empty string if no date
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return "";
    // Extracts the YYYY-MM-DD part from the ISO string
    return date.toISOString().slice(0, 10);
  } catch (error) {
    return ""; // Return empty string on error
  }
};

// Helper to transform a Cloudinary URL to force download
const getDownloadableUrl = (url: string) => {
      if (url.includes('/raw/') || url.toLowerCase().endsWith('.pdf')) {
        return url;
    }

    const parts = url.split('/upload/');
    if (parts.length === 2) {
        // fl_attachment flag tells Cloudinary to send Content-Disposition header
        return `${parts[0]}/upload/fl_attachment/${parts[1]}`;
    }
    return url; // Return original URL if format is unexpected
};

interface TaskDetailSheetProps {
  sheetTask: { sectionId: string; taskId: string } | null;
  onClose: () => void;
  onUpdateTask: (sectionId: string, taskId: string, updates: Partial<TaskUI>) => Promise<void>;
  onRequestDelete: (sectionId: string, task: TaskUI) => void;
  availableAssignees: UserAvatarPartial[];
  isTaskMutating: boolean;
}

export function TaskDetailSheet({
  sheetTask,
  onClose,
  onUpdateTask,
  onRequestDelete,
  availableAssignees,
  isTaskMutating,
}: TaskDetailSheetProps) {
  const [editingTaskLocal, setEditingTaskLocal] = useState<TaskUI | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "comments" | "activity" | "attachments">("description");
  const [newComment, setNewComment] = useState("");
  const [deleteCommentModalOpen, setDeleteCommentModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<CommentUI | null>(null);

  const descriptionContentEditableRef = useRef<HTMLDivElement>(null);
  const customCommentModalRef = useRef<HTMLDivElement>(null);

  const {
    taskDetails,
    loading: taskDetailsLoading,
    error: taskDetailsError,
    addComment,
    deleteComment,
    uploadAttachment,
    deleteAttachment,
    isMutating: isTaskDetailsMutating,
  } = useTaskDetails(sheetTask?.taskId || null);

  // SEPARATED EFFECT 1: Reset active tab only when the Task ID changes (User opens a new task)
  useEffect(() => {
    if (sheetTask?.taskId) {
      setActiveTab("description");
    }
  }, [sheetTask?.taskId]);

  // SEPARATED EFFECT 2: Sync local state with taskDetails updates (without resetting the tab)
  useEffect(() => {
    if (taskDetails) {
      setEditingTaskLocal(taskDetails);
      // Removed setActiveTab("description") from here
    } else {
      setEditingTaskLocal(null);
    }
  }, [taskDetails]);

  useEffect(() => {
    if (descriptionContentEditableRef.current && activeTab === "description" && taskDetails && editingTaskLocal) {
      const div = descriptionContentEditableRef.current;
      if (!editingTaskLocal.description?.trim()) {
        if (div.textContent?.trim() !== 'Add a detailed description...') {
          div.classList.add('text-muted-foreground', 'italic');
          div.textContent = 'Add a detailed description...';
        }
      } else {
        if (div.classList.contains('text-muted-foreground')) {
          div.classList.remove('text-muted-foreground', 'italic');
        }
        if (div.innerHTML !== editingTaskLocal.description) {
          div.innerHTML = editingTaskLocal.description;
        }
      }
    }
  }, [editingTaskLocal?.description, taskDetails, activeTab]);

  const handleSheetSave = useCallback(async () => {
    if (!sheetTask || !editingTaskLocal || !taskDetails) return;
    const originalTask = taskDetails;
    const updates: Partial<TaskUI> = {};
    if (editingTaskLocal.title !== originalTask.title) updates.title = editingTaskLocal.title;
    if (editingTaskLocal.description !== originalTask.description) updates.description = editingTaskLocal.description;
    if (editingTaskLocal.priority !== originalTask.priority) updates.priority = editingTaskLocal.priority;
    if (editingTaskLocal.points !== originalTask.points) updates.points = editingTaskLocal.points;
    if (editingTaskLocal.startDate !== originalTask.startDate) updates.startDate = editingTaskLocal.startDate;
    if (editingTaskLocal.endDate !== originalTask.endDate) updates.endDate = editingTaskLocal.endDate;
    if (editingTaskLocal.assignee?.id !== originalTask.assignee?.id) updates.assignee = editingTaskLocal.assignee;
    if (Object.keys(updates).length > 0) {
      await onUpdateTask(sheetTask.sectionId, sheetTask.taskId, updates);
    }
  }, [sheetTask, editingTaskLocal, taskDetails, onUpdateTask]);

  const handleEditorCommand = useCallback((command: string, value?: string) => {
    if (descriptionContentEditableRef.current) {
      descriptionContentEditableRef.current.focus();
      document.execCommand(command, false, value);
      if (descriptionContentEditableRef.current) {
        setEditingTaskLocal(prev => prev ? { ...prev, description: descriptionContentEditableRef.current?.innerHTML || '' } : null);
      }
    }
  }, []);
  
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(newComment);
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  }, [addComment, newComment]);

  const handleOpenDeleteCommentModal = useCallback((comment: CommentUI) => {
    setCommentToDelete(comment);
    setDeleteCommentModalOpen(true);
  }, []);

  const handleConfirmCommentDelete = useCallback(async () => {
    if (!commentToDelete) return;
    try {
        await deleteComment(commentToDelete.id);
    } catch (err) {
        console.error("Failed to delete comment:", err);
    } finally {
        setDeleteCommentModalOpen(false);
        setCommentToDelete(null);
    }
  }, [commentToDelete, deleteComment]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        await uploadAttachment(file);
      } catch (err) {
        console.error("Upload failed for file:", file.name, err);
      }
    }
    if (e.target) {
        e.target.value = '';
    }
  }, [uploadAttachment]);

  useEffect(() => {
    if (deleteCommentModalOpen && customCommentModalRef.current) customCommentModalRef.current.focus();
  }, [deleteCommentModalOpen]);


  return (
    <Sheet open={!!sheetTask} onOpenChange={(open) => (!open ? onClose() : null)}>
      <SheetContent side="right" className="w-full sm:max-w-[800px] bg-gray-100 border-l p-0 flex flex-col h-full max-h-screen">
        {taskDetailsLoading ? (
            <>
              <SheetHeader className="p-6 pb-0 sr-only">
                <SheetTitle>Loading Task</SheetTitle>
                <SheetDescription>Please wait while the task details are being loaded.</SheetDescription>
              </SheetHeader>
              <div className="flex items-center justify-center p-6 text-muted-foreground flex-1">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              </div>
            </>
        ) : taskDetails && editingTaskLocal ? (
          <>
            <SheetHeader className="p-6 pt-0 pb-0 border-b bg-white flex-shrink-0 sticky top-0 z-20">
              <SheetTitle className="sr-only">Edit Task</SheetTitle><SheetDescription className="sr-only">View and modify task details.</SheetDescription>
              <div className="flex justify-between items-center">
              <Input value={editingTaskLocal.title} onChange={(e) => setEditingTaskLocal(prev => prev ? { ...prev, title: e.target.value } : null)} className={cn("text-2xl font-bold mt-2", jiraInputStyle, "text-gray-800")} 
              //disabled={isTaskMutating}
              />
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onRequestDelete(taskDetails.sectionId, taskDetails)} title="Delete task"><Trash2 className="h-4 w-4" /></Button>
                  <SheetClose asChild><Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4 text-gray-500" /><span className="sr-only">Close</span></Button></SheetClose>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 h-full min-h-0">
              <div className="lg:col-span-2 flex flex-col h-full min-h-0">
                <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-2 pb-2 border-b border-gray-200 flex-shrink-0">
                  <div className="grid w-full grid-cols-4 h-10 bg-gray-200 rounded-md p-1">
                    <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "description" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("description")} aria-selected={activeTab === "description"}>Description</button>
                    <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "comments" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("comments")} aria-selected={activeTab === "comments"}>Comments</button>
                    <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "activity" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("activity")} aria-selected={activeTab === "activity"}>Activity</button>
                    <button type="button" className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", activeTab === "attachments" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100")} onClick={() => setActiveTab("attachments")} aria-selected={activeTab === "attachments"}>Attachments</button>
                  </div>
                </div>
                <div className="flex-1 h-full min-h-0">
                  {taskDetailsError ? ( <div className="p-6 text-red-600">Error: {taskDetailsError.message}</div> ) : ( <>
                  {activeTab === "description" && (
                    <div className="px-6 py-4  h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div className="mb-2 p-1 rounded-md bg-white border border-gray-200 flex gap-1 flex-wrap">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('bold')} title="Bold"><Bold className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('italic')} title="Italic"><Italic className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('underline')} title="Underline"><Underline className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('insertUnorderedList')} title="Unordered List"><List className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('insertOrderedList')} title="Ordered List"><ListOrdered className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('justifyLeft')} title="Align Left"><AlignLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('justifyCenter')} title="Align Center"><AlignCenter className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700 hover:bg-gray-100" onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditorCommand('justifyRight')} title="Align Right"><AlignRight className="h-4 w-4" /></Button>
                      </div>
                      <div>
                        <div ref={descriptionContentEditableRef} contentEditable="true" onInput={(e) => { const target = e.target as HTMLDivElement; setEditingTaskLocal(prev => prev ? { ...prev, description: target.innerHTML || '' } : null);}} onFocus={(e) => { const target = e.target as HTMLDivElement; if (target.classList.contains('text-muted-foreground') && target.textContent === 'Add a detailed description...') { target.textContent = ''; target.classList.remove('text-muted-foreground', 'italic');}}} onBlur={(e) => { const target = e.target as HTMLDivElement; if (!target.textContent?.trim() && target.innerHTML?.trim() === '') { target.classList.add('text-muted-foreground', 'italic'); target.textContent = 'Add a detailed description...'; setEditingTaskLocal(prev => prev ? { ...prev, description: '' } : null); } else { setEditingTaskLocal(prev => prev ? { ...prev, description: target.innerHTML || '' } : null);}}} onKeyDown={(e) => { if (e.key === 'Enter' && descriptionContentEditableRef.current) { e.preventDefault(); if (e.shiftKey) { document.execCommand('insertHTML', false, '<br>'); } else { document.execCommand('insertParagraph', false, ''); }}}} dangerouslySetInnerHTML={{ __html: (editingTaskLocal.description && editingTaskLocal.description.trim() !== '') ? editingTaskLocal.description : 'Add a detailed description...' }} className={cn("text-base w-full p-2 border border-gray-200 rounded-md bg-white text-gray-700", "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", "resize-none break-words", "min-h-[100px]", !editingTaskLocal.description && "text-muted-foreground italic")} style={{ whiteSpace: 'pre-wrap' }}></div>
                      </div>
                    </div>
                  )}
                  {activeTab === "comments" && (
                    <div className="relative flex flex-col h-full min-h-0">
                      <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
                        {taskDetails.comments.map((comment: CommentUI) => (
                          <div key={comment.id} className="group flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-gray-200">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={comment.author.avatar || undefined} />
                              <AvatarFallback 
                                className="text-xs text-white" 
                                style={{ backgroundColor: (comment.author as any)?.avatarColor   }}
                              >
                                {`${comment.author.firstName?.[0] || ''}${comment.author.lastName?.[0] || ''}`}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">{comment.author.firstName} {comment.author.lastName} <span className="text-xs text-muted-foreground font-normal">{safeFormatDistanceToNow(comment.createdAt)}</span></p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleOpenDeleteCommentModal(comment)} disabled={isTaskDetailsMutating}><Trash2 className="h-3 w-3 text-red-500"/></Button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 bg-white p-4 border-t border-gray-200 flex-shrink-0">
                        <div className="flex items-end gap-2">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-xs text-white" style={{ backgroundColor: "#6366f1" }}>You</AvatarFallback>
                          </Avatar>
                          <Textarea placeholder="Add a comment..." rows={1} value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 resize-none overflow-hidden" style={{ minHeight: '38px' }}/>
                          <Button size="sm" onClick={handleAddComment} className="h-9 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0" disabled={isTaskDetailsMutating || !newComment.trim()}>{isTaskDetailsMutating ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Send'}</Button>
                        </div>
                      </div>

                      {commentToDelete && deleteCommentModalOpen && (
                          <div ref={customCommentModalRef} role="alertdialog" aria-labelledby="delete-comment-title" aria-describedby="delete-comment-description" tabIndex={-1} className="absolute inset-0 z-20 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setDeleteCommentModalOpen(false);}} onKeyDown={(e) => { if (e.key === "Escape") setDeleteCommentModalOpen(false);}}>
                          <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
                              <div className="flex flex-col space-y-2 text-center sm:text-left">
                              <h2 id="delete-comment-title" className="text-lg font-semibold text-foreground">Delete Comment?</h2>
                              <p id="delete-comment-description" className="text-sm text-muted-foreground">Are you sure you want to delete this comment? This action cannot be undone.</p>
                              </div>
                              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                              <Button variant="outline" className="mt-2 sm:mt-0" onClick={() => setDeleteCommentModalOpen(false)} disabled={isTaskDetailsMutating}>Cancel</Button>
                              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmCommentDelete} disabled={isTaskDetailsMutating}>{isTaskDetailsMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Comment"}</Button>
                              </div>
                          </div>
                          </div>
                      )}
                    </div>
                  )}
                  {activeTab === "activity" && (
                    <div className="px-6 py-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div className="space-y-4 text-sm text-muted-foreground">
                          {taskDetails.activities.map((activity) => (
                              <ParsedActivityLogItem key={activity.id} activity={activity} />
                          ))}
                      </div>
                    </div>
                  )}
                  {activeTab === "attachments" && (
                    <div className="px-6 py-4 h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <h3 className="text-lg font-semibold mb-4 text-gray-800">Attachments</h3>
                      <div className="mb-6 border-2 border-dashed border-gray-300 rounded-md p-6 text-center text-gray-600 hover:border-blue-500 hover:text-blue-700 transition-colors cursor-pointer">
                        <label htmlFor="file-upload" className="block cursor-pointer">
                          <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <span>Drag and drop files here or <span className="font-semibold text-blue-600">browse</span></span>
                          <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isTaskDetailsMutating}/>
                        </label>
                      </div>
                      <div className="flex-1 space-y-3">
                          {taskDetails.attachments.map(attachment => (
                              <div key={attachment.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
                                  <div className="flex items-center gap-3 min-w-0">
                                      {getFileIcon(attachment.fileType)}
                                      <a href={getDownloadableUrl(attachment.url)}
                                       target="_blank"
                                       download={attachment.fileName} rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:underline truncate">{attachment.fileName}</a>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment" onClick={() => deleteAttachment(attachment.id)} disabled={isTaskDetailsMutating}><X className="h-4 w-4 text-gray-500" /></Button>
                              </div>
                          ))}
                      </div>
                    </div>
                  )}
                  </>)}
                </div>
              </div>

              <div className="lg:col-span-1 border-l border-gray-200 bg-white pl-6 pr-6 mb-2 mr-2  py-6 flex flex-col flex-shrink-0 min-h-0 rounded-lg">
                <div className="space-y-6 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
                  <div>
                    <Label htmlFor="assignee-select" className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                      <UserRoundIcon className="h-4 w-4 text-gray-500" /> Assignee
                    </Label>
                    <Select value={editingTaskLocal.assignee?.id || "null"} onValueChange={(v) => setEditingTaskLocal(prev => prev ? { ...prev, assignee: availableAssignees.find(a => a.id === v) || null } : null)}
                     //disabled={isTaskMutating}
                     >
                      <SelectTrigger id="assignee-select" className={cn("w-full text-gray-700 hover:bg-gray-50 rounded-md py-2 px-3 transition-colors border", jiraSelectTriggerStyle)}>
                        <SelectValue placeholder="Unassigned">
                          <div className="flex items-center gap-2">
                            {editingTaskLocal.assignee ? (
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={editingTaskLocal.assignee.avatar || undefined} />
                                    <AvatarFallback 
                                        className="text-xs text-white"
                                        style={{ backgroundColor: (editingTaskLocal.assignee as any)?.avatarColor   }}
                                    >
                                        {`${editingTaskLocal.assignee.firstName?.[0] || ''}${editingTaskLocal.assignee.lastName?.[0] || ''}`}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <Avatar className="h-6 w-6 border bg-gray-100">
                                    <AvatarImage src={undefined} />
                                    <AvatarFallback className="text-xs text-gray-700">?</AvatarFallback>
                                </Avatar>
                            )}
                            <span className="truncate">
                                {editingTaskLocal.assignee
                                    ? `${editingTaskLocal.assignee.firstName} ${editingTaskLocal.assignee.lastName}`.length > 15
                                    ? `${`${editingTaskLocal.assignee.firstName} ${editingTaskLocal.assignee.lastName}`.substring(0, 15)}...`
                                    : `${editingTaskLocal.assignee.firstName} ${editingTaskLocal.assignee.lastName}`
                                    : 'Unassigned'}
                            </span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border">
                        <div className="max-h-48 overflow-y-auto overflow-x-hidden">
                          <SelectItem value="null"><div className="flex items-center gap-2"><Avatar className="h-6 w-6 border bg-gray-100"><AvatarImage src={undefined} /><AvatarFallback className="text-xs text-gray-700">?</AvatarFallback></Avatar><span>Unassigned</span></div></SelectItem>
                          <DropdownMenuSeparator />
                          {availableAssignees.map((a) => {
                              const fullName = `${a.firstName} ${a.lastName}`;
                              return (
                                  <SelectItem key={a.id} value={a.id}>
                                      <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                              <AvatarImage src={a.avatar || undefined} />
                                              <AvatarFallback 
                                                  className="text-xs text-white" 
                                                  style={{ backgroundColor: (a as any).avatarColor   }}
                                              >
                                                  {`${a.firstName?.[0] || ''}${a.lastName?.[0] || ''}` || '?'}
                                              </AvatarFallback>
                                          </Avatar>
                                          <span className="truncate">
                                            {fullName.length > 15 ? `${fullName.substring(0, 15)}...` : fullName}
                                          </span>
                                      </div>
                                  </SelectItem>
                              )
                          })}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority-select" className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                      <TagIcon className="h-4 w-4 text-gray-500" /> Priority
                    </Label>
                    <Select value={editingTaskLocal.priority} onValueChange={(v: PriorityUI) => setEditingTaskLocal(prev => prev ? { ...prev, priority: v } : null)} 
                    //disabled={isTaskMutating}
                    >
                      <SelectTrigger id="priority-select" className={cn("w-full text-gray-700 hover:bg-gray-50 rounded-md py-2 px-3 transition-colors border", jiraSelectTriggerStyle)}>
                        <SelectValue><div className="inline-flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[editingTaskLocal.priority])} /><span>{editingTaskLocal.priority}</span></div></SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border">{(["LOW", "MEDIUM", "HIGH"] as PriorityUI[]).map((p) => (<SelectItem key={p} value={p}><div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priorityDot[p])} />{p}</div></SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="story-points-input" className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                        <ListOrdered className="h-4 w-4 text-gray-500" /> Story Points
                    </Label>
                    <Input id="story-points-input" type="number" value={editingTaskLocal.points ?? ""} onChange={(e) => setEditingTaskLocal(prev => prev ? { ...prev, points: Number.isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value) } : null)} className="w-full text-gray-700 border bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors" min={0} placeholder="Add points" 
                    //disabled={isTaskMutating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-date-input" className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                        <CalendarIcon className="h-4 w-4 text-gray-500" /> Start Date
                    </Label>
                    <Input id="start-date-input" type="date" value={formatDateForInput(editingTaskLocal.startDate)} onChange={(e) => setEditingTaskLocal(prev => prev ? { ...prev, startDate: e.target.value } : null)} className="w-full text-gray-700 border bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors" placeholder="Set start date" 
                    //disabled={isTaskMutating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date-input" className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                        <ClockIcon className="h-4 w-4 text-gray-500" /> End Date
                    </Label>
                    <Input id="end-date-input" type="date" value={formatDateForInput(editingTaskLocal.endDate)} onChange={(e) => setEditingTaskLocal(prev => prev ? { ...prev, endDate: e.target.value } : null)} className="w-full text-gray-700 border bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors" placeholder="Set end date" 
                    //disabled={isTaskMutating}
                    />
                  </div>
                </div>
                <div className="mt-8 flex flex-col gap-2 flex-shrink-0">
                  <Button className="bg-[#4ab5ae] text-white hover:bg-[#419d97]" onClick={handleSheetSave}
                  disabled={isTaskMutating}
                   >
                    {isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} 
                   Save Changes</Button>
                  <SheetClose asChild><Button variant="outline" 
                  className="bg-red-500 hover:bg-red-600 text-white" 
                  disabled={isTaskMutating}
                  >Cancel</Button></SheetClose>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="p-6 pb-0 sr-only">
              <SheetTitle>Task Details</SheetTitle>
              <SheetDescription>No task is currently selected or its data could not be loaded.</SheetDescription>
            </SheetHeader>
            <div className="flex items-center justify-center p-6 text-muted-foreground flex-1">
              No task selected or data could not be loaded.
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Helper component to parse and render activity logs
function ParsedActivityLogItem({ activity }: { activity: ActivityUI }) {
    let action = "performed an action";
    let details: React.ReactNode | undefined = undefined;
    let icon = <ActivityIcon className="h-4 w-4 text-gray-500" />;
    let accentColor = "bg-gray-50";

    try {
        const data = activity.data as any;

        if (!data || typeof data !== 'object') {
            throw new Error("Activity data is missing or not an object.");
        }
        
        switch (activity.type) {
            case 'TASK_CREATED':
                action = "created the task";
                details = `with title "${data.title}"`;
                icon = <PlusCircle className="h-4 w-4 text-green-600" />;
                accentColor = "bg-green-50";
                break;
            case 'DESCRIPTION_UPDATED':
                action = "updated the description";
                icon = <Pencil className="h-4 w-4 text-blue-500" />;
                accentColor = "bg-blue-50";
                break;
            case 'TASK_ASSIGNED':
                action = "changed the assignee";
                details = <><b className="font-semibold not-italic text-gray-700">{data.old || 'Unassigned'}</b> → <b className="font-semibold not-italic text-gray-700">{data.new || 'Unassigned'}</b></>;
                icon = <UserRoundIcon className="h-4 w-4 text-emerald-500" />;
                accentColor = "bg-emerald-50";
                break;
            case 'PRIORITY_UPDATED':
                action = "changed the priority";
                details = <><b className="font-semibold not-italic text-gray-700">{data.old}</b> → <b className="font-semibold not-italic text-gray-700">{data.new}</b></>;
                icon = <TagIcon className="h-4 w-4 text-orange-500" />;
                accentColor = "bg-orange-50";
                break;
            case 'POINTS_UPDATED':
                action = "updated story points";
                details = <><b className="font-semibold not-italic text-gray-700">{data.old ?? 'No'} points</b> → <b className="font-semibold not-italic text-gray-700">{data.new ?? 'No'} points</b></>;
                icon = <ListOrdered className="h-4 w-4 text-purple-500" />;
                accentColor = "bg-purple-50";
                break;
            case 'STATUS_UPDATED':
                 action = "changed the status";
                 details = <><b className="font-semibold not-italic text-gray-700">{data.old}</b> → <b className="font-semibold not-italic text-gray-700">{data.new}</b></>;
                 icon = <CheckCircle2 className="h-4 w-4 text-green-600" />;
                 accentColor = "bg-green-50";
                 break;
            case 'DUE_DATE_UPDATED':
                action = "updated the due date";
                details = <><b className="font-semibold not-italic text-gray-700">{formatDateForDisplay(data.old)}</b> → <b className="font-semibold not-italic text-gray-700">{formatDateForDisplay(data.new)}</b></>;
                icon = <CalendarIcon className="h-4 w-4 text-red-500" />;
                accentColor = "bg-red-50";
                break;
            case 'TASK_UPDATED':
                action = `updated the ${data.change}`;
                details = <>from "<b className="font-semibold not-italic text-gray-700">{data.old}</b>" to "<b className="font-semibold not-italic text-gray-700">{data.new}</b>"</>;
                icon = <Pencil className="h-4 w-4 text-blue-500" />;
                accentColor = "bg-blue-50";
                break;
             case 'COMMENT_ADDED':
                 action = "added a new comment";
                 details = `"${data.content}"`;
                 icon = <MessageSquareIcon className="h-4 w-4 text-gray-500" />;
                 accentColor = "bg-gray-50";
                 break;
            case 'ATTACHMENT_ADDED':
                 action = "added an attachment";
                 details = `File: ${data.fileName}`;
                 icon = <Paperclip className="h-4 w-4 text-indigo-500" />;
                 accentColor = "bg-indigo-50";
                 break;
            case 'ATTACHMENT_REMOVED':
                 action = "removed an attachment";
                 details = `File: ${data.fileName}`;
                 icon = <Trash2 className="h-4 w-4 text-red-500" />;
                 accentColor = "bg-red-50";
                 break;
            default:
                action = `performed an action: ${activity.type}`;
        }
    } catch (e) {
        console.error("Failed to process activity data", activity.data, e);
        if (typeof activity.data === 'string') {
             details = activity.data;
        } else {
            details = "Could not display activity details.";
        }
    }
    
    return (
        <ActivityLogItem
            user={activity.user}
            action={action}
            details={details}
            time={safeFormatDistanceToNow(activity.createdAt)}
            icon={icon}
            accentColor={accentColor}
        />
    )
}

// Helper component for Activity Log Items styling
interface ActivityLogItemProps {
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
    avatarColor?: string; // Added avatarColor
  };
  action: string;
  details?: React.ReactNode;
  time: string;
  icon: React.ReactNode;
  accentColor: string;
}

function ActivityLogItem({ user, action, details, time, icon, accentColor }: ActivityLogItemProps) {
  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.trim() || '?';
  const userName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-md shadow-sm border border-gray-200", accentColor)}>
      <Avatar className="h-8 w-8">
        {user.avatar && <AvatarImage src={user.avatar} />}
        <AvatarFallback 
            className="text-white text-xs" 
            style={{ backgroundColor: (user as any).avatarColor   }}
        >
            {userInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <p className="font-semibold text-gray-800 break-words">{userName} <span className="text-sm text-muted-foreground font-normal">{action}</span></p>
        </div>
        {details && <p className="text-xs text-gray-600 italic mt-1 break-words">{details}</p>}
        <span className="text-xs text-muted-foreground block mt-1">{time}</span>
      </div>
    </div>
  );
}