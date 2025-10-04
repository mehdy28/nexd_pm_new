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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
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


interface ListViewProps {
  projectId: string;
}

export function ListView({ projectId }: ListViewProps) {
  // We'll manage internal state for selectedSprintId, initialized to undefined
  const [internalSelectedSprintId, setInternalSelectedSprintId] = useState<string | undefined>(undefined);
  // console.log("[ListView] Component Render - current internalSelectedSprintId:", internalSelectedSprintId);


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
    defaultSelectedSprintId: fetchedDefaultSprintId, // Capture default sprint ID
  } = useProjectTasksAndSections(projectId, internalSelectedSprintId); // Pass internal state to hook


  useEffect(() => {
    // console.log("[ListView] useEffect - internalSelectedSprintId:", internalSelectedSprintId, "fetchedDefaultSprintId:", fetchedDefaultSprintId);
    // This effect should run once after the initial data fetch from useProjectTasksAndSections.
    // If internalSelectedSprintId is still undefined (meaning no user has selected a sprint yet)
    // AND a default sprint ID was successfully fetched, then set it.
    if (internalSelectedSprintId === undefined && fetchedDefaultSprintId) {
      // console.log("[ListView] Setting internalSelectedSprintId to fetchedDefaultSprintId:", fetchedDefaultSprintId);
      setInternalSelectedSprintId(fetchedDefaultSprintId);
    }
    // Dependency array includes fetchedDefaultSprintId to react to its availability
    // and internalSelectedSprintId to ensure this only runs once for default setting.
  }, [fetchedDefaultSprintId, internalSelectedSprintId]);


  const {
    createTask,
    updateTask: updateTaskMutation,
    toggleTaskCompleted: toggleTaskCompletedMutation,
    deleteTask: deleteTaskMutation,
    isTaskMutating,
    taskMutationError,
  } = useProjectTaskMutations(projectId);


  const [sections, setSections] = useState<SectionUI[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sheetTask, setSheetTask] = useState<{ sectionId: string; taskId: string } | null>(null);

  const [editingTaskLocal, setEditingTaskLocal] = useState<TaskUI | null>(null);


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
      console.error("Failed to rename section:", err);
    } finally {
      setIsSectionMutating(false);
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing: false } : s)));
    }
  }, [updateSection]);

  const addSection = useCallback(async () => {
    setIsSectionMutating(true);
    try {
      await createSection("New Section");
    } catch (err) {
      console.error("Failed to add section:", err);
    } finally {
      setIsSectionMutating(false);
    }
  }, [createSection]);

  const toggleTaskCompleted = useCallback(async (sectionId: string, taskId: string) => {
    const taskToUpdate = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
            }
          : s,
      ),
    );

    try {
      await toggleTaskCompletedMutation(taskId, taskToUpdate.status);
    } catch (err) {
      console.error("Failed to toggle task completion:", err);
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
              }
            : s,
        ),
      );
    }
  }, [sections, toggleTaskCompletedMutation]);


  const updateTask = useCallback(async (sectionId: string, taskId: string, updates: Partial<TaskUI>) => {
    const originalTask = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
    if (!originalTask) return;

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

    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
            }
          : s,
    ),
  );

    if (Object.keys(mutationInput).length > 1) {
      try {
        await updateTaskMutation(taskId, mutationInput);
      } catch (err) {
        console.error("Failed to update task:", err);
      }
    }
  }, [sections, updateTaskMutation]);

  const openDeleteTaskModal = useCallback((sectionId: string, task: TaskUI) => {
    setTaskToDelete({ sectionId, task });
    setDeleteTaskModalOpen(true);
  }, []);

  const handleConfirmTaskDelete = useCallback(async () => {
    if (!taskToDelete) return;

    setSections((prev) =>
      prev.map((s) =>
        s.id === taskToDelete.sectionId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskToDelete.task.id) } : s,
      ),
    );
    setSelected((prev) => {
      const copy = { ...prev };
      delete copy[taskToDelete.task.id];
      return copy;
    });

    try {
      await deleteTaskMutation(taskToDelete.task.id);
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setDeleteTaskModalOpen(false);
      setTaskToDelete(null);
    }
  }, [taskToDelete, deleteTaskMutation]);


  const allTaskIds = useMemo(() => {
    return sections.flatMap((s) => s.tasks.map((t) => t.id));
  }, [sections]);

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

  const selectedCount = useMemo(() => {
    return Object.values(selected).filter(Boolean).length;
  }, [selected]);

  const bulkDeleteSelected = useCallback(() => {
    const toDelete = new Set(
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    );
    if (toDelete.size === 0) return;
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => !toDelete.has(t.id)),
      })),
    );
    setSelected({});
  }, [selected]);

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
        sprintId: internalSelectedSprintId || null, // Use internalSelectedSprintId
      },
    }));
  }, [availableAssignees, internalSelectedSprintId]);

  const cancelNewTask = useCallback((sectionId: string) => {
    setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
  }, []);

  const saveNewTask = useCallback(async (sectionId: string) => {
    const form = newTask[sectionId];
    if (!form || !form.title.trim()) {
      return;
    }

    try {
      await createTask(sectionId, {
        title: form.title,
        description: form.description,
        assigneeId: form.assigneeId,
        dueDate: form.due,
        priority: form.priority,
        points: form.points,
        sprintId: form.sprintId,
        status: 'TODO',
      });
      setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }, [newTask, createTask]);


  const openSheetFor = useCallback((sectionId: string, taskId: string) => {
    setSheetTask({ sectionId, taskId });
  }, []);

  const closeSheet = useCallback(() => {
    setSheetTask(null);
    setEditingTaskLocal(null);
  }, []);

  const sheetData = useMemo(() => {
    if (!sheetTask) return null;
    const s = sections.find((x) => x.id === sheetTask.sectionId);
    const t = s?.tasks.find((x) => x.id === sheetTask.taskId);
    return t ? { sectionId: sheetTask.sectionId, task: t } : null;
  }, [sheetTask, sections]);

  useEffect(() => {
    if (sheetData) {
      setEditingTaskLocal(sheetData.task);
    } else {
      setEditingTaskLocal(null);
    }
  }, [sheetData]);


  const handleSheetSave = useCallback(async () => {
    if (!sheetTask || !editingTaskLocal || !sheetData) return;

    const originalTask = sheetData.task;
    const updates: Partial<TaskUI> = {};

    if (editingTaskLocal.title !== originalTask.title) updates.title = editingTaskLocal.title;
    if (editingTaskLocal.description !== originalTask.description) updates.description = editingTaskLocal.description;
    if (editingTaskLocal.priority !== originalTask.priority) updates.priority = editingTaskLocal.priority;
    if (editingTaskLocal.points !== originalTask.points) updates.points = editingTaskLocal.points;
    if (editingTaskLocal.due !== originalTask.due) updates.due = editingTaskLocal.due;
    if (editingTaskLocal.assignee?.id !== originalTask.assignee?.id) updates.assignee = editingTaskLocal.assignee;

    if (Object.keys(updates).length > 0) {
      await updateTask(sheetTask.sectionId, sheetTask.taskId, updates);
    }
    closeSheet();
  }, [sheetTask, editingTaskLocal, sheetData, updateTask, closeSheet]);


  useEffect(() => {
    if (!fetchedSections) {
      return;
    }

    setSections(currentSections => {
      if (currentSections === fetchedSections) {
        return currentSections;
      }
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
        return newCollapsedState;
      }
      return prevCollapsed;
    });
  }, [fetchedSections]);

  const handleOpenDeleteSectionModal = useCallback((section: SectionUI) => {
    setSectionToDelete(section);
    setDeleteTasksConfirmed(false);
    const availableOtherSections = sections.filter(s => s.id !== section.id);
    const defaultReassignId = availableOtherSections[0]?.id || null;
    setReassignToSectionOption(defaultReassignId);
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

    } catch (err) {
      console.error("Failed to delete section:", err);
    } finally {
      setIsSectionMutating(false);
      setDeleteSectionModalOpen(false);
      setSectionToDelete(null);
      setDeleteTasksConfirmed(false);
      setReassignToSectionOption(null);
    }
  }, [sectionToDelete, deleteTasksConfirmed, reassignToSectionOption, deleteSection]);

  useEffect(() => {
    if (deleteSectionModalOpen && customModalRef.current) {
      customModalRef.current.focus();
    }
  }, [deleteSectionModalOpen]);


  useEffect(() => {
    if (deleteTaskModalOpen && customTaskModalRef.current) {
      customTaskModalRef.current.focus();
    }
  }, [deleteTaskModalOpen]);


  const allSelected = selectedCount > 0 && selectedCount === allTaskIds.length;

  const otherSections = useMemo(() => {
    return sections.filter(s => s.id !== sectionToDelete?.id);
  }, [sections, sectionToDelete]);

  const currentSprintName = useMemo(() => {
    // Determine the active sprint ID: prefer the internally selected one, then fallback to the fetched default.
    const activeSprintId = internalSelectedSprintId === undefined ? fetchedDefaultSprintId : internalSelectedSprintId;
    console.log("[ListView] Calculating currentSprintName: internalSelectedSprintId =", internalSelectedSprintId, "fetchedDefaultSprintId =", fetchedDefaultSprintId, "activeSprintId =", activeSprintId); // Restored log
    
    // Find the sprint name using the activeSprintId from the available sprint options.
    const foundSprint = sprintFilterOptions.find(s => s.id === activeSprintId); 
    
    // Return the found name or an empty string if not found.
    const name = foundSprint?.name || "";
    console.log("  sprintFilterOptions =", sprintFilterOptions, "Resolved name =", name); // Restored log
    return name;
  }, [internalSelectedSprintId, sprintFilterOptions, fetchedDefaultSprintId]); // Depend on all relevant states


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        <p className="ml-4 text-lg text-slate-700">Loading tasks and sections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-red-100 text-red-700 p-4">
        <p className="text-lg">Error loading tasks: {error.message}</p>
      </div>
    );
  }

  // Handle case where no sprints are available for the project at all
  if (sprintFilterOptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(10vh-64px)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Sprints Found</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          It looks like there are no sprints in this project yet. Create a new project to get started.
        </p>
        {/* Potentially add a button to create the first sprint if allowed */}
      </div>
    );
  }

  // If sprints exist but no sections/tasks for the selected sprint
  // This state is reached if `sections` is empty but `sprintFilterOptions` is not.
  if (!sections || sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(10vh-64px)] bg-muted/30 p-8 text-center">
        {/* The currentSprintName is guaranteed to be a valid sprint name here */}
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
              {currentSprintName} {/* Directly display the sprint name */}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            {/* The outer `if (sprintFilterOptions.length === 0)` block handles the no sprints case */}
            {sprintFilterOptions.map((sprint) => (
              <DropdownMenuItem key={sprint.id} onClick={() => {
                setInternalSelectedSprintId(sprint.id); // Update internal state
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
                    onDelete={() => openDeleteTaskModal(section.id, task)}
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
                          <label className="text-xs text-muted-foreground">Sprint</label>
                          <Select
                            value={newTask[section.id]?.sprintId || "null"}
                            onValueChange={(v) =>
                              setNewTask((p) => ({
                                ...p,
                                [section.id]: { ...(p[section.id] as NewTaskForm), sprintId: v === "null" ? null : v },
                              }))
                            }
                            disabled={isTaskMutating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Sprint" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">No Sprint</SelectItem>
                              <DropdownMenuSeparator />
                              {sprintFilterOptions.map((sprint) => (
                                <SelectItem key={sprint.id} value={sprint.id}>
                                  {sprint.name}
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
        <SheetContent side="right" className="w-full sm:max-w-md bg-white border-l">
          {sheetData && editingTaskLocal && (
            <>
              <SheetHeader>
                <SheetTitle className="text-foreground">Edit Task</SheetTitle>
                <SheetDescription className="text-muted-foreground">View and modify task details.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Title</label>
                  <Input
                    value={editingTaskLocal.title}
                    onChange={(e) => setEditingTaskLocal(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="bg-white border-border focus:ring-2 focus:ring-primary/20"
                    disabled={isTaskMutating}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Assignee</label>
                    <Select
                      value={editingTaskLocal.assignee?.id || "null"}
                      onValueChange={(v) =>
                        setEditingTaskLocal(prev => prev ? { ...prev, assignee: availableAssignees.find(a => a.id === v) || null } : null)
                      }
                      disabled={isTaskMutating}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Due date</label>
                    <Input
                      type="date"
                      value={editingTaskLocal.due || ""}
                      onChange={(e) => setEditingTaskLocal(prev => prev ? { ...prev, due: e.target.value } : null)}
                      className="bg-white border-border"
                      disabled={isTaskMutating}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Priority</label>
                    <Select
                      value={editingTaskLocal.priority}
                      onValueChange={(v: PriorityUI) =>
                        setEditingTaskLocal(prev => prev ? { ...prev, priority: v } : null)
                      }
                      disabled={isTaskMutating}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Priority" />
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Story Points</label>
                    <Input
                      type="number"
                      value={editingTaskLocal.points ?? ""}
                      onChange={(e) =>
                        setEditingTaskLocal(prev => prev ? { ...prev, points: Number.isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value) } : null)
                      }
                      className="bg-white border-border"
                      min={0}
                      disabled={isTaskMutating}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    value={editingTaskLocal.description || ""}
                    onChange={(e) =>
                      setEditingTaskLocal(prev => prev ? { ...prev, description: e.target.value } : null)
                    }
                    rows={4}
                    className="bg-white border-border focus:ring-2 focus:ring-primary/20 resize-none"
                    placeholder="Add task description..."
                    disabled={isTaskMutating}
                  />
                </div>
              </div>
              <SheetFooter className="mt-8 gap-2">
                <SheetClose asChild>
                  <Button variant="outline" className="flex-1 bg-transparent" disabled={isTaskMutating}>
                    Cancel
                  </Button>
                </SheetClose>
                <Button className="flex-1 bg-primary text-white hover:bg-primary/90" onClick={handleSheetSave} disabled={isTaskMutating}>
                  {isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </SheetFooter>
            </>
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
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDeleteSectionModalOpen(false);
              setSectionToDelete(null);
              setDeleteTasksConfirmed(false);
              setReassignToSectionOption(null);
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
                            }}
                            disabled={isSectionMutating}
                          />
                          <Label htmlFor="reassignTasks">Reassign tasks to:</Label>
                          {(!deleteTasksConfirmed && !!reassignToSectionOption) && (
                            <Select
                              value={reassignToSectionOption || undefined}
                              onValueChange={setReassignToSectionOption}
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
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDeleteTaskModalOpen(false);
              setTaskToDelete(null);
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
  onDelete: () => void;
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
                <div className="inline-flex items-center gap-2">
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
          onClick={onDelete}
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}