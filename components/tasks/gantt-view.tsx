"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Gantt, Task as GanttTaskReact, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

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
import { ChevronDown, Loader2 } from "lucide-react";

import { useGanttData, CustomGanttTask, SprintGanttFilterOption } from "@/hooks/useGanttData";
import { useGanttMutations } from "@/hooks/useGanttMutations";


interface GanttViewProps {
  projectId: string;
}

// Helper to determine start/end date for a parent sprint based on its children tasks/milestones
export function getStartEndDateForParent(tasks: CustomGanttTask[], parentId: string) {
  const children = tasks.filter((t) => t.sprint === parentId);
  if (children.length === 0) {
    const parent = tasks.find(t => t.id === parentId);
    return parent ? [parent.start, parent.end] : [new Date(), new Date()];
  }
  let start = children[0].start;
  let end = children[0].end;

  for (let i = 0; i < children.length; i++) {
    const task = children[i];
    if (start.getTime() > task.start.getTime()) {
      start = task.start;
    }
    if (end.getTime() < task.end.getTime()) {
      end = task.end;
    }
  }
  return [start, end];
}


const GanttView: React.FC<GanttViewProps> = ({ projectId }) => {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);

  const [internalSelectedSprintId, setInternalSelectedSprintId] = useState<string | undefined>(undefined);
  console.log(`[GanttView] Current internalSelectedSprintId (state): ${internalSelectedSprintId}`);

  const { ganttTasks, sprintFilterOptions, loading, error, refetchGanttData, defaultSelectedSprintId: suggestedDefaultSprintId } = useGanttData(projectId, internalSelectedSprintId);
  const { createGanttTask, updateGanttTask, updateSprintDates, isMutating, mutationError } = useGanttMutations(projectId, internalSelectedSprintId);

  // --- LOGGING: Initial tasks and when ganttTasks updates ---
  useEffect(() => {
    console.log(`[GanttView] useEffect: ganttTasks loaded/updated (${ganttTasks.length} tasks).`);
    if (ganttTasks.length > 0) {
      ganttTasks.forEach(task => {
        console.log(`[GanttView] Task: ID=${task.id}, Name="${task.name}", Progress=${task.progress}%, Type=${task.type}, OriginalType=${task.originalType}, Start=${task.start.toISOString().split('T')[0]}, End=${task.end.toISOString().split('T')[0]}`);
      });
    } else if (!loading && !error) {
        console.log("[GanttView] No tasks found for the current filter.");
    }
  }, [ganttTasks, loading, error]);
  // --- END LOGGING ---

  useEffect(() => {
    if (internalSelectedSprintId === undefined && suggestedDefaultSprintId) {
      console.log(`[GanttView] Initializing internalSelectedSprintId to suggestedDefaultSprintId: ${suggestedDefaultSprintId}`);
      setInternalSelectedSprintId(suggestedDefaultSprintId);
    }
  }, [suggestedDefaultSprintId, internalSelectedSprintId]);


  const dynamicColumnWidth = useMemo(() => {
    switch (viewMode) {
      case ViewMode.Day: return 150;
      case ViewMode.Week: return 250;
      case ViewMode.Month: return 300;
      case ViewMode.Year: return 500;
      default: return 150;
    }
  }, [viewMode]);

  // Handle updates to tasks (date, progress, etc.)

  const handleTaskChange = useCallback(async (task: GanttTaskReact) => {
    console.log("[GanttView] handleTaskChange: Task changed (Gantt library event):", task);

    if (isMutating) {
        console.warn("[GanttView] handleTaskChange: Mutation already in progress, deferring task change.");
        return;
    }

    if (task.type === "project") { // It's a sprint group
      const sprintToUpdate = sprintFilterOptions.find(s => s.id === task.id);
      if (sprintToUpdate) {
        console.log(`[GanttView] handleTaskChange: Updating sprint dates for ${sprintToUpdate.name} (${sprintToUpdate.id}) to ${task.start} - ${task.end}`);
        try {
          await updateSprintDates(sprintToUpdate.id, task.start, task.end);
          console.log("[GanttView] handleTaskChange: Sprint dates updated successfully. Refetching Gantt data.");
          refetchGanttData();
        } catch (err) {
          console.error("[GanttView] handleTaskChange: Error updating sprint dates:", err);
        }
      }
    } else { // It's a regular task or milestone
      const originalItem = ganttTasks.find(t => t.id === task.id);
      if (!originalItem) {
        console.warn(`[GanttView] handleTaskChange: Original task/milestone not found for ID: ${task.id}`);
        return;
      }

      // --- CONSTRUCT PARTIAL INPUT FOR UPDATE ---
      const input: {
        id: string;
        type: "TASK" | "MILESTONE";
        startDate?: string | null; // Allow null for explicit clearing
        endDate?: string | null;   // Allow null for explicit clearing
        name?: string | null;      // Allow null for explicit clearing
      } = {
        id: originalItem.originalTaskId,
        type: originalItem.originalType,
      };

      let hasChanges = false;

      // Only add fields to 'input' if they've genuinely changed
      const currentStart = originalItem.start.toISOString().split('T')[0];
      const newStart = task.start.toISOString().split('T')[0];
      if (currentStart !== newStart) {
        input.startDate = task.start.toISOString();
        hasChanges = true;
        console.log(`[GanttView] handleTaskChange: Start date changed from ${currentStart} to ${newStart}`);
      }

      const currentEnd = originalItem.end.toISOString().split('T')[0];
      const newEnd = task.end.toISOString().split('T')[0];
      if (currentEnd !== newEnd) {
        input.endDate = task.end.toISOString();
        hasChanges = true;
        console.log(`[GanttView] handleTaskChange: End date changed from ${currentEnd} to ${newEnd}`);
      }

      // Check if name changed. Gantt-Task-React's onDateChange can also include name change.
      if (task.name !== originalItem.name) {
          input.name = task.name;
          hasChanges = true;
          console.log(`[GanttView] handleTaskChange: Name changed from "${originalItem.name}" to "${task.name}"`);
      }
      // --- END CONSTRUCT PARTIAL INPUT ---

      // Only send mutation if there are any changes
      if (hasChanges) {
        try {
          console.log(`[GanttView] handleTaskChange: Updating Gantt task/milestone ${originalItem.originalType} (${originalItem.originalTaskId}). Partial Input:`, input);
          await updateGanttTask(input);
          console.log("[GanttView] handleTaskChange: Task/milestone updated successfully. Refetching Gantt data.");
          refetchGanttData();
        } catch (err) {
          console.error("[GanttView] handleTaskChange: Error updating Gantt task/milestone dates/name:", err);
        }
      } else {
        console.log(`[GanttView] handleTaskChange: No date or name changes detected for task ${task.id}. Skipping update.`);
      }
    }
  }, [ganttTasks, sprintFilterOptions, updateGanttTask, updateSprintDates, refetchGanttData, isMutating]);



  const handleTaskDelete = useCallback((task: GanttTaskReact) => {
    console.log("[GanttView] handleTaskDelete: Deletion requested for task:", task);
    if (isMutating) {
        console.warn("[GanttView] handleTaskDelete: Mutation already in progress, deferring task delete.");
        return false;
    }

    const conf = window.confirm("Are you sure you want to delete " + task.name + " ?");
    if (conf) {
      const originalItem = ganttTasks.find(t => t.id === task.id);
      if (!originalItem) {
        console.warn(`[GanttView] handleTaskDelete: Original item not found for deletion ID: ${task.id}`);
        return false;
      }

      console.log(`[GanttView] handleTaskDelete: Attempting to delete ${originalItem.originalType} with ID: ${originalItem.originalTaskId}`);
      if (originalItem.originalType === "TASK") {
        // You would typically use a deleteTask mutation here, e.g., from useProjectTaskMutations
        // For this example, we'll just refetch. If you have deleteProjectTask wired up, use it.
        // E.g., await deleteProjectTask(originalItem.originalTaskId); // requires importing useProjectTaskMutations
        // For now, refetch:
        console.log("[GanttView] handleTaskDelete: Task deletion (simulated). Refetching Gantt data.");
        refetchGanttData();
        return true;
      } else {
        alert(`Deletion of ${originalItem.originalType} (milestones or sprints) not yet supported.`);
        console.log(`[GanttView] handleTaskDelete: Deletion of ${originalItem.originalType} is not supported.`);
        return false;
      }
    }
    console.log("[GanttView] handleTaskDelete: Deletion cancelled by user.");
    return conf;
  }, [ganttTasks, refetchGanttData, isMutating]); // Added isMutating


  const handleProgressChange = useCallback(async (task: GanttTaskReact) => {
    console.log(`[GanttView] handleProgressChange: Progress changed (Gantt library event): Task ID=${task.id}, New Progress=${task.progress}`);

    if (isMutating) {
        console.warn("[GanttView] handleProgressChange: Mutation already in progress, deferring progress change.");
        return;
    }

    const originalItem = ganttTasks.find(t => t.id === task.id);
    if (!originalItem) { // Check for originalItem, not just type
      console.warn(`[GanttView] handleProgressChange: Original item not found for progress update ID: ${task.id}`);
      return;
    }
    if (originalItem.originalType !== "TASK") {
        console.warn(`[GanttView] handleProgressChange: Item ID ${task.id} is of type "${originalItem.originalType}", not "TASK". Skipping progress update.`);
        return;
    }

    console.log(`[GanttView] handleProgressChange: Original task's progress: ${originalItem.progress}%`);
    console.log(`[GanttView] handleProgressChange: Gantt library's reported new progress: ${task.progress}%`);

    // Only send progress if it's genuinely different from the current state
    // Use Math.round to account for potential floating point inaccuracies from the slider
    const roundedOriginalProgress = Math.round(originalItem.progress || 0);
    const roundedNewProgress = Math.round(task.progress || 0);

    if (roundedOriginalProgress !== roundedNewProgress) {
      try {
        console.log(`[GanttView] handleProgressChange: Detected actual progress change for task (${originalItem.originalTaskId}). Updating from ${roundedOriginalProgress}% to ${roundedNewProgress}%.`);
        await updateGanttTask({
          id: originalItem.originalTaskId,
          type: "TASK",
          progress: roundedNewProgress, // Send rounded value
        });
        console.log("[GanttView] handleProgressChange: Task progress updated successfully. Refetching Gantt data.");
        refetchGanttData();
      } catch (err) {
        console.error("[GanttView] handleProgressChange: Error updating task progress:", err);
      }
    } else {
      console.log(`[GanttView] handleProgressChange: No *significant* progress change detected for task ${task.id} (original=${roundedOriginalProgress}%, new=${roundedNewProgress}%). Skipping update.`);
    }

  }, [ganttTasks, updateGanttTask, refetchGanttData, isMutating]);


  const handleDoubleClick = useCallback((task: GanttTaskReact) => {
    console.log("[GanttView] handleDoubleClick: Task double clicked:", task);
    alert("Double clicked task: " + task.name + " (ID: " + task.id + ")");
  }, []);

  const handleAddTask = useCallback(async (newTaskData: {
    name: string,
    start: Date,
    end: Date,
    progress: number,
    type: "task" | "milestone" | "project",
    sprint: string,
    projectId: string,
    // other fields like description, assigneeId etc.
  }) => {
    console.log("[GanttView] handleAddTask: Attempting to create new Gantt item:", newTaskData);

    if (isMutating) {
        console.warn("[GanttView] handleAddTask: Mutation already in progress, deferring add task.");
        return;
    }

    const input: any = {
      projectId: newTaskData.projectId,
      sprintId: newTaskData.sprint,
      name: newTaskData.name,
      startDate: newTaskData.start.toISOString(),
      endDate: newTaskData.end.toISOString(),
    };

    if (newTaskData.type === "task") {
      input.type = "task";
      input.progress = newTaskData.progress;
    } else if (newTaskData.type === "milestone") {
      input.type = "milestone";
      // Milestones typically use endDate for dueDate, no progress field
      input.endDate = newTaskData.end.toISOString();
    } else {
        console.warn("[GanttView] handleAddTask: Cannot create 'project' type from modal.");
        return;
    }

    try {
        await createGanttTask(input);
        console.log("[GanttView] handleAddTask: New item created successfully. Closing modal and refetching Gantt data.");
        setIsCreateTaskOpen(false);
        refetchGanttData();
    } catch (err) {
        console.error("[GanttView] handleAddTask: Error creating Gantt item:", err);
    }
  }, [createGanttTask, refetchGanttData, isMutating]);


  const handleSprintSelectionChange = useCallback((sprintId: string) => {
    console.log(`[GanttView] handleSprintSelectionChange: Changing selected sprint from "${internalSelectedSprintId}" to "${sprintId || 'All Sprints'}".`);
    setInternalSelectedSprintId(sprintId);
    console.log(`[GanttView] handleSprintSelectionChange: Refetching Gantt data for new sprint selection "${sprintId || 'All Sprints'}".`);
    refetchGanttData();
  }, [internalSelectedSprintId, refetchGanttData]);


  const currentSprintName = useMemo(() => {
    if (sprintFilterOptions.length === 0) {
      return "No Sprints";
    }
    const activeSprintId = internalSelectedSprintId || suggestedDefaultSprintId;
    const foundSprint = sprintFilterOptions.find(s => s.id === activeSprintId);
    return foundSprint?.name || "Select Sprint";
  }, [internalSelectedSprintId, sprintFilterOptions, suggestedDefaultSprintId]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        <p className="ml-4 text-lg text-slate-700">Loading Gantt data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-red-100 text-red-700 p-4">
        <p className="text-lg">Error loading Gantt data: {error.message}</p>
      </div>
    );
  }

  if (mutationError) {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-red-100 text-red-700 p-4">
            <p className="text-lg">Error performing mutation: {mutationError.message}</p>
        </div>
    );
  }


  if (sprintFilterOptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Sprints Found</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          It looks like there are no sprints in this project yet. Create one to get started.
        </p>
        <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isMutating}>
          {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          + Add Task/Milestone
        </Button>
      </div>
    );
  }


  if (!ganttTasks || ganttTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Items in "{currentSprintName}"</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          The selected sprint "{currentSprintName}" has no tasks or milestones. Add a new item!
        </p>
        <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isMutating}>
          {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          + Add Task/Milestone
        </Button>
      </div>
    );
  }


  return (
    <div className="relative px-6">
      <div className="flex items-center gap-3 py-6">
        <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md" disabled={isMutating}>
          {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          + Add item
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent" disabled={isMutating}>
              {currentSprintName} <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            {sprintFilterOptions.map(sprint => (
                <DropdownMenuItem
                    key={sprint.id}
                    onClick={() => handleSprintSelectionChange(sprint.id)}
                    disabled={isMutating}
                >
                    {sprint.name}
                </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex rounded-md shadow-sm ml-4" role="group">
            <Button
                variant={viewMode === ViewMode.Day ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Day)}
                className="rounded-r-none h-9"
                disabled={isMutating}
            >
                Day
            </Button>
            <Button
                variant={viewMode === ViewMode.Week ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Week)}
                className="rounded-none h-9 border-l-0"
                disabled={isMutating}
            >
                Week
            </Button>
            <Button
                variant={viewMode === ViewMode.Month ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Month)}
                className="rounded-none h-9 border-l-0"
                disabled={isMutating}
            >
                Month
            </Button>
            <Button
                variant={viewMode === ViewMode.Year ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Year)}
                className="rounded-l-none h-9 border-l-0"
                disabled={isMutating}
            >
                Year
            </Button>
        </div>


        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." disabled={isMutating} />
        </div>
      </div>

      <div className="overflow-x-auto">
        {isCreateTaskOpen && (
            <RightSideModal onClose={() => setIsCreateTaskOpen(false)}>
                <TaskForm
                    onAddTask={handleAddTask}
                    onClose={() => setIsCreateTaskOpen(false)}
                    availableSprints={sprintFilterOptions}
                    currentProjectId={projectId}
                    isMutating={isMutating}
                />
            </RightSideModal>
        )}

        <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onDelete={handleTaskDelete}
            onProgressChange={handleProgressChange}
            onDoubleClick={handleDoubleClick}
            listCellWidth="200px"
            columnWidth={dynamicColumnWidth}
            readOnly={isMutating}
        />
      </div>
    </div>
  );
};

