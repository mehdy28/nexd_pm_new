// components/tasks/list--view.tsx
"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
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
  List, // This is for unordered list
  ListOrdered, // This is for ordered list
  AlignLeft,
  AlignCenter,
  AlignRight,
  Paperclip,
  FileText, // General text file icon, can be used for DOC, PDF
  FileCode, // For code files
  FileImage, // For image files
  FileSpreadsheet, // For spreadsheet files
  FileWarning, // Generic fallback for unsupported types
  FileArchive, // For PPT or other archive-like files if a specific one isn't available
} from "lucide-react"; // CORRECTED: Consolidated and verified Lucide icon imports
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea"; // Still used for comments and new task forms
import { Label } from "@/components/ui/label";

import {
  useProjectTasksAndSections,
  TaskUI,
  SectionUI,
  PriorityUI,
  SprintFilterOption,
  ProjectMemberFullDetails,
  TaskStatusUI,
} from "@/hooks/useProjectTasksAndSections";
import { useProjectTaskMutations } from "@/hooks/useProjectTaskMutations";
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections";

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

// Styling for inputs without border, like Jira
const jiraInputStyle = "focus-visible:ring-0 focus-visible:ring-offset-0 border-none px-0 py-1 shadow-none bg-transparent";
const jiraTextareaStyle = "focus-visible:ring-0 focus-visible:ring-offset-0 border-none px-0 py-1 shadow-none resize-y bg-transparent";
const jiraSelectTriggerStyle = "focus:ring-0 focus:ring-offset-0 border-none h-auto px-0 py-1 shadow-none bg-transparent";

interface ListViewProps {
  projectId: string;
}

