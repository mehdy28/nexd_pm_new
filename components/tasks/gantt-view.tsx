"use client";

import React, { useState, useMemo } from "react";
import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

// 1. UPDATED: Task interface - Removed 'dependencies'
interface Task extends GanttTask {
    sprint?: string; // Changed 'project' to 'sprint'
}

// Helper functions (mostly unchanged, adjusted for 'sprint')
export function getStartEndDateForSprint(tasks: Task[], sprintId: string) {
  const sprintTasks = tasks.filter((t) => t.sprint === sprintId); // Changed 'project' to 'sprint'
  if (sprintTasks.length === 0) {
    return [new Date(), new Date()];
  }
  let start = sprintTasks[0].start;
  let end = sprintTasks[0].end;

  for (let i = 0; i < sprintTasks.length; i++) {
    const task = sprintTasks[i];
    if (start.getTime() > task.start.getTime()) {
      start = task.start;
    }
    if (end.getTime() < task.end.getTime()) {
      end = task.end;
    }
  }
  return [start, end];
}

export function initTasks(): Task[] {
  const currentDate = new Date();
  const tasks: Task[] = [
    // Sprint 1: "Website Redesign"
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
      name: "Website Redesign",
      id: "Sprint1", // Changed to Sprint ID
      progress: 40,
      type: "project", // Still type 'project' for Gantt library to treat as parent
      hideChildren: false,
      displayOrder: 1,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
      name: "Content Audit",
      id: "Task1-1",
      progress: 100,
      type: "task",
      sprint: "Sprint1", // Changed 'project' to 'sprint'
      displayOrder: 2,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 6),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 10),
      name: "Design Mockups",
      id: "Task1-2",
      progress: 75,
      type: "task",
      sprint: "Sprint1",
      displayOrder: 3,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 11),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
      name: "Frontend Development",
      id: "Task1-3",
      progress: 20,
      type: "task",
      sprint: "Sprint1",
      displayOrder: 4,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
      name: "Design Approval",
      id: "Milestone1",
      progress: 0,
      type: "milestone",
      sprint: "Sprint1",
      displayOrder: 5,
    },

    // Sprint 2: "Mobile App Development"
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 28),
      name: "Mobile App Development",
      id: "Sprint2", // Changed to Sprint ID
      progress: 10,
      type: "project",
      hideChildren: false,
      displayOrder: 6,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 12),
      name: "Requirements Analysis",
      id: "Task2-1",
      progress: 90,
      type: "task",
      sprint: "Sprint2",
      displayOrder: 7,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 13),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 17),
      name: "Backend API Design",
      id: "Task2-2",
      progress: 30,
      type: "task",
      sprint: "Sprint2",
      displayOrder: 8,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22),
      name: "UI/UX Design",
      id: "Task2-3",
      progress: 10,
      type: "task",
      sprint: "Sprint2",
      displayOrder: 9,
    },
      {
          start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 28),
          end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 28),
          name: "Beta Release",
          id: "Milestone2",
          progress: 0,
          type: "milestone",
          sprint: "Sprint2",
          displayOrder: 10,
      },

    // Sprint 3: "Marketing Campaign"
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 5),
      name: "Marketing Campaign",
      id: "Sprint3", // Changed to Sprint ID
      progress: 60,
      type: "project",
      hideChildren: false,
      displayOrder: 11,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 19),
      name: "Market Research",
      id: "Task3-1",
      progress: 100,
      type: "task",
      sprint: "Sprint3",
      displayOrder: 12,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 25),
      name: "Content Creation",
      id: "Task3-2",
      progress: 80,
      type: "task",
      sprint: "Sprint3",
      displayOrder: 13,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 26),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
      name: "Ad Campaign Setup",
      id: "Task3-3",
      progress: 40,
      type: "task",
      sprint: "Sprint3",
      displayOrder: 14,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 5),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 5),
      name: "Campaign Launch",
      id: "Milestone3",
      progress: 0,
      type: "milestone",
      sprint: "Sprint3",
      displayOrder: 15,
    },
  ];
  return tasks;
}

