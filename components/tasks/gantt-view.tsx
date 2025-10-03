// components/tasks/gantt-view.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react"; // Added useCallback
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


interface GanttViewProps {
  projectId: string;
}

// Helper to determine start/end date for a parent sprint based on its children tasks/milestones
// This logic should primarily happen in the backend resolver, but useful for client-side task updates
// Note: This function is not a React component or hook, so it can stay outside
export function getStartEndDateForParent(tasks: CustomGanttTask[], parentId: string) {
  const children = tasks.filter((t) => t.sprint === parentId);
  if (children.length === 0) {
    // If no children, return parent's own dates (from the API)
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
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(undefined);

  // --- USE THE HOOK TO FETCH DATA ---
  const { ganttTasks, sprintFilterOptions, loading, error, refetchGanttData } = useGanttData(projectId, selectedSprintId);
  // ----------------------------------

  // --- ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL ---
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
  // Using useCallback for event handlers passed to child components or props that don't change frequently
  const handleTaskChange = useCallback((task: GanttTaskReact) => {
    // In a real app, this would trigger a GraphQL mutation to update the backend.
    // After the mutation, you'd refetch or update the Apollo cache.
    // For now, we'll just log and suggest refetching.
    console.log("Task changed (client-side mock):", task);
    // Ideally, dispatch a mutation here:
    // `updateTaskMutation({ variables: { id: task.id, startDate: task.start, endDate: task.end, progress: task.progress } })`
    // And then `refetchGanttData()` or manage cache.
    // refetchGanttData(); // Uncomment this line if you want to refetch on every change
  }, []); // Dependencies might include mutation functions if they were defined here

  const handleTaskDelete = useCallback((task: GanttTaskReact) => {
    const conf = window.confirm("Are you sure you want to delete " + task.name + " ?");
    if (conf) {
      // In a real app, this would trigger a GraphQL mutation to delete the backend.
      console.log("Task deleted (client-side mock):", task.id);
      // Ideally, dispatch a mutation here:
      // `deleteTaskMutation({ variables: { id: task.id } })`
      // And then `refetchGanttData()` or manage cache.
      refetchGanttData(); // Refetch to show changes
    }
    return conf;
  }, [refetchGanttData]); // Add refetchGanttData to dependencies if it's stable or memoized

  const handleProgressChange = useCallback((task: GanttTaskReact) => {
    // In a real app, this would trigger a GraphQL mutation to update progress.
    console.log("Progress changed (client-side mock):", task.id, task.progress);
    // refetchGanttData(); // Uncomment this line if you want to refetch on every change
  }, []); // Dependencies might include mutation functions if they were defined here

  const handleDoubleClick = useCallback((task: GanttTaskReact) => {
    alert("Double clicked task: " + task.name + " (ID: " + task.id + ")");
    // Open a detailed view/modal for the task
  }, []);

  // Callback to add a new task from the modal
  const handleAddTask = useCallback((newTaskData: Omit<CustomGanttTask, 'id' | 'start' | 'end'> & { start: Date, end: Date }) => {
    // In a real app, you would dispatch a GraphQL mutation here.
    // The modal's TaskForm gives dates as Date objects. Convert to ISO strings for mutation.
    const mutationVariables = {
      projectId: projectId, // Passed to TaskForm if creating a new task, or can be derived for an existing sprint
      sprintId: newTaskData.sprint,
      name: newTaskData.name,
      description: newTaskData.description,
      startDate: newTaskData.start.toISOString(),
      endDate: newTaskData.end.toISOString(),
      // status, priority, assignee etc. need to be handled
      // For simplicity, this client-side mock just refetches.
    };
    console.log("Attempting to add task (client-side mock):", mutationVariables);
    setIsCreateTaskOpen(false);
    refetchGanttData(); // Refetch to show changes after adding (once backend handles it)
  }, [projectId, refetchGanttData]); // Dependencies might include mutation functions if they were defined here

  // --- Conditional Renders (after all hooks are called) ---
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

  if (!ganttTasks || ganttTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-muted/30 p-8 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">No Gantt Data Found</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl mb-8">
          It looks like there are no tasks or sprints for this project. Start by adding a new task!
        </p>
        <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          + Add Task
        </Button>
      </div>
    );
  }


  return (
    <div className="relative px-6">
      <div className="flex items-center gap-3 py-6">
        <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          + Add task
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">
              {selectedSprintId ? sprintFilterOptions.find(s => s.id === selectedSprintId)?.name : "All Sprints"} <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSelectedSprintId(undefined)}>All Sprints</DropdownMenuItem> {/* Option to view all */}
            <DropdownMenuSeparator />
            {sprintFilterOptions.map(sprint => (
                <DropdownMenuItem key={sprint.id} onClick={() => setSelectedSprintId(sprint.id)}>
                    {sprint.name}
                </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Button Group */}
        <div className="flex rounded-md shadow-sm ml-4" role="group">
            <Button
                variant={viewMode === ViewMode.Day ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Day)}
                className="rounded-r-none h-9"
            >
                Day
            </Button>
            <Button
                variant={viewMode === ViewMode.Week ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Week)}
                className="rounded-none h-9 border-l-0"
            >
                Week
            </Button>
            <Button
                variant={viewMode === ViewMode.Month ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Month)}
                className="rounded-none h-9 border-l-0"
            >
                Month
            </Button>
            <Button
                variant={viewMode === ViewMode.Year ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Year)}
                className="rounded-l-none h-9 border-l-0"
            >
                Year
            </Button>
        </div>


        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." />
        </div>
      </div>

      <div className="overflow-x-auto">
        {isCreateTaskOpen && (
            <RightSideModal onClose={() => setIsCreateTaskOpen(false)}>
                {/* Pass available sprints to TaskForm for selection */}
                <TaskForm onAddTask={handleAddTask} onClose={() => setIsCreateTaskOpen(false)} availableSprints={sprintFilterOptions} currentProjectId={projectId} />
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
  onAddTask: (task: Omit<CustomGanttTask, 'id' | 'start' | 'end'> & { id?: string, start: Date, end: Date }) => void; // Adjusted to allow ID for updates
  onClose: () => void;
  availableSprints: SprintGanttFilterOption[]; // Pass available sprints from hook
  currentProjectId: string; // Pass current project ID for new task creation
}

const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, onClose, availableSprints, currentProjectId }) => {
  const [name, setName] = useState("");
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(new Date());
  const [progress, setProgress] = useState(0);
  const [type, setType] = useState<"task" | "milestone" | "project">("task");
  const [sprintId, setSprintId] = useState<string | undefined>(undefined); // Renamed from 'sprint' to 'sprintId' for clarity

  // Set default sprint if available
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

    const newTaskData: Omit<CustomGanttTask, 'id' | 'start' | 'end'> & { id?: string, start: Date, end: Date } = {
      start: start,
      end: end,
      name: name,
      // id: `client-task-${Date.now()}`, // ID will be generated by backend
      type: type,
      progress: progress,
      // Only set sprintId for tasks/milestones
      sprint: type === "project" ? undefined : sprintId,
      projectId: currentProjectId, // Add projectId to the data sent for creation
      // description, assignee, etc. would also be here
    };

    onAddTask(newTaskData);
    setName("");
    setStart(new Date());
    setEnd(new Date());
    setProgress(0);
    setType("task");
    setSprintId(undefined);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="taskName" className="block text-sm font-medium text-gray-700">Name:</label>
          <Input id="taskName" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full" required />
        </div>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date:</label>
          <Input id="startDate" type="date" value={start.toISOString().split('T')[0]} onChange={(e) => setStart(new Date(e.target.value))} className="mt-1 block w-full" required />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date:</label>
          <Input id="endDate" type="date"  value={end.toISOString().split('T')[0]} onChange={(e) => setEnd(new Date(e.target.value))} className="mt-1 block w-full" required />
        </div>
        <div>
          <label htmlFor="progress" className="block text-sm font-medium text-gray-700">Progress (%):</label>
          <Input id="progress" type="number" value={progress} onChange={(e) => setProgress(Number(e.target.value))} min="0" max="100" className="mt-1 block w-full" />
        </div>
        <div>
          <label htmlFor="taskType" className="block text-sm font-medium text-gray-700">Type:</label>
          <select id="taskType" value={type} onChange={(e) => setType(e.target.value as "task" | "milestone" | "project")} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border">
            <option value="task">Task</option>
            <option value="milestone">Milestone</option>
            <option value="project">Sprint</option>
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
                >
                    <option value="">No Sprint</option>
                    {availableSprints.map(sprintOption => (
                        <option key={sprintOption.id} value={sprintOption.id}>{sprintOption.name}</option>
                    ))}
                </select>
            </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="bg-[#4ab5ae] text-white">Create Task</Button>
        </div>
      </form>
    </div>
  );
};

export default GanttView;