export function ListView({ projectId }: ListViewProps) {
  const [internalSelectedSprintId, setInternalSelectedSprintId] = useState<string | undefined>(undefined);
  console.log("[sprint] ListView Render - Current internalSelectedSprintId (state):", internalSelectedSprintId);

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
    console.log("[sprint] Effect: Checking for suggestedDefaultSprintId. Current internalSelectedSprintId:", internalSelectedSprintId, "Suggested:", suggestedDefaultSprintId);
    if (internalSelectedSprintId === undefined && suggestedDefaultSprintId) {
      console.log("[sprint] Effect: Initializing internalSelectedSprintId to suggestedDefaultSprintId:", suggestedDefaultSprintId);
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

  const [editingTaskLocal, setEditingTaskLocal] = useState<TaskUI | null>(null);
  // State for custom tabs (added "attachments")
  const [activeTab, setActiveTab] = useState<"description" | "comments" | "activity" | "attachments">("description");

  const [newTaskOpen, setNewTaskOpen] = useState<Record<string, boolean>>({});
  const [newTask, setNewTask] = useState<Record<string, NewTaskForm>>({});
  const [isSectionMutating, setIsSectionMutating] = useState(false);

  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<SectionUI | null>(null);
  const [deleteTasksConfirmed, setDeleteTasksConfirmed] = useState(false);
  const [reassignToSectionOption, setReassignToSectionOption] = useState<string | null>(null);

  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ sectionId: string; task: TaskUI } | null>(null);

  const customModalRef = useRef<HTMLDivElement>(null);
  const customTaskModalRef = useRef<HTMLDivElement>(null);

  // Ref for the description contentEditable div
  const descriptionContentEditableRef = useRef<HTMLDivElement>(null);

  const sheetData = useMemo(() => {
    if (!sheetTask) return null;
    const s = sections.find((x) => x.id === sheetTask.sectionId);
    const t = s?.tasks.find((x) => x.id === sheetTask.taskId);
    console.log("[sheetData] Recalculated:", t);
    return t ? { sectionId: sheetTask.sectionId, task: t } : null;
  }, [sheetTask, sections]);

  // Handle placeholder logic for contentEditable div, without auto-height
  useEffect(() => {
    console.log("[useEffect-description-contentEditable-placeholder] Triggered. SheetData:", sheetData?.task.id, "EditingTaskLocal description:", editingTaskLocal?.description);
    if (descriptionContentEditableRef.current && activeTab === "description" && sheetData) {
      const div = descriptionContentEditableRef.current;
      if (!editingTaskLocal.description?.trim()) { // If the model's description is empty
        if (div.textContent?.trim() !== 'Add a detailed description...') { // Only set if not already set or has real content
          div.classList.add('text-muted-foreground', 'italic');
          div.textContent = 'Add a detailed description...';
        }
      } else { // If the model's description is NOT empty
        if (div.classList.contains('text-muted-foreground')) { // If it currently has placeholder style
          div.classList.remove('text-muted-foreground', 'italic');
        }
        if (div.innerHTML !== editingTaskLocal.description) { // Only update textContent if it's different
          div.innerHTML = editingTaskLocal.description; // Use innerHTML for rich text
        }
      }
    }
  }, [editingTaskLocal?.description, sheetData, activeTab]);

  const availableAssignees: UserAvatarPartial[] = useMemo(() => {
    return projectMembers.map(member => ({
      id: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatar: member.user.avatar,
    }));
  }, [projectMembers]);

  const getAssigneeFromFetched = useCallback((id: string | undefined | null): UserAvatarPartial | null => {
    if (!id) return null;
    const found = availableAssignees.find(a => a.id === id);
    if (found) {
      return {
        id: found.id,
        firstName: found.firstName,
        lastName: found.lastName,
        avatar: found.avatar
      };
    }
    return null;
  }, [availableAssignees]);

  const toggleSection = useCallback((id: string) => {
    console.log("[toggleSection] Toggling section:", id);
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const setSectionEditing = useCallback((id: string, editing: boolean) => {
    console.log("[setSectionEditing] Setting section editing for:", id, "to:", editing);
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing } : s)));
  }, []);

  const renameSection = useCallback(async (id: string, title: string) => {
    console.log("[renameSection] Attempting to rename section:", id, "to:", title);
    if (!title.trim()) {
      console.warn("[renameSection] Title is empty, reverting editing mode.");
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing: false } : s)));
      return;
    }
    setIsSectionMutating(true);
    try {
      console.log(`[renameSection] Renaming section "${id}" to "${title}"`);
      await updateSection(id, title);
      console.log(`[renameSection] Section "${id}" renamed successfully.`);
    } catch (err) {
      console.error(`[renameSection] Failed to rename section "${id}":`, err);
    } finally {
      setIsSectionMutating(false);
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing: false } : s)));
    }
  }, [updateSection]);

  const addSection = useCallback(async () => {
    console.log("[addSection] Attempting to add new section.");
    setIsSectionMutating(true);
    try {
      await createSection("New Section");
      console.log("[addSection] New section created. Triggering refetchProjectTasksAndSections.");
      refetchProjectTasksAndSections(); // Refetch after creating a new section
    } catch (err) {
      console.error("[addSection] Failed to add section:", err);
    } finally {
      setIsSectionMutating(false);
    }
  }, [createSection, refetchProjectTasksAndSections]);

  const toggleTaskCompleted = useCallback(async (sectionId: string, taskId: string) => {
    console.log("[toggleTaskCompleted] Toggling task completed for taskId:", taskId, "sectionId:", sectionId);
    const taskToUpdate = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
      console.warn(`[toggleTaskCompleted] Task ${taskId} not found in section ${sectionId} for toggle completion.`);
      return;
    }

    console.log(`[toggleTaskCompleted] Toggling completion for task "${taskId}". Current status: ${taskToUpdate.completed}`);
    // Optimistic UI update
    setSections((prev) => {
      const newSections = prev.map((s) =>
        s.id === sectionId
          ? {
            ...s,
            tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed, status: !t.completed ? 'DONE' : 'TODO' } : t)),
          }
          : s,
      );
      console.log("[toggleTaskCompleted] Optimistic UI update for sections:", newSections);
      return newSections;
    });

    try {
      await toggleTaskCompletedMutation(taskId, taskToUpdate.status);
      console.log(`[toggleTaskCompleted] Task "${taskId}" completion toggled successfully in backend.`);
    } catch (err) {
      console.error(`[toggleTaskCompleted] Failed to toggle task "${taskId}" completion:`, err);
      // Revert optimistic update on error
      setSections((prev) => {
        const revertedSections = prev.map((s) =>
          s.id === sectionId
            ? {
              ...s,
              tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed, status: !t.completed ? 'TODO' : 'DONE' } : t)), // Revert to original
            }
            : s,
        );
        console.log("[toggleTaskCompleted] Reverting UI update for sections on error:", revertedSections);
        return revertedSections;
      });
    }

  }, [sections, toggleTaskCompletedMutation]);

  const updateTask = useCallback(async (sectionId: string, taskId: string, updates: Partial<TaskUI>) => {
    console.log("[updateTask] Initiating update for taskId:", taskId, "sectionId:", sectionId, "updates:", updates);
    const originalTask = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
    if (!originalTask) {
      console.warn(`[updateTask] Task ${taskId} not found in section ${sectionId} for update.`);
      return;
    }

    const mutationInput: { [key: string]: any } = { id: taskId };

    if (updates.title !== undefined && updates.title !== originalTask.title) mutationInput.title = updates.title;
    if (updates.description !== undefined && updates.description !== originalTask.description) mutationInput.description = updates.description;
    if (updates.priority !== undefined && updates.priority !== originalTask.priority) mutationInput.priority = updates.priority;
    if (updates.points !== undefined && updates.points !== originalTask.points) mutationInput.points = updates.points;
    if (updates.due !== undefined && updates.due !== originalTask.due) mutationInput.dueDate = updates.due;
    if (updates.assignee !== undefined && updates.assignee?.id !== originalTask.assignee?.id) mutationInput.assigneeId = updates.assignee?.id || null;
    const newStatus = updates.completed !== undefined ? (updates.completed ? 'DONE' : 'TODO') : undefined;
    if (newStatus !== undefined && newStatus !== originalTask.status) {
      mutationInput.status = newStatus;
    }

    console.log(`[updateTask] Attempting to update task "${taskId}". Changes:`, updates, "Mutation Input:", mutationInput);
    // Optimistic UI update
    setSections((prev) => {
      const newSections = prev.map((s) =>
        s.id === sectionId
          ? {
            ...s,
            tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
          }
          : s,
      );
      console.log("[updateTask] Optimistic UI update for sections:", newSections);
      return newSections;
    });

    if (Object.keys(mutationInput).length > 1) { // Check if there are actual changes beyond just the ID
      try {
        await updateTaskMutation(taskId, mutationInput);
        console.log(`[updateTask] Task "${taskId}" updated successfully in backend.`);
      } catch (err) {
        console.error(`[updateTask] Failed to update task "${taskId}":`, err);
        // Revert optimistic update on error
        setSections((prev) => {
          const revertedSections = prev.map((s) =>
            s.id === sectionId
              ? {
                ...s,
                tasks: s.tasks.map((t) => (t.id === taskId ? originalTask : t)), // Revert to original
              }
              : s,
          );
          console.log("[updateTask] Reverting UI update for sections on error:", revertedSections);
          return revertedSections;
        });
      }
    } else {
      console.log(`[updateTask] No significant changes detected for task "${taskId}", skipping backend mutation.`);
    }

  }, [sections, updateTaskMutation]);

  const openDeleteTaskModal = useCallback((sectionId: string, task: TaskUI) => {
    console.log(`[openDeleteTaskModal] Opening delete modal for task "${task.id}" in section "${sectionId}".`);
    setTaskToDelete({ sectionId, task });
    setDeleteTaskModalOpen(true);
  }, []);

  const handleConfirmTaskDelete = useCallback(async () => {
    console.log("[handleConfirmTaskDelete] Confirming task deletion.");
    if (!taskToDelete) {
      console.warn("[handleConfirmTaskDelete] No task selected for deletion.");
      return;
    }

    console.log(`[handleConfirmTaskDelete] Confirming deletion for task "${taskToDelete.task.id}".`);
    // Optimistic UI update
    const sectionId = taskToDelete.sectionId;
    const taskId = taskToDelete.task.id;
    const originalSections = [...sections]; // Store current state for potential rollback

    setSections((prev) => {
      const newSections = prev.map((s) =>
        s.id === sectionId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s,
      );
      console.log("[handleConfirmTaskDelete] Optimistic UI update for sections (deleted task):", newSections);
      return newSections;
    });
    setSelected((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      console.log("[handleConfirmTaskDelete] Updated selected state:", copy);
      return copy;
    });

    try {
      await deleteTaskMutation(taskId);
      console.log(`[handleConfirmTaskDelete] Task "${taskId}" deleted successfully in backend.`);
    } catch (err) {
      console.error(`[handleConfirmTaskDelete] Failed to delete task "${taskId}":`, err);
      // Revert optimistic update on error
      setSections(originalSections); // Revert to original state
      console.log("[handleConfirmTaskDelete] Task deletion failed, reverting UI and triggering refetchProjectTasksAndSections.");
      refetchProjectTasksAndSections(); // Also refetch to ensure consistency
    } finally {
      setDeleteTaskModalOpen(false);
      setTaskToDelete(null);
      console.log("[handleConfirmTaskDelete] Delete task modal closed.");
    }

  }, [taskToDelete, sections, deleteTaskMutation, refetchProjectTasksAndSections]);

  const allTaskIds = useMemo(() => {
    const ids = sections.flatMap((s) => s.tasks.map((t) => t.id));
    console.log("[allTaskIds] Recalculated:", ids);
    return ids;
  }, [sections]);

  const toggleSelect = useCallback((taskId: string, checked: boolean) => {
    console.log("[toggleSelect] Toggling select for taskId:", taskId, "checked:", checked);
    setSelected((prev) => ({ ...prev, [taskId]: checked }));
  }, []);

  const toggleSelectAll = useCallback((checked: boolean) => {
    console.log(`[toggleSelectAll] Toggling select all tasks to: ${checked}`);
    if (!checked) {
      setSelected({});
      console.log("[toggleSelectAll] Cleared all selections.");
      return;
    }
    const next: Record<string, boolean> = {};
    for (const id of allTaskIds) next[id] = true;
    setSelected(next);
    console.log("[toggleSelectAll] Selected all tasks. State:", next);
  }, [allTaskIds]);

  const selectedCount = useMemo(() => {
    const count = Object.values(selected).filter(Boolean).length;
    console.log("[selectedCount] Recalculated:", count);
    return count;
  }, [selected]);

  const bulkDeleteSelected = useCallback(async () => {
    console.log("[bulkDeleteSelected] Initiating bulk delete.");
    const toDelete = new Set(
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    );
    if (toDelete.size === 0) {
      console.log("[bulkDeleteSelected] No tasks selected for bulk deletion.");
      return;
    }
    console.log(`[bulkDeleteSelected] Attempting bulk delete for ${toDelete.size} tasks:`, Array.from(toDelete));

    // Optimistic UI update for bulk delete
    const originalSections = [...sections]; // Store current state for potential rollback
    setSections((prev) => {
      const newSections = prev.map((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => !toDelete.has(t.id)),
      }));
      console.log("[bulkDeleteSelected] Optimistic UI update (bulk delete):", newSections);
      return newSections;
    });
    setSelected({});
    console.log("[bulkDeleteSelected] Cleared selections after optimistic update.");

    try {
      for (const taskId of Array.from(toDelete)) {
        await deleteTaskMutation(taskId); // Or call a bulkDeleteTasks mutation
        console.log(`[bulkDeleteSelected] Bulk deleted task "${taskId}" successfully in backend.`);
      }
    } catch (err) {
      console.error("[bulkDeleteSelected] Failed to bulk delete tasks:", err);
      // Revert optimistic update on error
      setSections(originalSections); // Revert to original state
      console.log("[bulkDeleteSelected] Bulk deletion failed, reverting UI and triggering refetchProjectTasksAndSections.");
      refetchProjectTasksAndSections(); // Also refetch to ensure consistency
    }

  }, [selected, sections, deleteTaskMutation, refetchProjectTasksAndSections]);

  const openNewTask = useCallback((sectionId: string) => {
    console.log(`[openNewTask] Opening new task form for section "${sectionId}". Current selected sprint: ${internalSelectedSprintId}`);
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
        sprintId: internalSelectedSprintId || null, // Use internalSelectedSprintId as default
      },
    }));
    console.log("[openNewTask] New task form state initialized.");
  }, [availableAssignees, internalSelectedSprintId]);

  const cancelNewTask = useCallback((sectionId: string) => {
    console.log(`[cancelNewTask] Cancelling new task creation for section "${sectionId}".`);
    setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
    console.log("[cancelNewTask] New task form closed.");
  }, []);

  const saveNewTask = useCallback(async (sectionId: string) => {
    console.log("[saveNewTask] Attempting to save new task for section:", sectionId);
    const form = newTask[sectionId];
    if (!form || !form.title.trim()) {
      console.warn(`[saveNewTask] New task title is empty for section "${sectionId}". Aborting creation.`);
      return;
    }

    const assignedSprintId = internalSelectedSprintId || null;
    const createTaskInput = {
      title: form.title,
      description: form.description,
      assigneeId: form.assigneeId,
      dueDate: form.due,
      priority: form.priority,
      points: form.points,
      sprintId: assignedSprintId,
      status: 'TODO',
    };

    console.log(`[saveNewTask] Attempting to create new task in section "${sectionId}" for sprint "${assignedSprintId}". Input:`, createTaskInput);

    try {
      let createdTask: TaskUI = await createTask(sectionId, createTaskInput);
      console.log(`[saveNewTask] Task created successfully in backend. Returned task:`, createdTask);

      if (!createdTask.sprintId) {
        console.warn(`[saveNewTask] Returned task "${createdTask.id}" is missing sprintId. Applying client-side workaround using input sprintId: ${assignedSprintId}`);
        createdTask = { ...createdTask, sprintId: assignedSprintId };
      }

      setSections(prevSections => {
        const newSections = prevSections.map(s => {
          if (s.id === sectionId) {
            const taskBelongsToCurrentSprint = !assignedSprintId || (createdTask.sprintId === assignedSprintId);

            if (taskBelongsToCurrentSprint) {
              console.log(`[saveNewTask] Adding created task "${createdTask.id}" to section "${s.id}" in UI.`);
              return {
                ...s,
                tasks: [...s.tasks, createdTask],
              };
            } else {
              console.log(`[saveNewTask] Created task "${createdTask.id}" (sprint: ${createdTask.sprintId}) does not belong to currently selected sprint (${assignedSprintId}). Not adding to current UI view.`);
            }
          }
          return s;
        });
        console.log("[saveNewTask] Updated sections after task creation:", newSections);
        return newSections;
      });

      setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
      setNewTask((p) => {
        const newState = { ...p };
        delete newState[sectionId];
        return newState;
      });
      console.log(`[saveNewTask] UI updated, form closed for section "${sectionId}". Current selected sprint remains: ${internalSelectedSprintId}`);

    } catch (err) {
      console.error(`[saveNewTask] Failed to create task in section "${sectionId}":`, err);
    }

  }, [newTask, createTask, internalSelectedSprintId, availableAssignees]);

  const openSheetFor = useCallback((sectionId: string, taskId: string) => {
    console.log(`[openSheetFor] Opening sheet for task "${taskId}" in section "${sectionId}".`);
    setSheetTask({ sectionId, taskId });
  }, []);

  const closeSheet = useCallback(() => {
    console.log("[closeSheet] Closing task details sheet.");
    setSheetTask(null);
    setEditingTaskLocal(null);
    console.log("[closeSheet] SheetTask and editingTaskLocal cleared.");
  }, []);

  useEffect(() => {
    console.log("[useEffect-sheetData] SheetData changed:", sheetData?.task.id);
    if (sheetData) {
      console.log(`[useEffect-sheetData] Sheet data available for task "${sheetData.task.id}". Setting local editing state.`);
      setEditingTaskLocal(sheetData.task);
      setActiveTab("description"); // Reset to description tab when a new task is opened
    } else {
      console.log("[useEffect-sheetData] No sheet data, resetting local editing state.");
      setEditingTaskLocal(null);
    }
  }, [sheetData]);

  const handleSheetSave = useCallback(async () => {
    console.log("[handleSheetSave] Attempting to save sheet changes.");
    if (!sheetTask || !editingTaskLocal || !sheetData) {
      console.warn("[handleSheetSave] Cannot save sheet: missing task data or local editing state.");
      return;
    }

    const originalTask = sheetData.task;
    const updates: Partial<TaskUI> = {};

    if (editingTaskLocal.title !== originalTask.title) updates.title = editingTaskLocal.title;
    if (editingTaskLocal.description !== originalTask.description) updates.description = editingTaskLocal.description;
    if (editingTaskLocal.priority !== originalTask.priority) updates.priority = editingTaskLocal.priority;
    if (editingTaskLocal.points !== originalTask.points) updates.points = editingTaskLocal.points;
    if (editingTaskLocal.due !== originalTask.due) updates.due = editingTaskLocal.due; // Use original date string, not Date object
    if (editingTaskLocal.assignee?.id !== originalTask.assignee?.id) updates.assignee = editingTaskLocal.assignee;

    console.log("[handleSheetSave] Detected updates:", updates);

    if (Object.keys(updates).length > 0) {
      console.log(`[handleSheetSave] Saving sheet changes for task "${sheetTask.taskId}". Updates:`, updates);
      await updateTask(sheetTask.sectionId, sheetTask.taskId, updates);
    } else {
      console.log(`[handleSheetSave] No changes detected in sheet for task "${sheetTask.taskId}".`);
    }
    closeSheet();

  }, [sheetTask, editingTaskLocal, sheetData, updateTask, closeSheet]);

  // Function to execute editor commands
  const handleEditorCommand = useCallback((command: string, value?: string) => {
    if (descriptionContentEditableRef.current) {
      // Ensure focus for execCommand to work
      descriptionContentEditableRef.current.focus();
      document.execCommand(command, false, value);
      
      // Manually trigger onInput to update state, as execCommand might not
      // Use innerHTML for rich text
      if (descriptionContentEditableRef.current) {
        setEditingTaskLocal(prev => prev ? { ...prev, description: descriptionContentEditableRef.current?.innerHTML || '' } : null);
      }
    }
  }, []);

  useEffect(() => {
    console.log("[useEffect-fetchedSections] fetchedSections updated.");
    if (!fetchedSections) {
      console.log("[useEffect-fetchedSections] fetchedSections is null or undefined.");
      return;
    }

    setSections(currentSections => {
      if (currentSections === fetchedSections) {
        console.log("[useEffect-fetchedSections] sections state already matches fetchedSections reference. No change.");
        return currentSections;
      }
      console.log("[useEffect-fetchedSections] sections state updated to new fetchedSections.");
      return fetchedSections;
    });

    setCollapsed(prevCollapsed => {
      const newCollapsedState: Record<string, boolean> = {};
      let needsUpdate = false;

      const fetchedSectionIds = new Set(fetchedSections.map(sec => sec.id));

      fetchedSections.forEach(sec => {
        if (prevCollapsed[sec.id] === undefined) {
          newCollapsedState[sec.id] = false;
          needsUpdate = true;
        } else {
          newCollapsedState[sec.id] = prevCollapsed[sec.id];
        }
      });

      for (const id in prevCollapsed) {
        if (!fetchedSectionIds.has(id)) {
          needsUpdate = true;
          delete newCollapsedState[id];
        }
        }

      const currentCollapsedKeys = Object.keys(prevCollapsed);
      const newCollapsedKeys = Object.keys(newCollapsedState);

      const isEffectivelySame =
        !needsUpdate &&
        currentCollapsedKeys.length === newCollapsedKeys.length &&
        currentCollapsedKeys.every(key => prevCollapsed[key] === newCollapsedState[key]);

      if (!isEffectivelySame) {
        console.log("[useEffect-fetchedSections] Collapsed state updated due to section changes.");
        return newCollapsedState;
      }
      return prevCollapsed;
    });

  }, [fetchedSections]);

  const handleOpenDeleteSectionModal = useCallback((section: SectionUI) => {
    console.log(`[handleOpenDeleteSectionModal] Opening delete section modal for section "${section.title}" (${section.id}).`);
    setSectionToDelete(section);
    setDeleteTasksConfirmed(false);
    const availableOtherSections = sections.filter(s => s.id !== section.id);
    const defaultReassignId = availableOtherSections[0]?.id || null;
    setReassignToSectionOption(defaultReassignId);
    setDeleteSectionModalOpen(true);
    console.log("[handleOpenDeleteSectionModal] Delete section modal state set.");
  }, [sections]);

  const handleConfirmDeleteSection = useCallback(async () => {
    console.log("[handleConfirmDeleteSection] Confirming section deletion.");
    if (!sectionToDelete) {
      console.warn("[handleConfirmDeleteSection] No section selected for deletion.");
      return;
    }

    console.log(`[handleConfirmDeleteSection] Confirming deletion for section "${sectionToDelete.id}". Delete tasks: ${deleteTasksConfirmed}, Reassign to: ${reassignToSectionOption}`);
    setIsSectionMutating(true);
    try {
      const hasTasks = sectionToDelete.tasks.length > 0;
      let reassignId: string | null | undefined = null;

      if (hasTasks && !deleteTasksConfirmed) {
        reassignId = reassignToSectionOption;
        if (!reassignId) {
          console.warn("[handleConfirmDeleteSection] Reassignment target not selected, cannot proceed with section deletion if tasks exist and not confirmed for deletion.");
          setIsSectionMutating(false);
          return;
        }
      }

      await deleteSection(sectionToDelete.id, {
        deleteTasks: hasTasks ? deleteTasksConfirmed : true,
        reassignToSectionId: reassignId,
      });
      console.log(`[handleConfirmDeleteSection] Section "${sectionToDelete.id}" deleted successfully in backend. Triggering refetchProjectTasksAndSections.`);
      refetchProjectTasksAndSections(); // Re-fetch sections after successful delete

    } catch (err) {
      console.error(`[handleConfirmDeleteSection] Failed to delete section "${sectionToDelete.id}":`, err);
    } finally {
      setIsSectionMutating(false);
      setDeleteSectionModalOpen(false);
      setSectionToDelete(null);
      setDeleteTasksConfirmed(false);
      setReassignToSectionOption(null);
      console.log("[handleConfirmDeleteSection] Delete section modal closed and state reset.");
    }

  }, [sectionToDelete, deleteTasksConfirmed, reassignToSectionOption, deleteSection, refetchProjectTasksAndSections]);

  useEffect(() => {
    console.log("[useEffect-deleteSectionModalOpen] Delete section modal open status:", deleteSectionModalOpen);
    if (deleteSectionModalOpen && customModalRef.current) {
      customModalRef.current.focus();
    }
  }, [deleteSectionModalOpen]);

  useEffect(() => {
    console.log("[useEffect-deleteTaskModalOpen] Delete task modal open status:", deleteTaskModalOpen);
    if (deleteTaskModalOpen && customTaskModalRef.current) {
      customTaskModalRef.current.focus();
    }
  }, [deleteTaskModalOpen]);

  const allSelected = useMemo(() => {
    const isAllSelected = selectedCount > 0 && selectedCount === allTaskIds.length;
    console.log("[allSelected] Recalculated:", isAllSelected);
    return isAllSelected;
  }, [selectedCount, allTaskIds]);

  const otherSections = useMemo(() => {
    const filteredSections = sections.filter(s => s.id !== sectionToDelete?.id);
    console.log("[otherSections] Recalculated:", filteredSections.map(s => s.title));
    return filteredSections;
  }, [sections, sectionToDelete]);

  const currentSprintName = useMemo(() => {
    const activeSprintId = internalSelectedSprintId || suggestedDefaultSprintId;
    console.log("[currentSprintName] ListView: Calculating currentSprintName: internalSelectedSprintId =", internalSelectedSprintId, "suggestedDefaultSprintId =", suggestedDefaultSprintId, "activeSprintId =", activeSprintId);

    const foundSprint = sprintFilterOptions.find(s => s.id === activeSprintId);

    const name = foundSprint?.name || "";
    console.log("[currentSprintName] ListView: sprintFilterOptions =", sprintFilterOptions, "Resolved name =", name);
    return name;

  }, [internalSelectedSprintId, sprintFilterOptions, suggestedDefaultSprintId]);

  const handleSprintSelectionChange = useCallback((sprintId: string) => {
    console.log(`[handleSprintSelectionChange] ListView: Changing selected sprint from "${internalSelectedSprintId}" to "${sprintId}".`);
    setInternalSelectedSprintId(sprintId);
    console.log(`[handleSprintSelectionChange] ListView: Refetching data for new sprint selection "${sprintId}".`);
    refetchProjectTasksAndSections();
  }, [internalSelectedSprintId, refetchProjectTasksAndSections]);

  if (loading) {
    console.log("[sprint] ListView: Loading tasks and sections...");
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        <p className="ml-4 text-lg text-slate-700">Loading tasks and sections...</p>
      </div>
    );
  }

  if (error) {
    console.error("[sprint] ListView: Error loading tasks:", error.message);
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-red-100 text-red-700 p-4">
        <p className="text-lg">Error loading tasks: {error.message}</p>
      </div>
    );
  }



  if (!sections || sections.length === 0) {
    console.log(`[sprint] ListView: No sections or tasks for the current sprint "${currentSprintName}".`);
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(10vh-64px)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Tasks in "{currentSprintName}"</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          The selected sprint "{currentSprintName}" has no tasks. Add a new task or select a different sprint.
        </p>
        <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          {isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          + Add Section
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 pt-3">
      <div className="flex items-center gap-3">
        <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          {isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          + Add section
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">
              {currentSprintName}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            {sprintFilterOptions.map((sprint) => (
              <DropdownMenuItem key={sprint.id} onClick={() => {
                handleSprintSelectionChange(sprint.id);
              }}>
                {sprint.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." />
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
          <div>{selectedCount} selected</div>
          <Button variant="destructive" className="h-8" onClick={bulkDeleteSelected}>
            Delete selected
          </Button>
        </div>
      )}

      <div className="mt-4 w-full rounded-md overflow-x-auto">
        <Separator />
        {sections.map((section) => (
          <div key={section.id} className="w-full">
            <div className="flex w-full items-center gap-2 px-5 py-4">
              <button
                onClick={() => toggleSection(section.id)}
                className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/40"
                aria-label={collapsed[section.id] ? "Expand section" : "Collapse section"}
                title={collapsed[section.id] ? "Expand" : "Collapse"}
              >
                {collapsed[section.id] ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {section.editing ? (
                <Input
                  autoFocus
                  defaultValue={section.title}
                  className="h-8 w-64"
                  onBlur={(e) => renameSection(section.id, e.target.value.trim() || "Untitled")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === "Escape") setSectionEditing(section.id, false);
                  }}
                  disabled={isSectionMutating}
                />
              ) : (
                <button
                  className="text-sm font-semibold text-left hover:underline"
                  onClick={() => setSectionEditing(section.id, true)}
                  title="Rename section"
                  disabled={isSectionMutating}
                >
                  {section.title}
                </button>
              )}

              <div className="ml-auto flex items-center gap-2">
                {!newTaskOpen[section.id] && (
                  <Button variant="outline" size="sm" onClick={() => openNewTask(section.id)} disabled={isTaskMutating}>
                    + Add task
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isSectionMutating}>
                      <EllipsisVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDeleteSectionModal(section)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Section
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {!collapsed[section.id] && (
              <div className="w-full">
                {section.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={!!selected[task.id]}
                    onSelect={(checked) => toggleSelect(task.id, checked)}
                    onToggleCompleted={() => toggleTaskCompleted(section.id, task.id)}
                    onChange={(updates) => updateTask(section.id, task.id, updates)}
                    onOpen={() => openSheetFor(section.id, task.id)}
                    onDelete={(sid, tid) => openDeleteTaskModal(sid, { id: tid, title: task.title, sectionId: sid } as TaskUI)} // Pass correct arguments
                    assignees={availableAssignees}
                  />
                ))}

                {newTaskOpen[section.id] && (
                  <div className="px-10 py-4">
                    <div className="rounded-md border p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Title</label>
                          <Input
                            value={newTask[section.id]?.title || ""}
                            onChange={(e) =>
                              setNewTask((p) => ({
                                ...p,
                                [section.id]: { ...(p[section.id] as NewTaskForm), title: e.target.value },
                              }))
                            }
                            placeholder="Task title"
                            disabled={isTaskMutating}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Assignee</label>
                          <Select
                            value={newTask[section.id]?.assigneeId || "null"}
                            onValueChange={(v) =>
                              setNewTask((p) => ({
                                ...p,
                                [section.id]: { ...(p[section.id] as NewTaskForm), assigneeId: v === "null" ? null : v },
                              }))
                            }
                            disabled={isTaskMutating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">Unassigned</SelectItem>
                              <DropdownMenuSeparator />
                              {availableAssignees.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.firstName || a.id} {a.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Due date</label>
                          <Input
                            type="date"
                            value={newTask[section.id]?.due || ""}
                            onChange={(e) =>
                              setNewTask((p) => ({
                                ...p,
                                [section.id]: { ...(p[section.id] as NewTaskForm), due: e.target.value },
                              }))
                            }
                            disabled={isTaskMutating}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Priority</label>
                          <Select
                            value={newTask[section.id]?.priority || "Medium"}
                            onValueChange={(v: PriorityUI) =>
                              setNewTask((p) => ({
                                ...p,
                                [section.id]: { ...(p[section.id] as NewTaskForm), priority: v },
                              }))
                            }
                            disabled={isTaskMutating}
                          >
                            <SelectTrigger>
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
                          <label className="text-xs text-muted-foreground">Story Points</label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-24"
                              value={newTask[section.id]?.points ?? ""}
                              onChange={(e) =>
                                setNewTask((p) => ({
                                  ...p,
                                  [section.id]: {
                                    ...(p[section.id] as NewTaskForm),
                                    points: Number.isFinite(Number.parseInt(e.target.value)) ? Number.parseInt(e.target.value) : null,
                                  },
                                }))
                              }
                              min={0}
                              disabled={isTaskMutating}
                            />

                            <Button
                              aria-label="Create task"
                              onClick={() => saveNewTask(section.id)}
                              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={isTaskMutating || !newTask[section.id]?.title.trim()}
                            >
                              {isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Create
                            </Button>

                            <Button
                              aria-label="Cancel task creation"
                              variant="ghost"
                              className="h-9 bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => cancelNewTask(section.id)}
                              disabled={isTaskMutating}
                            >
                              Cancel
                            </Button>
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

      <Sheet open={!!sheetData} onOpenChange={(open) => (!open ? closeSheet() : null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[800px] bg-gray-100 border-l p-0 flex flex-col h-full max-h-screen"
        >
          {/* Conditional rendering for sheet content */}
          {sheetData && editingTaskLocal ? (
            <>
              {/* Header: Title and action buttons */}
              <SheetHeader className="p-6 pt-0 pb-0 border-b bg-white flex-shrink-0 sticky top-0 z-20">
                <SheetTitle className="sr-only">Edit Task</SheetTitle>
                <SheetDescription className="sr-only">View and modify task details.</SheetDescription>
                <div className="flex justify-between items-center">
                <Input
                  value={editingTaskLocal.title}
                  onChange={(e) => {
                    console.log("[SheetHeader] Title changed:", e.target.value);
                    setEditingTaskLocal(prev => prev ? { ...prev, title: e.target.value } : null)
                  }}
                  className={cn("text-2xl font-bold mt-2", jiraInputStyle, "text-gray-800")}
                  disabled={isTaskMutating}
                />
                                  <div className="flex gap-2">
                    {/* CORRECTED: Using openDeleteTaskModal with sheetData */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => openDeleteTaskModal(sheetData.sectionId, sheetData.task)}
                      title="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <X className="h-4 w-4 text-gray-500" />
                        <span className="sr-only">Close</span>
                      </Button>
                    </SheetClose>
                  </div>
                </div>

              </SheetHeader>

              {/* Main content area: Left Panel (tabs) and Right Panel (details) */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 h-full min-h-0">
                {/* Left Panel - Custom Tabs implementation */}
                <div className="lg:col-span-2 flex flex-col h-full min-h-0">
                  {/* Custom Tabs List - Sticky header for the tabs. */}
                  <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-2 pb-2 border-b border-gray-200 flex-shrink-0">
                    {/* Increased grid-cols to 4 for the new tab */}
                    <div className="grid w-full grid-cols-4 h-10 bg-gray-200 rounded-md p-1">
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
                          activeTab === "description" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100"
                        )}
                        onClick={() => setActiveTab("description")}
                        aria-selected={activeTab === "description"}
                      >
                        Description
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
                          activeTab === "comments" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100"
                        )}
                        onClick={() => setActiveTab("comments")}
                        aria-selected={activeTab === "comments"}
                      >
                        Comments
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
                          activeTab === "activity" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100"
                        )}
                        onClick={() => setActiveTab("activity")}
                        aria-selected={activeTab === "activity"}
                      >
                        Activity
                      </button>
                      {/* New Attachments Tab Trigger */}
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
                          activeTab === "attachments" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-gray-100"
                        )}
                        onClick={() => setActiveTab("attachments")}
                        aria-selected={activeTab === "attachments"}
                      >
                        Attachments
                      </button>
                    </div>
                  </div>

                  {/* Custom Tabs Content area (flex-1 to take remaining vertical space) */}
                  <div className="flex-1 h-full min-h-0">
                    {activeTab === "description" && (
                      <div className="px-6 py-4  h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {/* Rich Text Editor Toolbar */}
                        <div className="mb-2 p-1 rounded-md bg-white border border-gray-200 flex gap-1 flex-wrap">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-700 hover:bg-gray-100" 
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on editor
                            onClick={() => handleEditorCommand('bold')} 
                            title="Bold"
                          >
                            <Bold className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-700 hover:bg-gray-100" 
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on editor
                            onClick={() => handleEditorCommand('italic')} 
                            title="Italic"
                          >
                            <Italic className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-700 hover:bg-gray-100" 
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on editor
                            onClick={() => handleEditorCommand('underline')} // Added underline
                            title="Underline"
                          >
                            <Underline className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-700 hover:bg-gray-100" 
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on editor
                            onClick={() => handleEditorCommand('insertUnorderedList')} 
                            title="Unordered List"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-700 hover:bg-gray-100" 
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on editor
                            onClick={() => handleEditorCommand('insertOrderedList')} 
                            title="Ordered List"
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-700 hover:bg-gray-100" 
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on editor
                            onClick={() => handleEditorCommand('justifyLeft')} 
                            title="Align Left"
                          >
                            <AlignLeft className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-700 hover:bg-gray-100" 
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on editor
                            onClick={() => handleEditorCommand('justifyCenter')} 
                            title="Align Center"
                          >
                            <AlignCenter className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-700 hover:bg-gray-100" 
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on editor
                            onClick={() => handleEditorCommand('justifyRight')} 
                            title="Align Right"
                          >
                            <AlignRight className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Description Content - Using contentEditable div */}
                        <div>
                          <div
                            ref={descriptionContentEditableRef}
                            contentEditable="true"
                            onInput={(e) => {
                              const target = e.target as HTMLDivElement;
                              // Store innerHTML for rich text
                              setEditingTaskLocal(prev => prev ? { ...prev, description: target.innerHTML || '' } : null);
                            }}
                            onFocus={(e) => {
                              const target = e.target as HTMLDivElement;
                              if (target.classList.contains('text-muted-foreground') && target.textContent === 'Add a detailed description...') {
                                target.textContent = ''; // Clear placeholder on focus
                                target.classList.remove('text-muted-foreground', 'italic');
                              }
                            }}
                            onBlur={(e) => {
                              const target = e.target as HTMLDivElement;
                              if (!target.textContent?.trim() && target.innerHTML?.trim() === '') { // Check both textContent and innerHTML
                                target.classList.add('text-muted-foreground', 'italic');
                                target.textContent = 'Add a detailed description...'; // Restore placeholder if empty
                                setEditingTaskLocal(prev => prev ? { ...prev, description: '' } : null); // Clear actual state
                              } else {
                                // If content exists after blur, ensure innerHTML is stored to preserve formatting
                                setEditingTaskLocal(prev => prev ? { ...prev, description: target.innerHTML || '' } : null);
                              }
                            }}
                            onKeyDown={(e) => {
                                // Handle Enter key for new paragraphs/lines
                                if (e.key === 'Enter' && descriptionContentEditableRef.current) {
                                    e.preventDefault(); // Prevent default browser behavior (e.g., submitting form)
                                    if (e.shiftKey) {
                                        // Shift+Enter for soft line break (<br>)
                                        document.execCommand('insertHTML', false, '<br>');
                                    } else {
                                        // Enter for new paragraph (<div> or <p>). insertParagraph is generally preferred for semantic block breaks.
                                        document.execCommand('insertParagraph', false, '');
                                    }
                                }
                            }}
                            dangerouslySetInnerHTML={{
                              __html: (editingTaskLocal.description && editingTaskLocal.description.trim() !== '') ? editingTaskLocal.description : 'Add a detailed description...'
                            }}
                            className={cn(
                              "text-base w-full p-2 border border-gray-200 rounded-md bg-white text-gray-700",
                              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", // Custom focus styles
                              "resize-none break-words", // No overflow-y-auto on contentEditable itself
                              "min-h-[100px]", // Give it a reasonable minimum height for visual space within the scrollable parent
                              !editingTaskLocal.description && "text-muted-foreground italic" // Placeholder style
                            )}
                            style={{ 
                                whiteSpace: 'pre-wrap', // Allows text to wrap and respects newlines (like <br> or <p>)
                            }} 
                          ></div>
                        </div>
                      </div>
                    )}

                    {activeTab === "comments" && (
                      <div className="flex flex-col h-full  min-h-0">
                        {/* Scrollable Comments History */}
                        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
                          {/* Existing Comments */}
                          <div className="flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-gray-200">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="https://github.com/shadcn.png" />
                              <AvatarFallback className="bg-blue-200 text-blue-800">JD</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">John Doe <span className="text-xs text-muted-foreground font-normal">2 days ago</span></p>
                              <p className="text-sm text-gray-700">This is a sample comment for the task. It's great to see progress here!</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-gray-200">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="/placeholder-user.jpg" />
                              <AvatarFallback className="bg-green-200 text-green-800">AS</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Alice Smith <span className="text-xs text-muted-foreground font-normal">1 day ago</span></p>
                              <p className="text-sm text-gray-700">I've started working on this. Will update by EOD. Facing a minor blocker, will elaborate soon.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-gray-200">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=Michael" />
                              <AvatarFallback className="bg-purple-200 text-purple-800">MK</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Michael King <span className="text-xs text-muted-foreground font-normal">10 hours ago</span></p>
                              <p className="text-sm text-gray-700">Acknowledged. Let me know if you need any assistance with the blocker, Alice.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-gray-200">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="https://github.com/shadcn.png" />
                              <AvatarFallback className="bg-blue-200 text-blue-800">JD</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">John Doe <span className="text-xs text-muted-foreground font-normal">2 days ago</span></p>
                              <p className="text-sm text-gray-700">This is a sample comment for the task. It's great to see progress here!This is a sample comment for the task. It's great to see progress here!This is a sample comment for the task. It's great to see progress here!This is a sample comment for the task. It's great to see progress here!This is a sample comment for the task. It's great to see progress here!</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-gray-200">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="/placeholder-user.jpg" />
                              <AvatarFallback className="bg-green-200 text-green-800">AS</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Alice Smith <span className="text-xs text-muted-foreground font-normal">1 day ago</span></p>
                              <p className="text-sm text-gray-700">I've started working on this. Will update by EOD. Facing a minor blocker, will elaborate soon.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-gray-200">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=Michael" />
                              <AvatarFallback className="bg-purple-200 text-purple-800">MK</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Michael King <span className="text-xs text-muted-foreground font-normal">10 hours ago</span></p>
                              <p className="text-sm text-gray-700">Acknowledged. Let me know if you need any assistance with the blocker, Alice.Acknowledged. Let me know if you need any assistance with the blocker, Alice.Acknowledged. Let me know if you need any assistance with the blocker, Alice.Acknowledged. Let me know if you need any assistance with the blocker, Alice.</p>
                            </div>
                          </div>

                        </div>

                        {/* Comment Input Form - Sticky to bottom (messenger style) */}
                        <div className="mt-4 bg-white p-4 border-t border-gray-200 flex-shrink-0">
                          <div className="flex items-end gap-2">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src="https://github.com/shadcn.png" />
                              <AvatarFallback className="bg-gray-200 text-gray-800">You</AvatarFallback>
                            </Avatar>
                            <Textarea
                              placeholder="Add a comment..."
                              rows={1} // Start with 1 row, auto-grows
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 resize-none overflow-hidden"
                              style={{ minHeight: '38px' }} // Match height of standard input for consistency
                            />
                            <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0" disabled={isTaskMutating}>
                              Send
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "activity" && (
                      <div className="px-6 py-4  h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {/* Activity Content */}
                        <div className="space-y-4 text-sm text-muted-foreground">
                          {/* Enhanced Activity Log with more engaging content and icons */}
                          <ActivityLogItem
                            user={{ firstName: "John", lastName: "Doe", avatar: "https://github.com/shadcn.png" }}
                            action="updated the description"
                            details={`"Initial placeholder description" &rarr; "Detailed task description for feature X..."`}
                            time="3 days ago"
                            icon={<Pencil className="h-4 w-4 text-blue-500" />}
                            accentColor="bg-blue-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "Alice", lastName: "Smith", avatar: "/placeholder-user.jpg" }}
                            action="assigned the task to herself"
                            details={`Unassigned &rarr; Alice Smith`}
                            time="2 days ago"
                            icon={<UserRoundIcon className="h-4 w-4 text-emerald-500" />}
                            accentColor="bg-emerald-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "Michael", lastName: "King", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Michael" }}
                            action="changed priority"
                            details={`Low &rarr; Medium`}
                            time="1 day ago"
                            icon={<TagIcon className="h-4 w-4 text-orange-500" />}
                            accentColor="bg-orange-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "John", lastName: "Doe", avatar: "https://github.com/shadcn.png" }}
                            action="updated story points"
                            details={`5 &rarr; 8`}
                            icon={<ListOrdered className="h-4 w-4 text-purple-500" />}
                            time="12 hours ago"
                            accentColor="bg-purple-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "Alice", lastName: "Smith", avatar: "/placeholder-user.jpg" }}
                            action="marked task as completed"
                            time="4 hours ago"
                            icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                            accentColor="bg-green-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "John", lastName: "Doe", avatar: "https://github.com/shadcn.png" }}
                            action="added a new comment"
                            details={`"Great progress! Let's schedule a quick sync call."`}
                            time="2 hours ago"
                            icon={<MessageSquareIcon className="h-4 w-4 text-gray-500" />}
                            accentColor="bg-gray-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "John", lastName: "Doe", avatar: "https://github.com/shadcn.png" }}
                            action="updated the description"
                            details={`"Initial placeholder description" &rarr; "Detailed task description for feature X..."`}
                            time="3 days ago"
                            icon={<Pencil className="h-4 w-4 text-blue-500" />}
                            accentColor="bg-blue-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "Alice", lastName: "Smith", avatar: "/placeholder-user.jpg" }}
                            action="assigned the task to herself"
                            details={`Unassigned &rarr; Alice Smith`}
                            time="2 days ago"
                            icon={<UserRoundIcon className="h-4 w-4 text-emerald-500" />}
                            accentColor="bg-emerald-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "Michael", lastName: "King", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Michael" }}
                            action="changed priority"
                            details={`Low &rarr; Medium`}
                            time="1 day ago"
                            icon={<TagIcon className="h-4 w-4 text-orange-500" />}
                            accentColor="bg-orange-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "John", lastName: "Doe", avatar: "https://github.com/shadcn.png" }}
                            action="updated story points"
                            details={`5 &rarr; 8`}
                            icon={<ListOrdered className="h-4 w-4 text-purple-500" />}
                            accentColor="bg-purple-50"
                          />
                          <ActivityLogItem
                            user={{ firstName: "Alice", lastName: "Smith", avatar: "/placeholder-user.jpg" }}
                            action="marked task as completed"
                            time="4 hours ago"
                            icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                            accentColor="bg-green-50"
                          />
                        </div>
                      </div>
                    )}

                    {/* New Attachments Tab Content */}
                    {activeTab === "attachments" && (
                      <div className="px-6 py-4 h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Attachments</h3>
                        
                        {/* File Upload Area */}
                        <div className="mb-6 border-2 border-dashed border-gray-300 rounded-md p-6 text-center text-gray-600 hover:border-blue-500 hover:text-blue-700 transition-colors cursor-pointer">
                          <label htmlFor="file-upload" className="block cursor-pointer">
                            <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <span>Drag and drop files here or <span className="font-semibold text-blue-600">browse</span></span>
                            <input 
                              id="file-upload" 
                              type="file" 
                              multiple 
                              className="hidden" 
                              onChange={(e) => {
                                console.log("Files selected:", e.target.files);
                                // Handle file upload logic here
                              }}
                              disabled={isTaskMutating}
                            />
                          </label>
                        </div>

{/* Attached Files List (Placeholder) */}
<div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-red-500" /> 
                              <span className="text-sm font-medium text-gray-800">design_brief.pdf</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment">
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-blue-500" /> 
                              <span className="text-sm font-medium text-gray-800">feature_specs.docx</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment">
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3">
                              <FileSpreadsheet className="h-5 w-5 text-green-500" />
                              <span className="text-sm font-medium text-gray-800">project_timeline.xlsx</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment">
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                           <div className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3">
                              <FileWarning className="h-5 w-5 text-orange-500" /> {/* Fallback for .fig */}
                              <span className="text-sm font-medium text-gray-800">mockup_v1.fig</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment">
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3">
                              <FileImage className="h-5 w-5 text-yellow-500" />
                              <span className="text-sm font-medium text-gray-800">ui_screenshot.png</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment">
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-blue-500" />
                              <span className="text-sm font-medium text-gray-800">meeting_notes.txt</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment">
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3">
                              <FileArchive className="h-5 w-5 text-orange-500" /> 
                              <span className="text-sm font-medium text-gray-800">presentation.ppt</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove attachment">
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        </div>
     
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel (Details and Actions) */}
<div className="lg:col-span-1 border-l border-gray-200 bg-white pl-6 pr-6 mb-2 mr-2  py-6 flex flex-col flex-shrink-0 min-h-0 rounded-lg">
                  <div className="space-y-4 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">Details</h3>

                    {/* Assignee */}
                    <div className="flex items-center gap-4 text-sm">
                      <UserRoundIcon className="h-4 w-4 text-gray-500" />
                      <div className="flex-1">
                        <Label htmlFor="assignee-select" className="sr-only">Assignee</Label>
                        <Select
                          value={editingTaskLocal.assignee?.id || "null"}
                          onValueChange={(v) => {
                            console.log("[Assignee Select] Value changed to:", v);
                            setEditingTaskLocal(prev => prev ? { ...prev, assignee: availableAssignees.find(a => a.id === v) || null } : null)
                          }}
                          disabled={isTaskMutating}
                        >
                          <SelectTrigger id="assignee-select" className={cn("w-full text-gray-700 hover:bg-gray-50 rounded-md py-2 px-3 transition-colors", jiraSelectTriggerStyle)}>
                            <SelectValue placeholder="Unassigned">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={editingTaskLocal.assignee?.avatar || undefined} />
                                  <AvatarFallback className="text-xs bg-gray-100 text-gray-700">{`${editingTaskLocal.assignee?.firstName?.[0] || ''}${editingTaskLocal.assignee?.lastName?.[0] || ''}` || '?'}</AvatarFallback>
                                </Avatar>
                                <span>{editingTaskLocal.assignee?.firstName} {editingTaskLocal.assignee?.lastName || 'Unassigned'}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-white border-border">
                            <SelectItem value="null">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 border bg-gray-100">
                                  <AvatarImage src={undefined} />
                                  <AvatarFallback className="text-xs text-gray-700">?</AvatarFallback>
                                </Avatar>
                                <span>Unassigned</span>
                              </div>
                            </SelectItem>
                            <DropdownMenuSeparator />
                            {availableAssignees.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={a.avatar || undefined} />
                                    <AvatarFallback className="text-xs bg-gray-100 text-gray-700">{`${a.firstName?.[0] || ''}${a.lastName?.[0] || ''}` || '?'}</AvatarFallback>
                                  </Avatar>
                                  <span>{a.firstName} {a.lastName}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center gap-4 text-sm">
                      <TagIcon className="h-4 w-4 text-gray-500" />
                      <div className="flex-1">
                        <Label htmlFor="priority-select" className="sr-only">Priority</Label>
                        <Select
                          value={editingTaskLocal.priority}
                          onValueChange={(v: PriorityUI) => {
                            console.log("[Priority Select] Value changed to:", v);
                            setEditingTaskLocal(prev => prev ? { ...prev, priority: v } : null)
                          }}
                          disabled={isTaskMutating}
                        >
                          <SelectTrigger id="priority-select" className={cn("w-full text-gray-700 hover:bg-gray-50 rounded-md py-2 px-3 transition-colors", jiraSelectTriggerStyle)}>
                            <SelectValue>
                              <div className="inline-flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full", priorityDot[editingTaskLocal.priority])} />
                                <span>{editingTaskLocal.priority}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-white border-border">
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
                    </div>

                    {/* Story Points */}
                    <div className="flex items-center gap-4 text-sm">
                      <ListOrdered className="h-4 w-4 text-gray-500" />
                      <div className="flex-1 flex items-center bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <Label htmlFor="story-points-input" className="sr-only">Story Points</Label>
                        <Input
                          id="story-points-input"
                          type="number"
                          value={editingTaskLocal.points ?? ""}
                          onChange={(e) => {
                            console.log("[Story Points Input] Value changed to:", e.target.value);
                            setEditingTaskLocal(prev => prev ? { ...prev, points: Number.isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value) } : null)
                          }}
                          className={cn("w-full text-gray-700", jiraInputStyle)}
                          min={0}
                          placeholder="Add points"
                          disabled={isTaskMutating}
                        />
                      </div>
                    </div>

                    {/* Start Date (placeholder for now) */}
                    <div className="flex items-center gap-4 text-sm">
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                      <div className="flex-1 flex items-center bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <Label htmlFor="start-date-input" className="sr-only">Start Date</Label>
                        <Input
                          id="start-date-input"
                          type="date"
                          value={""} // Placeholder for start date
                          onChange={(e) => { /* Handle start date change if applicable */ }}
                          className={cn("w-full text-gray-700", jiraInputStyle)}
                          placeholder="Set start date"
                          disabled={isTaskMutating}
                        />
                      </div>
                    </div>

                    {/* Due Date (End Date) */}
                    <div className="flex items-center gap-4 text-sm">
                      <ClockIcon className="h-4 w-4 text-gray-500" />
                      <div className="flex-1 flex items-center bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <Label htmlFor="due-date-input" className="sr-only">Due Date</Label>
                        <Input
                          id="due-date-input"
                          type="date"
                          value={editingTaskLocal.due || ""}
                          onChange={(e) => {
                            console.log("[Due Date Input] Value changed to:", e.target.value);
                            setEditingTaskLocal(prev => prev ? { ...prev, due: e.target.value } : null)
                          }}
                          className={cn("w-full text-gray-700", jiraInputStyle)}
                          placeholder="Set due date"
                          disabled={isTaskMutating}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Save and Cancel buttons moved here */}
                  <div className="mt-8 flex flex-col gap-2 flex-shrink-0">
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSheetSave} disabled={isTaskMutating}>
                      {isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Changes
                    </Button>
                    <SheetClose asChild>
                      <Button variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-200" disabled={isTaskMutating}>
                        Cancel
                      </Button>
                    </SheetClose>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Fallback content when no task is selected or data is loading
            <div className="flex items-center justify-center p-6 text-muted-foreground flex-1">
              No task selected or data loading...
            </div>
          )}
        </SheetContent>
      </Sheet>
      {/* Custom Delete Section Confirmation Modal (replaces AlertDialog) */}
      {sectionToDelete && deleteSectionModalOpen && (
        <div
          ref={customModalRef}
          role="alertdialog"
          aria-labelledby="delete-section-title"
          aria-describedby="delete-section-description"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteSectionModalOpen(false);
              setSectionToDelete(null);
              setDeleteTasksConfirmed(false);
              setReassignToSectionOption(null);
              console.log("[Delete Section Modal] Overlay click, closing modal.");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDeleteSectionModalOpen(false);
              setSectionToDelete(null);
              setDeleteTasksConfirmed(false);
              setReassignToSectionOption(null);
              console.log("[Delete Section Modal] Escape key pressed, closing modal.");
            }
          }}
        >
          <div className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
            {/* Modal Header */}
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 id="delete-section-title" className="text-lg font-semibold text-foreground">
                Delete Section "{sectionToDelete.title}"?
              </h2>
              <div id="delete-section-description" className="text-sm text-muted-foreground">
                {sectionToDelete.tasks.length > 0 ? (
                  <>
                    <p>This section contains {sectionToDelete.tasks.length} tasks. What would you like to do with them?</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="deleteTasks"
                          checked={deleteTasksConfirmed}
                          onCheckedChange={(checked: boolean) => {
                            setDeleteTasksConfirmed(checked);
                            if (checked) setReassignToSectionOption(null);
                            console.log("[Delete Section Modal] Delete tasks checkbox:", checked);
                          }}
                          disabled={isSectionMutating}
                        />
                        <Label htmlFor="deleteTasks">Delete all {sectionToDelete.tasks.length} tasks</Label>
                      </div>
                      {!deleteTasksConfirmed && otherSections.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="reassignTasks"
                            checked={!deleteTasksConfirmed && !!reassignToSectionOption}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) {
                                setDeleteTasksConfirmed(false);
                                setReassignToSectionOption(prev => prev || otherSections[0]?.id || null);
                              } else {
                                setReassignToSectionOption(null);
                              }
                              console.log("[Delete Section Modal] Reassign tasks checkbox:", checked);
                            }}
                            disabled={isSectionMutating}
                          />
                          <Label htmlFor="reassignTasks">Reassign tasks to:</Label>
                          {(!deleteTasksConfirmed && !!reassignToSectionOption) && (
                            <Select
                              value={reassignToSectionOption || undefined}
                              onValueChange={(v) => {
                                setReassignToSectionOption(v);
                                console.log("[Delete Section Modal] Reassign section selected:", v);
                              }}
                              disabled={isSectionMutating}
                            >
                              <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                              <SelectContent>
                                {otherSections.map(sec => (
                                  <SelectItem key={sec.id} value={sec.id}>
                                    {sec.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                      {!deleteTasksConfirmed && otherSections.length === 0 && sectionToDelete.tasks.length > 0 && (
                        <p className="text-red-500 text-sm">Cannot reassign tasks. No other sections available. You must delete the tasks.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p>Are you sure you want to delete this section? This action cannot be undone.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                variant="outline"
                className="mt-2 sm:mt-0"
                onClick={() => {
                  setDeleteSectionModalOpen(false);
                  setSectionToDelete(null);
                  setDeleteTasksConfirmed(false);
                  setReassignToSectionOption(null);
                  console.log("[Delete Section Modal] Cancel button clicked, closing modal.");
                }}
                disabled={isSectionMutating}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDeleteSection}
                disabled={isSectionMutating || (sectionToDelete.tasks.length > 0 && !deleteTasksConfirmed && !reassignToSectionOption)}
              >
                {isSectionMutating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Delete Section"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Custom Delete Task Confirmation Modal */}
      {taskToDelete && deleteTaskModalOpen && (
        <div
          ref={customTaskModalRef}
          role="alertdialog"
          aria-labelledby="delete-task-title"
          aria-describedby="delete-task-description"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteTaskModalOpen(false);
              setTaskToDelete(null);
              console.log("[Delete Task Modal] Overlay click, closing modal.");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDeleteTaskModalOpen(false);
              setTaskToDelete(null);
              console.log("[Delete Task Modal] Escape key pressed, closing modal.");
            }
          }}
        >
          <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
            {/* Modal Header */}
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 id="delete-task-title" className="text-lg font-semibold text-foreground">
                Delete Task "{taskToDelete.task.title}"?
              </h2>
              <p id="delete-task-description" className="text-sm text-muted-foreground">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                variant="outline"
                className="mt-2 sm:mt-0"
                onClick={() => {
                  setDeleteTaskModalOpen(false);
                  setTaskToDelete(null);
                  console.log("[Delete Task Modal] Cancel button clicked, closing modal.");
                }}
                disabled={isTaskMutating}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmTaskDelete}
                disabled={isTaskMutating}
              >
                {isTaskMutating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Delete Task"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

// Helper component for Activity Log Items
interface ActivityLogItemProps {
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  action: string;
  details?: string;
  time: string;
  icon: React.ReactNode;
  accentColor: string; // Tailwind className for background accent
}

function ActivityLogItem({ user, action, details, time, icon, accentColor }: ActivityLogItemProps) {
  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.trim() || '?';
  const userName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-md shadow-sm border border-gray-200", accentColor)}>
      <Avatar className="h-8 w-8">
        {user.avatar && <AvatarImage src={user.avatar} />}
        <AvatarFallback className="bg-gray-200 text-gray-800">{userInitials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {icon}
          <p className="font-semibold text-gray-800">{userName} <span className="text-sm text-muted-foreground font-normal">{action}</span></p>
        </div>
        {details && <p className="text-xs text-gray-600 italic mt-1">{details}</p>}
        <span className="text-xs text-muted-foreground block mt-1">{time}</span>
      </div>
    </div>
  );
}

function HeaderRow({
  allSelected,
  onToggleAll,
}: {
  allSelected: boolean;
  onToggleAll: (checked: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[40px_1fr_180px_160px_140px_100px_96px] gap-2 px-10 py-3 text-xs font-medium text-muted-foreground">
      <div className="flex items-center">
        <Checkbox checked={allSelected} onCheckedChange={(v) => onToggleAll(!!v)} aria-label="Select all tasks" />
      </div>
      <div>Task Name</div>
      <div className="justify-self-end text-right">Assignee</div>
      <div className="justify-self-end text-right">Due Date</div>
      <div className="justify-self-end text-right">Priority</div>
      <div className="justify-self-end text-right">Story Point</div>
      <div className="justify-self-end pr-2 text-right">Actions</div>
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
  onDelete: (sectionId: string, taskId: string) => void; // Explicitly define onDelete prop signature
  assignees: UserAvatarPartial[];
}

function TaskRow({
  task,
  selected,
  onSelect,
  onToggleCompleted,
  onChange,
  onOpen,
  onDelete,
  assignees,
}: TaskRowProps) {
  const Icon = task.completed ? CheckCircle2 : Circle;
  const cellInput =
    "h-8 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:border-0 focus:outline-none text-sm";

  const assignee = task.assignee || { id: "unassigned", firstName: "Unassigned", lastName: "", avatar: "" };
  const assigneeInitials = `${assignee.firstName?.[0] || ''}${assignee.lastName?.[0] || ''}`.trim() || '?';
  const assigneeName = `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || 'Unassigned';

  return (
    <div className="grid grid-cols-[40px_1fr_180px_160px_140px_100px_96px] items-center gap-2 px-10 py-2 hover:bg-muted/40 focus-within:bg-emerald-50/50 focus-within:ring-1 focus-within:ring-emerald-200 rounded-md">
      {/* Select */}
      <div className="flex items-center">
        <Checkbox checked={selected} onCheckedChange={(v) => onSelect(!!v)} aria-label="Select task" />
      </div>

      {/* Title with completed toggle; this cell grows to consume remaining space */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleCompleted}
          aria-pressed={!!task.completed}
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            task.completed ? "text-emerald-600" : "text-muted-foreground",
          )}
          title="Toggle completed"
        >
          <Icon className="h-4 w-4" />
        </button>
        <Input
          className={cn(
            cellInput,
            "min-w-0 rounded-sm focus-visible:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0",
            task.completed && "line-through text-muted-foreground",
          )}
          value={task.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>

      {/* Assignee dropdown (right-aligned cell) */}
      <div className="justify-self-end w-[180px]">
        <Select value={assignee.id} onValueChange={(v) => onChange({ assignee: assignees.find(a => a.id === v) || null })}>
          <SelectTrigger className="h-8">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border">
                <AvatarImage src={assignee.avatar || undefined} />
                <AvatarFallback className="text-[10px]">{assigneeInitials}</AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{assigneeName}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {assignees.map((a) => (
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

      {/* Due date picker (right-aligned cell) */}
      <div className="justify-self-end w-[160px]">
        <Input
          type="date"
          value={task.due || ""}
          onChange={(e) => onChange({ due: e.target.value })}
          className="h-8"
        />
      </div>

      {/* Priority dropdown with colored chip (right-aligned cell) */}
      <div className="justify-self-end w-[140px]">
        <Select value={task.priority} onValueChange={(v: PriorityUI) => onChange({ priority: v })}>
          <SelectTrigger className="h-8">
            <div
              className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", priorityStyles[task.priority])}
            >
              <span className={cn("mr-2 h-2 w-2 rounded-full", priorityDot[task.priority])} />
              {task.priority}
            </div>
          </SelectTrigger>
          <SelectContent>
            {(["Low", "Medium", "High"] as PriorityUI[]).map((p) => (
              <SelectItem key={p} value={p}>
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", priorityDot[p])} />
                  <span>{p}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Points (right-aligned cell) */}
      <div className="justify-self-end w-[100px]">
        <Input
          className={cellInput}
          type="number"
          value={task.points ?? ""}
          onChange={(e) =>
            onChange({
              points: Number.isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value),
            })
          }
          min={0}
        />
      </div>

      {/* Actions (rightmost) */}
      <div className="flex items-center justify-end gap-2 pr-2 w-[96px]">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpen} title="Open task">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(task.sectionId, task.id)} // Pass sectionId and taskId to onDelete
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>

  );
}