const GanttView: React.FC = () => {
  const [allTasks, setAllTasks] = useState<Task[]>(initTasks()); // Renamed for clarity
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  // NEW: State for selected sprint
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>("Sprint1"); // Default to Sprint1

  // Filter tasks based on selected sprint
  const filteredTasks = useMemo(() => {
    if (!selectedSprintId) {
      // If no sprint is selected, show only top-level sprints
      return allTasks.filter(task => task.type === "project");
    }
    // Get the selected sprint itself
    const sprint = allTasks.find(task => task.id === selectedSprintId);
    if (!sprint) return []; // Should not happen if selectedSprintId is valid

    // Filter tasks: include the selected sprint (project type) and its direct children
    return allTasks.filter(task =>
      task.id === selectedSprintId || task.sprint === selectedSprintId
    );
  }, [allTasks, selectedSprintId]);

  // Derive available sprints for the dropdown
  const availableSprints = useMemo(() => {
    return allTasks.filter(task => task.type === "project");
  }, [allTasks]);

  const dynamicColumnWidth = useMemo(() => {
    switch (viewMode) {
      case ViewMode.Day: return 150;
      case ViewMode.Week: return 250;
      case ViewMode.Month: return 300;
      case ViewMode.Year: return 500;
      default: return 150;
    }
  }, [viewMode]);

  const handleAddTask = (newTask: Task) => {
    if(newTask.type !== "project"){
        newTask.sprint = newTask.sprint || undefined; // Changed 'project' to 'sprint'
    } else {
        // Top-level "sprint" tasks (type: "project") don't have a 'sprint' property
        newTask.sprint = undefined;
    }
    setAllTasks([...allTasks, newTask]);
    setIsCreateTaskOpen(false);
  };

  const handleTaskChange = (task: Task) => {
    let newTasks = allTasks.map(t => (t.id === task.id ? task : t));

    // If task has a sprint, update the sprint's dates if necessary
    if (task.sprint) {
      const [start, end] = getStartEndDateForSprint(newTasks, task.sprint); // Changed to getStartEndDateForSprint
      const sprintParent = newTasks[newTasks.findIndex(t => t.id === task.sprint)];
      if (
        sprintParent.start.getTime() !== start.getTime() ||
        sprintParent.end.getTime() !== end.getTime()
      ) {
        const changedSprint = { ...sprintParent, start, end };
        newTasks = newTasks.map(t =>
          t.id === task.sprint ? changedSprint : t
        );
      }
    }
    setAllTasks(newTasks);
    console.log("On date change Id:" + task.id);
  };

  const handleTaskDelete = (task: Task) => {
    const conf = window.confirm("Are you sure about " + task.name + " ?");
    if (conf) {
        // If a sprint is deleted, delete all its child tasks too
        if (task.type === "project") { // 'project' type is now 'sprint' parent
            setAllTasks(allTasks.filter(t => t.id !== task.id && t.sprint !== task.id));
        } else {
            setAllTasks(allTasks.filter(t => t.id !== task.id));
        }
    }
    return conf;
  };

  const handleProgressChange = (task: Task) => {
    setAllTasks(allTasks.map(t => (t.id === task.id ? task : t)));
    console.log("On progress change Id:" + task.id);
  };

  const handleDoubleClick = (task: Task) => {
    alert("Double clicked task: " + task.name);
  };

  return (
    <div className="relative px-6">

      <div className="flex items-center gap-3 py-6">
      <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-[#4ab5ae] text-white h-9 rounded-md">
        + Add task
      </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">
              {selectedSprintId ? availableSprints.find(s => s.id === selectedSprintId)?.name : "All Sprints"} <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSelectedSprintId(null)}>All Sprints</DropdownMenuItem> {/* Option to view all */}
            <DropdownMenuSeparator />
            {availableSprints.map(sprint => (
                <DropdownMenuItem key={sprint.id} onClick={() => setSelectedSprintId(sprint.id)}>
                    {sprint.name}
                </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Button Group - QuarterYear removed */}
        <div className="flex rounded-md shadow-sm ml-4" role="group">
            <Button
                variant={viewMode === ViewMode.Day ? "default" : "outline"}
                onClick={() => setViewMode(ViewMode.Day)}
                className="rounded-r-none h-9" // Changed to rounded-r-none for first button
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
                className="rounded-l-none h-9 border-l-0" // Changed to rounded-l-none for last button
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
                {/* Pass allTasks to TaskForm so it can select sprints */}
                <TaskForm onAddTask={handleAddTask} onClose={() => setIsCreateTaskOpen(false)} allTasks={allTasks} />
            </RightSideModal>
        )}

        <Gantt
            tasks={filteredTasks} 
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
  onAddTask: (task: Task) => void;
  onClose: () => void;
  allTasks: Task[];
}

const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, onClose, allTasks }) => {
  const [name, setName] = useState("");
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(new Date());
  const [progress, setProgress] = useState(0);
  const [type, setType] = useState<"task" | "milestone" | "project">("task"); // 'project' type for sprints
  const [sprint, setSprint] = useState<string | undefined>(undefined); // Changed 'project' to 'sprint'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newTask: Task = {
      start: start,
      end: end,
      name: name,
      id: `Task ${Date.now()}`,
      type: type,
      progress: progress,
      sprint: type === "project" ? undefined : sprint, // Set sprint for tasks/milestones, not for top-level sprints
    };

    onAddTask(newTask);
    setName("");
    setStart(new Date());
    setEnd(new Date());
    setProgress(0);
    setType("task");
    setSprint(undefined);
  };

  // Filter for available sprints
  const availableSprintsForSelection = allTasks.filter(t => t.type === "project");

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
            <option value="project">Sprint</option> {/* Changed text from Project to Sprint */}
          </select>
        </div>
        {type !== "project" && ( // Only show sprint selection if it's a task or milestone
            <div>
                <label htmlFor="sprintSelect" className="block text-sm font-medium text-gray-700">Sprint:</label>
                <select
                    id="sprintSelect"
                    value={sprint || ""}
                    onChange={(e) => setSprint(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                >
                    <option value="">No Sprint</option>
                    {availableSprintsForSelection.map(sprintTask => (
                        <option key={sprintTask.id} value={sprintTask.id}>{sprintTask.name}</option>
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