// RightSideModal component (unchanged)
interface RightSideModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

const RightSideModal: React.FC<RightSideModalProps> = ({ children, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={onClose}></div>
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out transform translate-x-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Create New Task</h2>
                    <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>
                <div className="flex-grow p-4 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};


interface TaskFormProps {
  onAddTask: (task: {
    name: string,
    start: Date,
    end: Date,
    progress: number,
    type: "task" | "milestone" | "project",
    sprint: string,
    projectId: string,
  }) => void;
  onClose: () => void;
  availableSprints: SprintGanttFilterOption[];
  currentProjectId: string;
  isMutating: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, onClose, availableSprints, currentProjectId, isMutating }) => {
  const [name, setName] = useState("");
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(new Date());
  const [progress, setProgress] = useState(0);
  const [type, setType] = useState<"task" | "milestone" | "project">("task");
  const [sprintId, setSprintId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (availableSprints.length > 0 && !sprintId) {
      setSprintId(availableSprints[0].id);
    }
  }, [availableSprints, sprintId]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !start || !end) {
      alert("Please fill in name, start date, and end date.");
      return;
    }

    if (!sprintId && type !== "project") {
        alert("Please select a sprint for tasks and milestones.");
        return;
    }

    const newTaskData = {
      start: start,
      end: end,
      name: name,
      type: type,
      progress: progress,
      sprint: sprintId || '',
      projectId: currentProjectId,
    };

    onAddTask(newTaskData);
    setName("");
    setStart(new Date());
    setEnd(new Date());
    setProgress(0);
    setType("task");
    setSprintId(availableSprints.length > 0 ? availableSprints[0].id : undefined);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="taskName" className="block text-sm font-medium text-gray-700">Name:</label>
          <Input id="taskName" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full" required disabled={isMutating} />
        </div>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date:</label>
          <Input id="startDate" type="date" value={start.toISOString().split('T')[0]} onChange={(e) => setStart(new Date(e.target.value))} className="mt-1 block w-full" required disabled={isMutating} />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date:</label>
          <Input id="endDate" type="date"  value={end.toISOString().split('T')[0]} onChange={(e) => setEnd(new Date(e.target.value))} className="mt-1 block w-full" required disabled={isMutating} />
        </div>
        {type === "task" && (
            <div>
              <label htmlFor="progress" className="block text-sm font-medium text-gray-700">Progress (%):</label>
              <Input id="progress" type="number" value={progress} onChange={(e) => setProgress(Number(e.target.value))} min="0" max="100" className="mt-1 block w-full" disabled={isMutating} />
            </div>
        )}
        <div>
          <label htmlFor="taskType" className="block text-sm font-medium text-gray-700">Type:</label>
          <select id="taskType" value={type} onChange={(e) => setType(e.target.value as "task" | "milestone" | "project")} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" disabled={isMutating}>
            <option value="task">Task</option>
            <option value="milestone">Milestone</option>
          </select>
        </div>
        {type !== "project" && (
            <div>
                <label htmlFor="sprintSelect" className="block text-sm font-medium text-gray-700">Sprint:</label>
                <select
                    id="sprintSelect"
                    value={sprintId || ""}
                    onChange={(e) => setSprintId(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    required
                    disabled={isMutating}
                >
                    <option value="">Select Sprint</option>
                    {availableSprints.map(sprintOption => (
                        <option key={sprintOption.id} value={sprintOption.id}>{sprintOption.name}</option>
                    ))}
                </select>
            </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isMutating}>Cancel</Button>
          <Button type="submit" className="bg-[#4ab5ae] text-white" disabled={isMutating}>
            {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Item
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GanttView;