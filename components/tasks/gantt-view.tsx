// GanttView.tsx
"use client";

import React, { useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
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





// Helper functions (from the code you provided)
export function getStartEndDateForProject(tasks: Task[], projectId: string) {
  const projectTasks = tasks.filter((t) => t.project === projectId);
  if (projectTasks.length === 0) {
    return [new Date(), new Date()]; // Return default dates if no tasks in project
  }
  let start = projectTasks[0].start;
  let end = projectTasks[0].end;

  for (let i = 0; i < projectTasks.length; i++) {
    const task = projectTasks[i];
    if (start.getTime() > task.start.getTime()) {
      start = task.start;
    }
    if (end.getTime() < task.end.getTime()) {
      end = task.end;
    }
  }
  return [start, end];
}

export function initTasks() {
  const currentDate = new Date();
  const tasks: Task[] = [
    // Project 1: "Website Redesign"
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
      name: "Website Redesign",
      id: "Project1",
      progress: 40,
      type: "project",
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
      project: "Project1",
      displayOrder: 2,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 6),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 10),
      name: "Design Mockups",
      id: "Task1-2",
      progress: 75,
      type: "task",
      project: "Project1",
      displayOrder: 3,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 11),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
      name: "Frontend Development",
      id: "Task1-3",
      progress: 20,
      type: "task",
      project: "Project1",
      displayOrder: 4,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
      name: "Design Approval",
      id: "Milestone1",
      progress: 0,
      type: "milestone",
      project: "Project1",
      displayOrder: 5,
    },

    // Project 2: "Mobile App Development"
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 28),
      name: "Mobile App Development",
      id: "Project2",
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
      project: "Project2",
      displayOrder: 7,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 13),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 17),
      name: "Backend API Design",
      id: "Task2-2",
      progress: 30,
      type: "task",
      project: "Project2",
      displayOrder: 8,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22),
      name: "UI/UX Design",
      id: "Task2-3",
      progress: 10,
      type: "task",
      project: "Project2",
      displayOrder: 9,
    },
      {
          start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 28),
          end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 28),
          name: "Beta Release",
          id: "Milestone2",
          progress: 0,
          type: "milestone",
          project: "Project2",
          displayOrder: 10,
      },

    // Project 3: "Marketing Campaign"
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 5), //Spanning into the next month
      name: "Marketing Campaign",
      id: "Project3",
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
      project: "Project3",
      displayOrder: 12,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 25),
      name: "Content Creation",
      id: "Task3-2",
      progress: 80,
      type: "task",
      project: "Project3",
      displayOrder: 13,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 26),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
      name: "Ad Campaign Setup",
      id: "Task3-3",
      progress: 40,
      type: "task",
      project: "Project3",
      displayOrder: 14,
    },
    {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 5),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 5),
      name: "Campaign Launch",
      id: "Milestone3",
      progress: 0,
      type: "milestone",
      project: "Project3",
      displayOrder: 15,
    },
  ];
  return tasks;
}

const GanttView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(initTasks());
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const handleAddTask = (newTask: Task) => {
    if(newTask.type !== "project"){
        //Set project to undefined to allow the user to select a project in form
        newTask.project = undefined
    }
    setTasks([...tasks, newTask]);
    setIsCreateTaskOpen(false);
  };

  const handleTaskChange = (task: Task) => {
    let newTasks = tasks.map(t => (t.id === task.id ? task : t));

    if (task.project) {
      const [start, end] = getStartEndDateForProject(newTasks, task.project);
      const project = newTasks[newTasks.findIndex(t => t.id === task.project)];
      if (
        project.start.getTime() !== start.getTime() ||
        project.end.getTime() !== end.getTime()
      ) {
        const changedProject = { ...project, start, end };
        newTasks = newTasks.map(t =>
          t.id === task.project ? changedProject : t
        );
      }
    }
    setTasks(newTasks);
    console.log("On date change Id:" + task.id);
  };

  const handleTaskDelete = (task: Task) => {
    const conf = window.confirm("Are you sure about " + task.name + " ?");
    if (conf) {
      setTasks(tasks.filter(t => t.id !== task.id));
    }
    return conf;
  };

  const handleProgressChange = (task: Task) => {
    setTasks(tasks.map(t => (t.id === task.id ? task : t)));
    console.log("On progress change Id:" + task.id);
  };

    const handleDoubleClick = (task: Task) => {
        alert("Double clicked task: " + task.name);
    };

  return (
    <div>
      <button onClick={() => setIsCreateTaskOpen(true)}>Add Task</button>
      <div className="flex items-center gap-3">
        <Button onClick={addSection} className="bg-[#4ab5ae] text-white h-9 rounded-md">
          + Add section
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 rounded-md gap-2 bg-transparent">
              Sprint 1 <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sprints</DropdownMenuLabel>
            <DropdownMenuItem>Sprint 1</DropdownMenuItem>
            <DropdownMenuItem>Sprint 2</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Create new sprint</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto relative w-[260px]">
          <Input className="h-9" placeholder="Search tasks..." />
        </div>
      </div>


      {isCreateTaskOpen && (
        <TaskForm onAddTask={handleAddTask} onClose={() => setIsCreateTaskOpen(false)} tasks={tasks} />
      )}

      <Gantt
        tasks={tasks}
        onDateChange={handleTaskChange}
        onDelete={handleTaskDelete}
        onProgressChange={handleProgressChange}
          onDoubleClick={handleDoubleClick}
      />
    </div>
  );
};

interface TaskFormProps {
  onAddTask: (task: Task) => void;
  onClose: () => void;
  tasks: Task[];
}

const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, onClose, tasks }) => {
  const [name, setName] = useState("");
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(new Date());
  const [progress, setProgress] = useState(0);
  const [type, setType] = useState<"task" | "milestone" | "project">("task");
  const [project, setProject] = useState<string | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newTask: Task = {
      start: start,
      end: end,
      name: name,
      id: `Task ${Date.now()}`,
      type: type,
      progress: progress,
        project: type === "project" ? undefined : project, // Assign project, but not for project-type tasks
    };

    onAddTask(newTask);
  };

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "white", padding: "20px", border: "1px solid #ccc" }}>
      <h2>Create New Task</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Start Date:</label>
          <input type="date" value={start.toISOString().split('T')[0]} onChange={(e) => setStart(new Date(e.target.value))} />
        </div>
        <div>
          <label>End Date:</label>
          <input type="date"  value={end.toISOString().split('T')[0]} onChange={(e) => setEnd(new Date(e.target.value))}/>
        </div>
        <div>
          <label>Progress:</label>
          <input type="number" value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
        </div>
        <div>
          <label>Type:</label>
          <select value={type} onChange={(e) => setType(e.target.value as "task" | "milestone" | "project")}>
            <option value="task">Task</option>
            <option value="milestone">Milestone</option>
            <option value="project">Project</option>
          </select>
        </div>
          {type !== "project" && (
              <div>
                  <label>Project:</label>
                  <select
                      value={project || ""}
                      onChange={(e) => setProject(e.target.value)}
                  >
                      <option value="">No Project</option>
                      {tasks.filter(t => t.type === "project").map(projectTask => (
                          <option key={projectTask.id} value={projectTask.id}>{projectTask.name}</option>
                      ))}
                  </select>
              </div>
          )}
        <button type="submit">Create Task</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </form>
    </div>
  );
};

export default GanttView;