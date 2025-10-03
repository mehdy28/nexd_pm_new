// components/tasks/list-view.tsx
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

// --- NEW IMPORTS ---
import {
  useProjectTasksAndSections,
  TaskUI,
  SectionUI,
  PriorityUI,
  SprintFilterOption,
} from "@/hooks/useProjectTasksAndSections";
import { UserAvatarPartial } from "@/types/useProjectTasksAndSections";

// --- Type Definitions ---
type NewTaskForm = {
  title: string;
  assignee: string; // Storing ID
  due: string; // YYYY-MM-DD
  priority: PriorityUI;
  points: number;
};
// --- End Type Definitions ---

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
  // --- START: All Hooks MUST be declared unconditionally at the very top ---
  console.log("[ListView] Component rendered. projectId:", projectId);


  // State for sprint filter
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(undefined);

  // Custom hook for data fetching and mutations
  const {
    sections: fetchedSections,
    sprintFilterOptions,
    loading,
    error,
    refetchProjectTasksAndSections,
    createSection,
    updateSection,
    deleteSection,
  } = useProjectTasksAndSections(projectId, selectedSprintId);

  // Local UI states
  const [sections, setSections] = useState<SectionUI[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sheetTask, setSheetTask] = useState<{ sectionId: string; taskId: string } | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState<Record<string, boolean>>({});
  const [newTask, setNewTask] = useState<Record<string, NewTaskForm>>({});
  const [isSectionMutating, setIsSectionMutating] = useState(false);

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<SectionUI | null>(null);
  const [deleteTasksConfirmed, setDeleteTasksConfirmed] = useState(false);
  const [reassignToSectionOption, setReassignToSectionOption] = useState<string | null>(null);

  // Memoized lists/objects
  const availableAssignees: UserAvatarPartial[] = useMemo(() => {
    return [
      { id: "mock-1", firstName: "Alice", lastName: "Anderson", avatar: "https://ui-avatars.com/api/?name=Alice+Anderson&background=random" },
      { id: "mock-2", firstName: "Farah", lastName: "Farouk", avatar: "https://ui-avatars.com/api/?name=Farah+Farouk&background=random" },
      { id: "mock-3", firstName: "Jamal", lastName: "Malik", avatar: "https://ui-avatars.com/api/?name=Jamal+Malik&background=random" },
      { id: "mock-4", firstName: "Lina", lastName: "Song", avatar: "https://ui-avatars.com/api/?name=Lina+Song&background=random" },
    ];
  }, []);

  // Memoized helper functions
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
    console.log(`[ListView] Toggling collapsed for section ${id}`);
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const setSectionEditing = useCallback((id: string, editing: boolean) => {
    console.log(`[ListView] Setting section ${id} editing to ${editing}`);
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing } : s)));
  }, []);

  const renameSection = useCallback(async (id: string, title: string) => {
    console.log(`[ListView] Renaming section ${id} to "${title}"`);
    if (!title.trim()) {
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing: false } : s)));
      console.log(`[ListView] Rename aborted: title empty for section ${id}`);
      return;
    }
    setIsSectionMutating(true);
    console.log(`[ListView] setIsSectionMutating(true) for rename section ${id}`);
    try {
      await updateSection(id, title);
      console.log(`[ListView] Section ${id} renamed successfully.`);
    } catch (err) {
      console.error(`[ListView] Failed to rename section ${id}:`, err);
    } finally {
      setIsSectionMutating(false);
      console.log(`[ListView] setIsSectionMutating(false) for rename section ${id}`);
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing: false } : s)));
    }
  }, [updateSection]);

  const addSection = useCallback(async () => {
    console.log("[ListView] Adding new section...");
    setIsSectionMutating(true);
    console.log("[ListView] setIsSectionMutating(true) for add section");
    try {
      await createSection("New Section");
      console.log("[ListView] New section added successfully.");
    } catch (err) {
      console.error("[ListView] Failed to add section:", err);
    } finally {
      setIsSectionMutating(false);
      console.log("[ListView] setIsSectionMutating(false) for add section");
    }
  }, [createSection]);

  const toggleTaskCompleted = useCallback((sectionId: string, taskId: string) => {
    console.log(`[ListView] Toggling task ${taskId} in section ${sectionId} completion.`);
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
    // TODO: Add GraphQL mutation to update task status
  }, []);

  const updateTask = useCallback((sectionId: string, taskId: string, updates: Partial<TaskUI>) => {
    console.log(`[ListView] Updating task ${taskId} in section ${sectionId} with:`, updates);
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
    // TODO: Add GraphQL mutation to update task details
  }, []);

  const deleteTask = useCallback((sectionId: string, taskId: string) => {
    console.log(`[ListView] Deleting task ${taskId} from section ${sectionId}.`);
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s)),
    );
    setSelected((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
    // TODO: Add GraphQL mutation to delete task
  }, []);

  const allTaskIds = useMemo(() => {
    console.log("[ListView] Recomputing allTaskIds. Sections count:", sections.length);
    return sections.flatMap((s) => s.tasks.map((t) => t.id));
  }, [sections]);

  const toggleSelect = useCallback((taskId: string, checked: boolean) => {
    console.log(`[ListView] Toggling selection for task ${taskId}: ${checked}`);
    setSelected((prev) => ({ ...prev, [taskId]: checked }));
  }, []);

  const toggleSelectAll = useCallback((checked: boolean) => {
    console.log(`[ListView] Toggling select all: ${checked}. Current task IDs count: ${allTaskIds.length}`);
    if (!checked) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const id of allTaskIds) next[id] = true;
    setSelected(next);
  }, [allTaskIds]);

  const selectedCount = useMemo(() => {
    console.log("[ListView] Recomputing selectedCount.");
    return Object.values(selected).filter(Boolean).length;
  }, [selected]);

  const bulkDeleteSelected = useCallback(() => {
    console.log("[ListView] Performing bulk delete.");
    const toDelete = new Set(
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    );
    if (toDelete.size === 0) {
      console.log("[ListView] Bulk delete aborted: no tasks selected.");
      return;
    }
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => !toDelete.has(t.id)),
      })),
    );
    setSelected({});
    console.log(`[ListView] Bulk deleted ${toDelete.size} tasks.`);
    // TODO: Add GraphQL mutation for bulk delete
  }, [selected]);

  const openNewTask = useCallback((sectionId: string) => {
    console.log(`[ListView] Opening new task form for section ${sectionId}`);
    setNewTaskOpen((p) => ({ ...p, [sectionId]: true }));
    setNewTask((p) => ({
      ...p,
      [sectionId]: p[sectionId] || {
        title: "",
        assignee: availableAssignees[0]?.id || "mock-1",
        due: "",
        priority: "Medium",
        points: 1,
      },
    }));
  }, [availableAssignees]);

  const cancelNewTask = useCallback((sectionId: string) => {
    console.log(`[ListView] Cancelling new task form for section ${sectionId}`);
    setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
  }, []);

  const saveNewTask = useCallback((sectionId: string) => {
    console.log(`[ListView] Saving new task for section ${sectionId}`);
    const form = newTask[sectionId];
    if (!form || !form.title.trim()) {
      console.log(`[ListView] Save new task aborted: title empty for section ${sectionId}.`);
      return;
    }

    const id = `${sectionId}:${Date.now()}`;
    const task: TaskUI = {
      id,
      title: form.title,
      assignee: getAssigneeFromFetched(form.assignee),
      due: form.due || null,
      priority: form.priority,
      points: Number.isFinite(form.points) ? Math.max(0, Math.floor(form.points)) : 0,
      completed: false,
      description: "",
    };
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, tasks: [task, ...s.tasks] } : s)));
    setNewTaskOpen((p) => ({ ...p, [sectionId]: false }));
    console.log(`[ListView] New task "${task.title}" added to section ${sectionId}.`);
    // TODO: Add GraphQL mutation to create task
  }, [newTask, getAssigneeFromFetched]);

  const openSheetFor = useCallback((sectionId: string, taskId: string) => {
    console.log(`[ListView] Opening sheet for task ${taskId} in section ${sectionId}`);
    setSheetTask({ sectionId, taskId });
  }, []);

  const closeSheet = useCallback(() => {
    console.log("[ListView] Closing task details sheet.");
    setSheetTask(null);
  }, []);

  const sheetData = useMemo(() => {
    console.log("[ListView] Recomputing sheetData.");
    if (!sheetTask) return null;
    const s = sections.find((x) => x.id === sheetTask.sectionId);
    const t = s?.tasks.find((x) => x.id === sheetTask.taskId);
    return t ? { sectionId: sheetTask.sectionId, task: t } : null;
  }, [sheetTask, sections]);

  // UseEffects for syncing data
  useEffect(() => {
    console.log("[ListView] useEffect triggered due to fetchedSections change.");
    if (!fetchedSections) {
      console.log("[ListView] fetchedSections is null or undefined. Skipping state update.");
      return;
    }

    setSections(currentSections => {
      const currentSectionIds = new Set(currentSections.map(s => s.id));
      const fetchedSectionIds = new Set(fetchedSections.map(s => s.id));
      const hasNewSections = fetchedSections.some(s => !currentSectionIds.has(s.id));
      const hasRemovedSections = currentSections.some(s => !fetchedSectionIds.has(s.id));

      if (currentSections === fetchedSections) {
        console.log("[ListView] setSections: fetchedSections reference unchanged.");
        return currentSections;
      }

      // Check for content changes (deep comparison for tasks might be too expensive, but useful for debugging)
      const areContentsEffectivelySame = currentSections.length === fetchedSections.length &&
        currentSections.every((currentS, i) => {
          const fetchedS = fetchedSections[i];
          if (!fetchedS || currentS.id !== fetchedS.id || currentS.title !== fetchedS.title) return false;
          // Deeper check for tasks array changes
          if (currentS.tasks.length !== fetchedS.tasks.length) return false;
          return currentS.tasks.every((currentT, j) => {
              const fetchedT = fetchedS.tasks[j];
              return currentT.id === fetchedT.id &&
                     currentT.title === fetchedT.title &&
                     currentT.completed === fetchedT.completed; // Add more fields if necessary
          });
        });

      if (areContentsEffectivelySame) {
        console.log("[ListView] setSections: fetchedSections content is effectively same, skipping update.");
        return currentSections;
      }

      console.log("[ListView] setSections: Updating local sections state.", { hasNewSections, hasRemovedSections, fetchedSections: JSON.parse(JSON.stringify(fetchedSections)) });
      return fetchedSections;
    });

    setCollapsed(prevCollapsed => {
      const newCollapsedState: Record<string, boolean> = {};
      let needsUpdate = false;

      const fetchedSectionIds = new Set(fetchedSections.map(sec => sec.id));

      fetchedSections.forEach(sec => {
        if (prevCollapsed[sec.id] === undefined) {
          newCollapsedState[sec.id] = false; // Default to not collapsed
          needsUpdate = true;
        } else {
          newCollapsedState[sec.id] = prevCollapsed[sec.id]; // Preserve existing state
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
        console.log("[ListView] setCollapsed: Updating local collapsed state.", { newCollapsedState, prevCollapsed });
        return newCollapsedState;
      }
      console.log("[ListView] setCollapsed: Collapsed state effectively same, skipping update.");
      return prevCollapsed;
    });
  }, [fetchedSections]);

  // --- NEW: Section Delete Logic ---

  const handleOpenDeleteModal = useCallback((section: SectionUI) => {
    console.log(`[ListView] Action: Opening delete modal for section "${section.title}" (${section.id})`);
    setSectionToDelete(section);
    setDeleteTasksConfirmed(false); // Reset confirmation
    const availableOtherSections = sections.filter(s => s.id !== section.id);
    const defaultReassignId = availableOtherSections[0]?.id || null;
    setReassignToSectionOption(defaultReassignId);
    console.log(`[ListView] Info: Default reassign option set to ${defaultReassignId}`);
    setDeleteModalOpen(true);
    console.log("[ListView] State: setDeleteModalOpen(true)");
  }, [sections]);

  const handleConfirmDelete = useCallback(async () => {
    console.log("[ListView] Action: handleConfirmDelete initiated.");
    if (!sectionToDelete) {
      console.log("[ListView] Warning: No sectionToDelete, returning.");
      return;
    }
    console.log(`[ListView] Info: Attempting to delete section "${sectionToDelete.title}" (${sectionToDelete.id})`);

    setIsSectionMutating(true);
    console.log("[ListView] State: setIsSectionMutating(true)");

    try {
      const hasTasks = sectionToDelete.tasks.length > 0;
      let reassignId: string | null | undefined = null;

      if (hasTasks && !deleteTasksConfirmed) { // If has tasks and user chose to reassign
        reassignId = reassignToSectionOption;
        if (!reassignId) {
          console.error("[ListView] Error: Reassign section ID is required if tasks are not deleted. Aborting delete.");
          setIsSectionMutating(false); // Reset mutation state
          return;
        }
        console.log(`[ListView] Info: Tasks will be reassigned to section ID: ${reassignId}`);
      } else if (hasTasks && deleteTasksConfirmed) {
        console.log("[ListView] Info: Tasks will be deleted along with the section.");
      } else {
        console.log("[ListView] Info: Section has no tasks, proceeding with deletion.");
      }

      await deleteSection(sectionToDelete.id, {
        deleteTasks: hasTasks ? deleteTasksConfirmed : true,
        reassignToSectionId: reassignId,
      });
      console.log(`[ListView] Mutation: deleteSection successful for ID: ${sectionToDelete.id}`);

    } catch (err) {
      console.error(`[ListView] Mutation Error: Failed to delete section ${sectionToDelete.id}:`, err);
      // TODO: Display error to user (e.g., using a toast notification)
    } finally {
      console.log("[ListView] Finally block for handleConfirmDelete (after mutation attempt).");
      setIsSectionMutating(false);
      console.log("[ListView] State: setIsSectionMutating(false)");
      // Note: setDeleteModalOpen(false) is handled by AlertDialog's onOpenChange prop,
      // which in turn resets sectionToDelete, deleteTasksConfirmed, reassignToSectionOption.
    }
  }, [sectionToDelete, deleteTasksConfirmed, reassignToSectionOption, deleteSection]);
  // ---------------------------------

  // --- END: All Hooks declared unconditionally ---

  // All subsequent computations or conditional renders depend on the state derived from hooks.
  console.log("[ListView] Re-evaluating derived states and rendering JSX.");

  const allSelected = selectedCount > 0 && selectedCount === allTaskIds.length;

  const otherSections = useMemo(() => {
    console.log("[ListView] Recomputing otherSections for delete modal.");
    return sections.filter(s => s.id !== sectionToDelete?.id);
  }, [sections, sectionToDelete]);

  if (loading) {
    console.log("[ListView] Rendering loading state.");
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        <p className="ml-4 text-lg text-slate-700">Loading tasks and sections...</p>
      </div>
    );
  }

  if (error) {
    console.error("[ListView] Rendering error state:", error);
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-red-100 text-red-700 p-4">
        <p className="text-lg">Error loading tasks: {error.message}</p>
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    console.log("[ListView] Rendering no sections/tasks state. Current sections:", sections);
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(10vh-64px)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Tasks Found</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          It looks like there are no tasks in this project yet. Start by adding a new section or task!
        </p>
        <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          {isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          + Add Section
        </Button>
      </div>
    );
  }

  console.log("[ListView] Rendering main content. Current sections count:", sections.length);
  return (
    <div className="p-6 pt-3">
      {/* ... (rest of your component's JSX) ... */}
      <div className="flex items-center gap-3">
        <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          {isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          + Add section
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">
              {selectedSprintId ? sprintFilterOptions.find(s => s.id === selectedSprintId)?.name : "All Sprints"}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              setSelectedSprintId(undefined);
            }}>All Sprints</DropdownMenuItem>
            <DropdownMenuSeparator />
            {sprintFilterOptions.map((sprint) => (
              <DropdownMenuItem key={sprint.id} onClick={() => {
                setSelectedSprintId(sprint.id);
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
            {/* Section header */}
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
                  <Button variant="outline" size="sm" onClick={() => openNewTask(section.id)}>
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
                        <DropdownMenuItem onClick={() => handleOpenDeleteModal(section)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Section
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Rows */}
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
                    onDelete={() => deleteTask(section.id, task.id)}
                    assignees={availableAssignees}
                  />
                ))}

                {/* Full-width create form below the section (buttons inline to the right of Points) */}
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
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Assignee</label>
                          <Select
                            value={newTask[section.id]?.assignee || availableAssignees[0]?.id || "mock-1"}
                            onValueChange={(v) =>
                              setNewTask((p) => ({
                                ...p,
                                [section.id]: { ...(p[section.id] as NewTaskForm), assignee: v },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Assignee" />
                            </SelectTrigger>
                            <SelectContent>
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

                        {/* Points + Buttons inline */}
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Story Points</label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-24"
                              value={newTask[section.id]?.points ?? 1}
                              onChange={(e) =>
                                setNewTask((p) => ({
                                  ...p,
                                  [section.id]: {
                                    ...(p[section.id] as NewTaskForm),
                                    points: Number.parseInt(e.target.value || "0") || 0,
                                  },
                                }))
                              }
                              min={0}
                            />

                            <Button
                              aria-label="Create task"
                              onClick={() => saveNewTask(section.id)}
                              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Create
                            </Button>

                            <Button
                              aria-label="Cancel task creation"
                              variant="ghost"
                              className="h-9 bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => cancelNewTask(section.id)}
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

      {/* Task details Sheet opened by the pen tool */}
      <Sheet open={!!sheetData} onOpenChange={(open) => (!open ? closeSheet() : null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white border-l">
          {sheetData && ( // Only render if sheetData is available
            <>
              <SheetHeader>
                <SheetTitle className="text-foreground">Edit Task</SheetTitle>
                <SheetDescription className="text-muted-foreground">View and modify task details.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Title</label>
                  <Input
                    value={sheetData.task.title}
                    onChange={(e) => updateTask(sheetData.sectionId, sheetData.task.id, { title: e.target.value })}
                    className="bg-white border-border focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Assignee</label>
                    <Select
                      value={sheetData.task.assignee?.id || "Unassigned"}
                      onValueChange={(v) => updateTask(sheetData.sectionId, sheetData.task.id, { assignee: getAssigneeFromFetched(v) })}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border">
                        {availableAssignees.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={a.avatar || undefined} />
                                <AvatarFallback className="text-xs">{`${a.firstName?.[0] || ''}${a.lastName?.[0] || ''}` || '?'}</AvatarFallback>
                              </Avatar>
                              {a.firstName} {a.lastName}
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
                      value={sheetData.task.due || ""}
                      onChange={(e) => updateTask(sheetData.sectionId, sheetData.task.id, { due: e.target.value })}
                      className="bg-white border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Priority</label>
                    <Select
                      value={sheetData.task.priority}
                      onValueChange={(v: PriorityUI) =>
                        updateTask(sheetData.sectionId, sheetData.task.id, { priority: v })
                      }
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
                      value={sheetData.task.points}
                      onChange={(e) =>
                        updateTask(sheetData.sectionId, sheetData.task.id, {
                          points: Number.isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value),
                        })
                      }
                      className="bg-white border-border"
                      min={0}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    value={sheetData.task.description || ""}
                    onChange={(e) =>
                      updateTask(sheetData.sectionId, sheetData.task.id, { description: e.target.value })
                    }
                    rows={4}
                    className="bg-white border-border focus:ring-2 focus:ring-primary/20 resize-none"
                    placeholder="Add task description..."
                  />
                </div>
              </div>
              <SheetFooter className="mt-8 gap-2">
                <SheetClose asChild>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    Close
                  </Button>
                </SheetClose>
                <Button className="flex-1 bg-primary text-white hover:bg-primary/90">Save Changes</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
      {/* Delete Section Confirmation Modal */}
      {sectionToDelete && (
        <AlertDialog open={deleteModalOpen} onOpenChange={(open) => {
          console.log(`[ListView] AlertDialog onOpenChange to ${open}`);
          setDeleteModalOpen(open);

          if (!open) {
            console.log("[ListView] Info: AlertDialog closed. Resetting all modal-related states.");
            setSectionToDelete(null);
            setDeleteTasksConfirmed(false);
            setReassignToSectionOption(null);
          } else {
            console.log("[ListView] Info: AlertDialog opened. States should be ready.");
          }
        }}>
          <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Section "{sectionToDelete.title}"?</AlertDialogTitle>
              <AlertDialogDescription>
                {sectionToDelete.tasks.length > 0 ? (
                  <>
                    This section contains {sectionToDelete.tasks.length} tasks.
                    What would you like to do with them?
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="deleteTasks"
                          checked={deleteTasksConfirmed}
                          onCheckedChange={(checked: boolean) => {
                            console.log(`[ListView] Checkbox: Delete tasks confirmed: ${checked}`);
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
                                console.log(`[ListView] Checkbox: Reassign tasks checked: ${checked}`);
                                if (checked) {
                                    setDeleteTasksConfirmed(false);
                                    const defaultReassignId = otherSections[0]?.id || null;
                                    setReassignToSectionOption(prev => prev || defaultReassignId);
                                    console.log(`[ListView] Info: Reassign default set to ${defaultReassignId}`);
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
                              onValueChange={(value) => {
                                console.log(`[ListView] Select: Reassign section changed to ${value}`);
                                setReassignToSectionOption(value);
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
                        <p className="text-red-500 text-sm">[ListView] Warning: Cannot reassign tasks. No other sections available. You must delete the tasks.</p>
                      )}
                    </div>
                  </>
                ) : (
                  "Are you sure you want to delete this section? This action cannot be undone."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isSectionMutating}
                onClick={() => {
                  console.log("[ListView] AlertDialog: Cancel button clicked.");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isSectionMutating || (sectionToDelete.tasks.length > 0 && !deleteTasksConfirmed && !reassignToSectionOption)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSectionMutating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Delete Section"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ... TaskRow and HeaderRow components remain unchanged

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
          value={task.points}
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