"use client"

import { useMemo, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight, Circle, CheckCircle2, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

type Priority = "Low" | "Medium" | "High"
type Task = {
  id: string
  title: string
  assignee: string // assignee id
  due: string // YYYY-MM-DD for <input type="date">
  priority: Priority
  points: number
  completed?: boolean
  description?: string
}
type Section = { id: string; title: string; tasks: Task[]; editing?: boolean }

// People directory for assignee dropdown
const ASSIGNEES = [
  { id: "aa", name: "Alice Anderson", initials: "AA" },
  { id: "ff", name: "Farah Farouk", initials: "FF" },
  { id: "jm", name: "Jamal Malik", initials: "JM" },
  { id: "ls", name: "Lina Song", initials: "LS" },
]
function getAssignee(id: string) {
  return ASSIGNEES.find((a) => a.id === id) || { id, name: id.toUpperCase(), initials: id.toUpperCase().slice(0, 2) }
}

const priorityStyles: Record<Priority, string> = {
  Low: "bg-green-100 text-green-700 ring-1 ring-green-200",
  Medium: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  High: "bg-red-100 text-red-700 ring-1 ring-red-200",
}
const priorityDot: Record<Priority, string> = {
  Low: "bg-green-500",
  Medium: "bg-orange-500",
  High: "bg-red-500",
}

// Initial data with ISO dates for date inputs
const initial: Section[] = [
  {
    id: "backlog",
    title: "Backlog",
    tasks: [
      {
        id: "backlog:t1",
        title: "Create a new feed page",
        assignee: "ff",
        due: "2025-05-31",
        priority: "Medium",
        points: 13,
        description: "New social feed page with filters.",
      },
      {
        id: "backlog:t2",
        title: "Create a new card design",
        assignee: "ff",
        due: "2025-05-19",
        priority: "Low",
        points: 3,
        description: "Refine the card layout and interactions.",
      },
    ],
  },
  {
    id: "ready",
    title: "Ready",
    tasks: [
      {
        id: "ready:t3",
        title: "Fix the auth system",
        assignee: "ff",
        due: "2025-08-11",
        priority: "High",
        points: 7,
        description: "Resolve session persistence and refresh flow.",
      },
      {
        id: "ready:t4",
        title: "Create a document system",
        assignee: "aa",
        due: "2025-08-11",
        priority: "High",
        points: 13,
        description: "WYSIWYG editor and PDF export.",
      },
    ],
  },
]

type NewTaskForm = {
  title: string
  assignee: string
  due: string
  priority: Priority
  points: number
}

interface ListViewProps {
  projectId?: string
}

export function ListView({ projectId }: ListViewProps) {
  const [sections, setSections] = useState<Section[]>(initial)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sheetTask, setSheetTask] = useState<{ sectionId: string; taskId: string } | null>(null)

  // per-section "new task" forms below each section
  const [newTaskOpen, setNewTaskOpen] = useState<Record<string, boolean>>({})
  const [newTask, setNewTask] = useState<Record<string, NewTaskForm>>({})

  // aggregate helpers
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])
  const allTaskIds = useMemo(() => sections.flatMap((s) => s.tasks.map((t) => t.id)), [sections])
  const allSelected = selectedCount > 0 && selectedCount === allTaskIds.length

  // sections
  function toggleSection(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }
  function setSectionEditing(id: string, editing: boolean) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, editing } : s)))
  }
  function renameSection(id: string, title: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title, editing: false } : s)))
  }
  function addSection() {
    const id = `sec-${Date.now()}`
    setSections((prev) => [{ id, title: "New Section", tasks: [], editing: true }, ...prev])
    setCollapsed((prev) => ({ ...prev, [id]: false }))
  }

  // tasks
  function toggleTaskCompleted(sectionId: string, taskId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
            }
          : s,
      ),
    )
  }
  function updateTask(sectionId: string, taskId: string, updates: Partial<Task>) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
            }
          : s,
      ),
    )
  }
  function deleteTask(sectionId: string, taskId: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s)),
    )
    setSelected((prev) => {
      const copy = { ...prev }
      delete copy[taskId]
      return copy
    })
  }

  // selection
  function toggleSelect(taskId: string, checked: boolean) {
    setSelected((prev) => ({ ...prev, [taskId]: checked }))
  }
  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelected({})
      return
    }
    const next: Record<string, boolean> = {}
    for (const id of allTaskIds) next[id] = true
    setSelected(next)
  }
  function bulkDeleteSelected() {
    const toDelete = new Set(
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    )
    if (toDelete.size === 0) return
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => !toDelete.has(t.id)),
      })),
    )
    setSelected({})
  }

  // create task form
  function openNewTask(sectionId: string) {
    setNewTaskOpen((p) => ({ ...p, [sectionId]: true }))
    setNewTask((p) => ({
      ...p,
      [sectionId]: p[sectionId] || {
        title: "",
        assignee: ASSIGNEES[0]?.id || "aa",
        due: "",
        priority: "Medium",
        points: 1,
      },
    }))
  }
  function cancelNewTask(sectionId: string) {
    setNewTaskOpen((p) => ({ ...p, [sectionId]: false }))
  }
  function saveNewTask(sectionId: string) {
    const form = newTask[sectionId]
    if (!form) return
    const id = `${sectionId}:${Date.now()}`
    const task: Task = {
      id,
      title: form.title || "Untitled task",
      assignee: form.assignee,
      due: form.due || "",
      priority: form.priority,
      points: Number.isFinite(form.points) ? Math.max(0, Math.floor(form.points)) : 0,
      description: "",
    }
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, tasks: [task, ...s.tasks] } : s)))
    setNewTaskOpen((p) => ({ ...p, [sectionId]: false }))
  }

  // details sheet
  const openSheetFor = (sectionId: string, taskId: string) => setSheetTask({ sectionId, taskId })
  const closeSheet = () => setSheetTask(null)
  const sheetData = useMemo(() => {
    if (!sheetTask) return null
    const s = sections.find((x) => x.id === sheetTask.sectionId)
    const t = s?.tasks.find((x) => x.id === sheetTask.taskId)
    return t ? { sectionId: sheetTask.sectionId, task: t } : null
  }, [sheetTask, sections])

  return (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <Button onClick={addSection} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 rounded-md">
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

      {selectedCount > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
          <div>{selectedCount} selected</div>
          <Button variant="destructive" className="h-8" onClick={bulkDeleteSelected}>
            Delete selected
          </Button>
        </div>
      )}

      {/* Container: border removed to avoid dark outline */}
      <div className="mt-4 w-full rounded-md overflow-x-auto">
        <HeaderRow allSelected={allSelected} onToggleAll={toggleSelectAll} />
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
                    if (e.key === "Enter")
                      renameSection(section.id, (e.target as HTMLInputElement).value.trim() || "Untitled")
                    if (e.key === "Escape") setSectionEditing(section.id, false)
                  }}
                />
              ) : (
                <button
                  className="text-sm font-semibold text-left hover:underline"
                  onClick={() => setSectionEditing(section.id, true)}
                  title="Rename section"
                >
                  {section.title}
                </button>
              )}

              <div className="ml-auto">
                {!newTaskOpen[section.id] && (
                  <Button variant="outline" size="sm" onClick={() => openNewTask(section.id)}>
                    + Add task
                  </Button>
                )}
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
                            value={newTask[section.id]?.assignee || ASSIGNEES[0].id}
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
                              {ASSIGNEES.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
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
                            onValueChange={(v: Priority) =>
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
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
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
          {sheetData && (
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
                      value={sheetData.task.assignee}
                      onValueChange={(v) => updateTask(sheetData.sectionId, sheetData.task.id, { assignee: v })}
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border">
                        {ASSIGNEES.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">{a.initials}</AvatarFallback>
                              </Avatar>
                              {a.name}
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
                      onValueChange={(v: Priority) =>
                        updateTask(sheetData.sectionId, sheetData.task.id, { priority: v })
                      }
                    >
                      <SelectTrigger className="bg-white border-border">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border">
                        {(["Low", "Medium", "High"] as Priority[]).map((p) => (
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
    </div>
  )
}

function HeaderRow({
  allSelected,
  onToggleAll,
}: {
  allSelected: boolean
  onToggleAll: (checked: boolean) => void
}) {
  // Grid: [select][title grows][assignee][due][priority][points][actions] with right-side columns aligned right
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
  )
}

function TaskRow({
  task,
  selected,
  onSelect,
  onToggleCompleted,
  onChange,
  onOpen,
  onDelete,
}: {
  task: Task
  selected: boolean
  onSelect: (checked: boolean) => void
  onToggleCompleted: () => void
  onChange: (updates: Partial<Task>) => void
  onOpen: () => void
  onDelete: () => void
}) {
  const Icon = task.completed ? CheckCircle2 : Circle
  const cellInput =
    "h-8 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:border-0 focus:outline-none text-sm"

  const assignee = getAssignee(task.assignee)

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
        <Select value={task.assignee} onValueChange={(v) => onChange({ assignee: v })}>
          <SelectTrigger className="h-8">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border">
                <AvatarFallback className="text-[10px]">{assignee.initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{assignee.name}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {ASSIGNEES.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Due date picker (right-aligned cell) */}
      <div className="justify-self-end w-[160px]">
        <Input type="date" value={task.due || ""} onChange={(e) => onChange({ due: e.target.value })} className="h-8" />
      </div>

      {/* Priority dropdown with colored chip (right-aligned cell) */}
      <div className="justify-self-end w-[140px]">
        <Select value={task.priority} onValueChange={(v: Priority) => onChange({ priority: v })}>
          <SelectTrigger className="h-8">
            <div
              className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", priorityStyles[task.priority])}
            >
              <span className={cn("mr-2 h-2 w-2 rounded-full", priorityDot[task.priority])} />
              {task.priority}
            </div>
          </SelectTrigger>
          <SelectContent>
            {(["Low", "Medium", "High"] as Priority[]).map((p) => (
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
  )
}
