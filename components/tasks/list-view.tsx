// components/tasks/list-view.tsx`
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
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders";

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
    const s = sections.find(x => x.id === sheetTask.sectionId);
    const t = s?.tasks.find(x => x.id === sheetTask.taskId);
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
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const setSectionEditing = useCallback((id: string, editing: boolean) => {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, editing } : s)));
  }, []);

  const renameSection = useCallback(
    async (id: string, title: string) => {
      if (!title.trim()) {
        setSections(prev => prev.map(s => (s.id === id ? { ...s, editing: false } : s)));
        return;
      }
      setIsSectionMutating(true);
      try {
        await updateSection(id, title);
      } catch (err) {
        console.error(`[renameSection] Failed to rename section "${id}":`, err);
      } finally {
        setIsSectionMutating(false);
        setSections(prev => prev.map(s => (s.id === id ? { ...s, editing: false } : s)));
      }
    },
    [updateSection]
  );

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

  const toggleTaskCompleted = useCallback(
    async (sectionId: string, taskId: string) => {
      const taskToUpdate = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;
      setSections(prev =>
        prev.map(s =>
          s.id === sectionId
            ? {
                ...s,
                tasks: s.tasks.map(t =>
                  t.id === taskId ? { ...t, completed: !t.completed, status: !t.completed ? "DONE" : "TODO" } : t
                ),
              }
            : s
        )
      );
      try {
        await toggleTaskCompletedMutation(taskId, taskToUpdate.status);
      } catch (err) {
        console.error(`[toggleTaskCompleted] Failed to toggle task "${taskId}" completion:`, err);
        setSections(prev =>
          prev.map(s =>
            s.id === sectionId
              ? {
                  ...s,
                  tasks: s.tasks.map(t =>
                    t.id === taskId ? { ...t, completed: !t.completed, status: !t.completed ? "TODO" : "DONE" } : t
                  ),
                }
              : s
          )
        );
      }
    },
    [sections, toggleTaskCompletedMutation]
  );

  const updateTask = useCallback(
    async (sectionId: string, taskId: string, updates: Partial<TaskUI>) => {
      const originalTask = sections.find(s => s.id === sectionId)?.tasks.find(t => t.id === taskId);
      if (!originalTask) return;

      const mutationInput: { [key: string]: any } = { id: taskId };
      if (updates.title !== undefined) mutationInput.title = updates.title;
      if (updates.description !== undefined) mutationInput.description = updates.description;
      if (updates.priority !== undefined) mutationInput.priority = updates.priority;
      if (updates.points !== undefined) mutationInput.points = updates.points;
      if (updates.due !== undefined) mutationInput.dueDate = updates.due;
      if (updates.assignee !== undefined) mutationInput.assigneeId = updates.assignee?.id || null;
      const newStatus = updates.completed !== undefined ? (updates.completed ? "DONE" : "TODO") : undefined;
      if (newStatus !== undefined) mutationInput.status = newStatus;

      setSections(prev =>
        prev.map(s =>
          s.id === sectionId
            ? { ...s, tasks: s.tasks.map(t => (t.id === taskId ? { ...t, ...updates } : t)) }
            : s
        )
      );

      if (Object.keys(mutationInput).length > 1) {
        try {
          await updateTaskMutation(taskId, mutationInput);
        } catch (err) {
          console.error(`[updateTask] Failed to update task "${taskId}":`, err);
          setSections(prev =>
            prev.map(s =>
              s.id === sectionId ? { ...s, tasks: s.tasks.map(t => (t.id === taskId ? originalTask : t)) } : s
            )
          );
        }
      }
    },
    [sections, updateTaskMutation]
  );

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

    setSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, tasks: s.tasks.filter(t => t.id !== taskId) } : s))
    );
    setSelected(prev => {
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

  const allTaskIds = useMemo(() => sections.flatMap(s => s.tasks.map(t => t.id)), [sections]);

  const toggleSelect = useCallback((taskId: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [taskId]: checked }));
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelected({});
        return;
      }
      const next: Record<string, boolean> = {};
      for (const id of allTaskIds) next[id] = true;
      setSelected(next);
    },
    [allTaskIds]
  );

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const bulkDeleteSelected = useCallback(async () => {
    const toDelete = new Set(Object.entries(selected).filter(([, v]) => v).map(([k]) => k));
    if (toDelete.size === 0) return;

    const originalSections = [...sections];
    setSections(prev => prev.map(s => ({ ...s, tasks: s.tasks.filter(t => !toDelete.has(t.id)) })));
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

  const openNewTask = useCallback(
    (sectionId: string) => {
      setNewTaskOpen(p => ({ ...p, [sectionId]: true }));
      setNewTask(p => ({
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
    },
    [availableAssignees, internalSelectedSprintId]
  );

  const cancelNewTask = useCallback((sectionId: string) => {
    setNewTaskOpen(p => ({ ...p, [sectionId]: false }));
  }, []);

  const saveNewTask = useCallback(
    async (sectionId: string) => {
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
          status: "TODO",
        });
        if (!createdTask.sprintId) {
          createdTask = { ...createdTask, sprintId: assignedSprintId };
        }
        setSections(prevSections =>
          prevSections.map(s => {
            if (s.id === sectionId) {
              const taskBelongsToCurrentSprint = !assignedSprintId || createdTask.sprintId === assignedSprintId;
              if (taskBelongsToCurrentSprint) {
                return { ...s, tasks: [...s.tasks, createdTask] };
              }
            }
            return s;
          })
        );
        setNewTaskOpen(p => ({ ...p, [sectionId]: false }));
        setNewTask(p => {
          const newState = { ...p };
          delete newState[sectionId];
          return newState;
        });
      } catch (err) {
        console.error(`[saveNewTask] Failed to create task in section "${sectionId}":`, err);
      }
    },
    [newTask, createTask, internalSelectedSprintId]
  );

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

  const handleOpenDeleteSectionModal = useCallback(
    (section: SectionUI) => {
      setSectionToDelete(section);
      setDeleteTasksConfirmed(false);
      const availableOtherSections = sections.filter(s => s.id !== section.id);
      setReassignToSectionOption(availableOtherSections[0]?.id || null);
      setDeleteSectionModalOpen(true);
    },
    [sections]
  );

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
  }, [
    sectionToDelete,
    deleteTasksConfirmed,
    reassignToSectionOption,
    deleteSection,
    refetchProjectTasksAndSections,
  ]);

  // Modal Focus Management
  useEffect(() => {
    if (deleteSectionModalOpen && customModalRef.current) customModalRef.current.focus();
  }, [deleteSectionModalOpen]);
  useEffect(() => {
    if (deleteTaskModalOpen && customTaskModalRef.current) customTaskModalRef.current.focus();
  }, [deleteTaskModalOpen]);

  const allSelected = useMemo(() => selectedCount > 0 && selectedCount === allTaskIds.length, [
    selectedCount,
    allTaskIds,
  ]);
  const otherSections = useMemo(() => sections.filter(s => s.id !== sectionToDelete?.id), [
    sections,
    sectionToDelete,
  ]);
  const currentSprintName = useMemo(() => {
    const activeSprintId = internalSelectedSprintId || suggestedDefaultSprintId;
    return sprintFilterOptions.find(s => s.id === activeSprintId)?.name || "";
  }, [internalSelectedSprintId, sprintFilterOptions, suggestedDefaultSprintId]);

  const handleSprintSelectionChange = useCallback(
    (sprintId: string) => {
      setInternalSelectedSprintId(sprintId);
      refetchProjectTasksAndSections();
    },
    [refetchProjectTasksAndSections]
  );

  if (loading) return <LoadingPlaceholder message="Loading tasks and sections..." />;
  if (error) return <ErrorPlaceholder error={error} onRetry={refetchProjectTasksAndSections} />;

  return (
    <div className="p-6 pt-3">
      <div className="flex items-center gap-3">
        <Button onClick={addSection} disabled={isSectionMutating} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          {isSectionMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}+ Add section
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
            {sprintFilterOptions.map(sprint => (
              <DropdownMenuItem key={sprint.id} onClick={() => handleSprintSelectionChange(sprint.id)}>
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
        {sections.map(section => (
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
                  onBlur={e => renameSection(section.id, e.target.value.trim() || "Untitled")}
                  onKeyDown={e => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
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
                {section.tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={!!selected[task.id]}
                    onSelect={checked => toggleSelect(task.id, checked)}
                    onToggleCompleted={() => toggleTaskCompleted(section.id, task.id)}
                    onChange={updates => updateTask(section.id, task.id, updates)}
                    onOpen={() => openSheetFor(section.id, task.id)}
                    onDelete={(sid, tid) =>
                      openDeleteTaskModal(sid, { id: tid, title: task.title, sectionId: sid } as TaskUI)
                    }
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
                            onChange={e =>
                              setNewTask(p => ({
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
                            onValueChange={v =>
                              setNewTask(p => ({
                                ...p,
                                [section.id]: {
                                  ...(p[section.id] as NewTaskForm),
                                  assigneeId: v === "null" ? null : v,
                                },
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
                              {availableAssignees.map(a => (
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
                            onChange={e =>
                              setNewTask(p => ({
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
                              setNewTask(p => ({
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
                              {(["Low", "Medium", "High"] as PriorityUI[]).map(p => (
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
                              onChange={e =>
                                setNewTask(p => ({
                                  ...p,
                                  [section.id]: {
                                    ...(p[section.id] as NewTaskForm),
                                    points: Number.isFinite(Number.parseInt(e.target.value))
                                      ? Number.parseInt(e.target.value)
                                      : null,
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
                              {isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create
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
        <div
          ref={customModalRef}
          role="alertdialog"
          aria-labelledby="delete-section-title"
          aria-describedby="delete-section-description"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={e => {
            if (e.target === e.currentTarget) setDeleteSectionModalOpen(false);
          }}
          onKeyDown={e => {
            if (e.key === "Escape") setDeleteSectionModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 id="delete-section-title" className="text-lg font-semibold text-foreground">
                Delete Section "{sectionToDelete.title}"?
              </h2>
              <div id="delete-section-description" className="text-sm text-muted-foreground">
                {sectionToDelete.tasks.length > 0 ? (
                  <>
                    <p>
                      This section contains {sectionToDelete.tasks.length} tasks. What would you like to do with them?
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="deleteTasks"
                          checked={deleteTasksConfirmed}
                          onCheckedChange={(checked: boolean) => setDeleteTasksConfirmed(checked)}
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
                              if (checked) setReassignToSectionOption(otherSections[0]?.id || null);
                              else setReassignToSectionOption(null);
                            }}
                            disabled={isSectionMutating}
                          />
                          <Label htmlFor="reassignTasks">Reassign tasks to:</Label>
                          {!deleteTasksConfirmed && !!reassignToSectionOption && (
                            <Select
                              value={reassignToSectionOption || undefined}
                              onValueChange={v => setReassignToSectionOption(v)}
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
                        <p className="text-red-500 text-sm">
                          Cannot reassign tasks. No other sections available. You must delete the tasks.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p>Are you sure you want to delete this section? This action cannot be undone.</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                variant="outline"
                className="mt-2 sm:mt-0"
                onClick={() => setDeleteSectionModalOpen(false)}
                disabled={isSectionMutating}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDeleteSection}
                disabled={
                  isSectionMutating ||
                  (sectionToDelete.tasks.length > 0 && !deleteTasksConfirmed && !reassignToSectionOption)
                }
              >
                {isSectionMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Section"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {taskToDelete && deleteTaskModalOpen && (
        <div
          ref={customTaskModalRef}
          role="alertdialog"
          aria-labelledby="delete-task-title"
          aria-describedby="delete-task-description"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={e => {
            if (e.target === e.currentTarget) setDeleteTaskModalOpen(false);
          }}
          onKeyDown={e => {
            if (e.key === "Escape") setDeleteTaskModalOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-lg sm:rounded-xl">
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 id="delete-task-title" className="text-lg font-semibold text-foreground">
                Delete Task "{taskToDelete.task.title}"?
              </h2>
              <p id="delete-task-description" className="text-sm text-muted-foreground">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                variant="outline"
                className="mt-2 sm:mt-0"
                onClick={() => setDeleteTaskModalOpen(false)}
                disabled={isTaskMutating}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmTaskDelete}
                disabled={isTaskMutating}
              >
                {isTaskMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Task"}
              </Button>
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
  const cellInput =
    "h-8 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:border-0 focus:outline-none text-sm";
  const assignee = task.assignee || { id: "unassigned", firstName: "Unassigned", lastName: "", avatar: "" };
  const assigneeInitials = `${assignee.firstName?.[0] || ""}${assignee.lastName?.[0] || ""}`.trim() || "?";
  const assigneeName = `${assignee.firstName || ""} ${assignee.lastName || ""}`.trim() || "Unassigned";

  return (
    <div className="grid grid-cols-[40px_1fr_180px_160px_140px_100px_96px] items-center gap-2 px-10 py-2 hover:bg-muted/40 focus-within:bg-emerald-50/50 focus-within:ring-1 focus-within:ring-emerald-200 rounded-md">
      <div className="flex items-center">
        <Checkbox checked={selected} onCheckedChange={v => onSelect(!!v)} aria-label="Select task" />
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleCompleted}
          aria-pressed={!!task.completed}
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            task.completed ? "text-emerald-600" : "text-muted-foreground"
          )}
          title="Toggle completed"
        >
          <Icon className="h-4 w-4" />
        </button>
        <Input
          className={cn(
            cellInput,
            "min-w-0 rounded-sm focus-visible:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-0",
            task.completed && "line-through text-muted-foreground"
          )}
          value={task.title}
          onChange={e => onChange({ title: e.target.value })}
          onFocus={e => e.currentTarget.select()}
        />
      </div>
      <div className="justify-self-end w-[180px]">
        <Select
          value={assignee.id}
          onValueChange={v => onChange({ assignee: assignees.find(a => a.id === v) || null })}
        >
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
            {assignees.map(a => (
              <SelectItem key={a.id} value={a.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={a.avatar || undefined} />
                    <AvatarFallback className="text-xs">{`${a.firstName?.[0] || ""}${
                      a.lastName?.[0] || ""
                    }` || "?"}</AvatarFallback>
                  </Avatar>
                  <span>
                    {a.firstName} {a.lastName}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="justify-self-end w-[160px]">
        <Input type="date" value={task.due || ""} onChange={e => onChange({ due: e.target.value })} className="h-8" />
      </div>
      <div className="justify-self-end w-[140px]">
        <Select value={task.priority} onValueChange={(v: PriorityUI) => onChange({ priority: v })}>
          <SelectTrigger className="h-8">
            <div className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", priorityStyles[task.priority])}>
              <span className={cn("mr-2 h-2 w-2 rounded-full", priorityDot[task.priority])} />
              {task.priority}
            </div>
          </SelectTrigger>
          <SelectContent>
            {(["Low", "Medium", "High"] as PriorityUI[]).map(p => (
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
      <div className="justify-self-end w-[100px]">
        <Input
          className={cellInput}
          type="number"
          value={task.points ?? ""}
          onChange={e =>
            onChange({
              points: Number.isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value),
            })
          }
          min={0}
        />
      </div>
      <div className="flex items-center justify-end gap-2 pr-2 w-[96px]">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpen} title="Open task">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(task.sectionId, task.id)}
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
