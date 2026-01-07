"use client"

import { useEffect } from "react"
import { useMemo } from "react"
import { useState } from "react"
import type React from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, CalendarDays, ChevronLeft, Square, Rows3, LayoutGrid } from "lucide-react"
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
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { useDroppable, useDraggable } from "@dnd-kit/core"

type Task = {
  id: string
  title: string
  date: string // ISO yyyy-mm-dd
  priority?: "LOW" | "MEDIUM" | "HIGH"
  completed?: boolean
}

type ViewMode = "day" | "week" | "month"

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function startOfWeek(d: Date) {
  const dd = new Date(d)
  const day = dd.getDay() // 0=Sun
  dd.setDate(dd.getDate() - day)
  dd.setHours(0, 0, 0, 0)
  return dd
}
function addDays(d: Date, n: number) {
  const dd = new Date(d)
  dd.setDate(dd.getDate() + n)
  return dd
}
function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}
function buildMonthMatrix(current: Date) {
  const first = startOfMonth(current)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay()) // back to Sunday
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return { days }
}

const seed: Task[] = [
  { id: "t-1", title: "Create a new card design", date: "2026-06-19", priority: "MEDIUM" },
  { id: "t-2", title: "This", date: "2026-06-06", priority: "LOW" }, // Adjusted date to match image
  { id: "t-3", title: "Is", date: "2026-06-05", priority: "HIGH" }, // Adjusted date to match image
  { id: "t-4", title: "Random", date: "2026-06-20", priority: "LOW" },
  { id: "t-5", title: "The TASK", date: "2026-06-21", priority: "MEDIUM" },
  { id: "t-6", title: "Random task", date: "2026-06-22", priority: "HIGH" },
  { id: "t-7", title: "Another random task", date: "2026-06-23", priority: "LOW" },
  { id: "t-8", title: "Create a new feed page", date: "2026-06-30", priority: "MEDIUM" },
  { id: "t-9", title: "TASK", date: "2026-06-24", priority: "HIGH" },
  { id: "t-10", title: ":D", date: "2026-06-24", priority: "LOW" },
  { id: "t-11", title: "Create Whiteboard system", date: "2026-06-24", priority: "MEDIUM" },
  { id: "t-12", title: "Create the kanban board", date: "2026-06-24", priority: "HIGH" },
  { id: "t-13", title: "Invitation system", date: "2026-06-24", priority: "LOW" },
]

interface CalendarViewProps {
  projectId?: string
}

export function CalendarView({ projectId }: CalendarViewProps) {
  // Use a specific date for initial load that matches the screenshot, e.g., June 2026
  const [anchor, setAnchor] = useState<Date>(new Date(2026, 5, 1)) // June 1, 2026
  const [view, setView] = useState<ViewMode>("month")
  const [tasks, setTasks] = useState<Task[]>(seed)
  const [daySheetDate, setDaySheetDate] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const weekDays = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], [])

  function tasksOn(dateISO: string) {
    return tasks.filter((t) => t.date === dateISO)
  }
  function addTask(dateISO: string, title: string, priority: Task["priority"] = "LOW") {
    const trimmed = title.trim()
    if (!trimmed) return
    setTasks((prev) => [{ id: cryptoId(), title: trimmed, date: dateISO, priority }, ...prev])
  }
  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }
  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function handleDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id)
    const overDate: string | undefined = e.over?.data.current?.date
    if (!overDate) return
    setTasks((prev) => prev.map((t) => (t.id === activeId ? { ...t, date: overDate } : t)))
  }

  const headerLabel = useMemo(() => {
    if (view === "month") return anchor.toLocaleString(undefined, { month: "long", year: "numeric" })
    if (view === "week") {
      const start = startOfWeek(anchor)
      const end = addDays(start, 6)
      const sameMonth = start.getMonth() === end.getMonth()
      const startStr = start.toLocaleString(undefined, { month: "long", day: "numeric" })
      const endStr = sameMonth
        ? end.toLocaleString(undefined, { day: "numeric", year: "numeric" })
        : end.toLocaleString(undefined, { month: "long", day: "numeric", year: "numeric" })
      return `Week of ${startStr} - ${endStr}`
    }
    return anchor.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  }, [anchor, view])

  function goPrev() {
    if (view === "month") setAnchor(addMonths(anchor, -1))
    else if (view === "week") setAnchor(addDays(anchor, -7))
    else setAnchor(addDays(anchor, -1))
  }
  function goNext() {
    if (view === "month") setAnchor(addMonths(anchor, 1))
    else if (view === "week") setAnchor(addDays(anchor, 7))
    else setAnchor(addDays(anchor, 1))
  }
  function goToday() {
    setAnchor(new Date())
  }

  return (
    // Make the entire CalendarView component a flex column that takes the full screen height
    <div className="flex flex-col h-screen p-4">

      {/* Header with view switcher */}
      {/* Make the header shrink-0 so it retains its height */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-slate-600" />
          <div className="text-base font-semibold">{headerLabel}</div>
        </div>

        <div className="flex items-center gap-2">
          {/* View switch */}
          <div className="rounded-md border p-0.5">
            <Button
              size="sm"
              variant={view === "day" ? "default" : "ghost"}
              className={cn("h-8 px-2", view === "day" ? "text-white" : "")}
              style={view === "day" ? { background: "var(--primary)" } : undefined}
              onClick={() => setView("day")}
              title="Day view"
            >
              <Square className="mr-1 h-3.5 w-3.5" />
              Day
            </Button>
            <Button
              size="sm"
              variant={view === "week" ? "default" : "ghost"}
              className={cn("h-8 px-2", view === "week" ? "text-white" : "")}
              style={view === "week" ? { background: "var(--primary)" } : undefined}
              onClick={() => setView("week")}
              title="Week view"
            >
              <Rows3 className="mr-1 h-3.5 w-3.5" />
              Week
            </Button>
            <Button
              size="sm"
              variant={view === "month" ? "default" : "ghost"}
              className={cn("h-8 px-2", view === "month" ? "text-white" : "")}
              style={view === "month" ? { background: "var(--primary)" } : undefined}
              onClick={() => setView("month")}
              title="Month view"
            >
              <LayoutGrid className="mr-1 h-3.5 w-3.5" />
              Month
            </Button>
          </div>

          {/* Nav */}
          <Button variant="outline" className="h-9 bg-transparent" onClick={goPrev} title="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-9 bg-transparent" onClick={goToday} title="Today">
            Today
          </Button>
          <Button variant="outline" className="h-9 bg-transparent" onClick={goNext} title="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Apply styling to a wrapper div, not directly to DndContext */}
      {/* This wrapper ensures the DndContext content fills the remaining vertical space */}
      <div className="flex-grow overflow-hidden">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {view === "month" && (
            <MonthGrid
              anchor={anchor}
              tasks={tasks}
              onClickDay={(d) => {
                setAnchor(d)
                setView("day")
              }}
              onOpenDaySheet={(d) => setDaySheetDate(toISODate(d))}
            />
          )}

          {view === "week" && (
            <WeekGrid
              anchor={anchor}
              tasks={tasks}
              onClickDay={(d) => {
                setAnchor(d)
                setView("day")
              }}
              onOpenDaySheet={(d) => setDaySheetDate(toISODate(d))}
            />
          )}

          {view === "day" && (
            <DayView
              date={anchor}
              tasks={tasksOn(toISODate(anchor))}
              onAdd={(title) => addTask(toISODate(anchor), title)}
              onUpdate={(id, patch) => updateTask(id, patch)}
              onDelete={(id) => deleteTask(id)}
            />
          )}
        </DndContext>
      </div>

      {/* Right sheet for quick add/edit when double-clicking */}
      <DaySheet
        open={!!daySheetDate}
        dateISO={daySheetDate || ""}
        onOpenChange={(o) => !o && setDaySheetDate(null)}
        tasks={daySheetDate ? tasksOn(daySheetDate) : []}
        onAdd={(title) => daySheetDate && addTask(daySheetDate, title)}
        onUpdate={(id, patch) => updateTask(id, patch)}
        onDelete={(id) => deleteTask(id)}
      />
    </div>
  )
}

/* Month View */
function MonthGrid({
  anchor,
  tasks,
  onClickDay,
  onOpenDaySheet,
}: {
  anchor: Date
  tasks: Task[]
  onClickDay: (date: Date) => void
  onOpenDaySheet: (date: Date) => void
}) {
  const { days } = useMemo(() => buildMonthMatrix(anchor), [anchor])
  const month = anchor.getMonth()

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const arr = map.get(t.date) || []
      arr.push(t)
      map.set(t.date, arr)
    }
    return map
  }, [tasks])

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    // Make MonthGrid a flex column that grows to fill available space
    // and hides any overflow that isn't handled by children.
    <div className="card-surface flex flex-col flex-grow overflow-hidden">
      {/* Weekday header - prevent it from shrinking */}
      <div className="grid grid-cols-7 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        {weekDays.map((d) => (
          <div key={d} className="px-3 py-2 text-xs font-medium" style={{ color: "var(--muted-fg)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* The main grid for days: Make it grow, define 6 rows, and allow content to scroll if it exceeds grid height */}
      {/* `grid-rows-6` is key here to distribute height evenly across rows */}
      <div className="grid grid-cols-7 grid-rows-6 flex-grow overflow-auto">
        {days.map((d, i) => {
          const iso = toISODate(d)
          const inMonth = d.getMonth() === month
          const isToday = iso === toISODate(new Date())
          return (
            <MonthCell
              key={iso + i}
              date={d}
              iso={iso}
              inMonth={inMonth}
              isToday={isToday}
              index={i}
              tasks={tasksByDay.get(iso) || []}
              onClickDay={onClickDay}
              onOpenDaySheet={onOpenDaySheet}
            />
          )
        })}
      </div>
    </div>
  )
}

function MonthCell({
  date,
  iso,
  inMonth,
  isToday,
  index,
  tasks,
  onClickDay,
  onOpenDaySheet,
}: {
  date: Date
  iso: string
  inMonth: boolean
  isToday: boolean
  index: number
  tasks: Task[]
  onClickDay: (date: Date) => void
  onOpenDaySheet: (date: Date) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: iso,
    data: { type: "day", date: iso },
  })

  const borderX = index % 7 === 0 ? "border-l-0" : "border-l"
  const borderY = index < 7 ? "border-t-0" : "border-t"

  return (
    // Make each cell a flex column that takes full height of its grid area
    // `h-full` is important here as it works with `grid-rows-6` on the parent
    <div
      ref={setNodeRef}
      className={cn("calendar-cell flex flex-col relative h-full", borderX, borderY, !inMonth && "outside", isOver && "over")}
      style={{ borderColor: "var(--border)" }}
      onDoubleClick={() => onOpenDaySheet(date)}
    >
      <div className="flex items-center flex-shrink-0 px-1.5 py-0.5"> {/* Container for date and today badge */}
        <button
          className="rounded text-xs font-medium hover:bg-slate-100 flex-shrink-0"
          style={{ color: inMonth ? "var(--foreground)" : "var(--slate-400)" }}
          title="Open day"
          onClick={() => onClickDay(date)}
        >
          {date.getDate()}
        </button>
        {isToday && <span className="ml-2 today-badge">Today</span>}
      </div>


      {/* Task list should grow to fill remaining space and be scrollable if needed */}
      <div className="mt-1 space-y-1 overflow-auto pr-1 flex-grow p-1">
        {tasks.map((t) => (
          <DraggableTask key={t.id} task={t} onDoubleClick={() => onOpenDaySheet(date)} />
        ))}
      </div>
    </div>
  )
}

/* Week View */
function WeekGrid({
  anchor,
  tasks,
  onClickDay,
  onOpenDaySheet,
}: {
  anchor: Date
  tasks: Task[]
  onClickDay: (date: Date) => void
  onOpenDaySheet: (date: Date) => void
}) {
  const start = useMemo(() => startOfWeek(anchor), [anchor])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start])

  return (
    // Make WeekGrid a flex column that grows to fill available space
    <div className="card-surface flex flex-col flex-grow overflow-hidden">
      {/* Weekday header - prevent it from shrinking */}
      <div
        className="grid grid-cols-7 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}
      >
        {days.map((d, i) => (
          <div key={i} className="px-3 py-2 text-xs font-medium" style={{ color: "var(--muted-fg)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]} {d.getMonth() + 1}/{d.getDate()}
          </div>
        ))}
      </div>

      {/* The main grid for days: Make it grow and allow content to scroll */}
      <div className="grid grid-cols-7 flex-grow overflow-auto">
        {days.map((d, i) => {
          const iso = toISODate(d)
          const dayTasks = tasks.filter((t) => t.date === iso)
          return (
            <WeekCell
              key={iso}
              date={d}
              iso={iso}
              index={i}
              tasks={dayTasks}
              onClickDay={onClickDay}
              onOpenDaySheet={onOpenDaySheet}
            />
          )
        })}
      </div>
    </div>
  )
}

function WeekCell({
  date,
  iso,
  index,
  tasks,
  onClickDay,
  onOpenDaySheet,
}: {
  date: Date
  iso: string
  index: number
  tasks: Task[]
  onClickDay: (date: Date) => void
  onOpenDaySheet: (date: Date) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: iso,
    data: { type: "day", date: iso },
  })

  return (
    // Make each cell a flex column that takes full height of its grid area.
    // Removed `min-h-[320px]` as it was causing overflow and fights flexbox layout.
    <div
      ref={setNodeRef}
      className={cn("flex flex-col p-2 border-l transition-colors h-full", isOver && "over")}
      style={{ borderColor: "var(--border)" }}
      onDoubleClick={() => onOpenDaySheet(date)}
    >
      {/* Date button should not shrink */}
      <button
        className="rounded px-1.5 py-0.5 text-xs font-medium hover:bg-slate-100 flex-shrink-0"
        style={{ color: "var(--foreground)" }}
        onClick={() => onClickDay(date)}
        title="Open day"
      >
        {date.getDate()}
      </button>

      {/* Task list should grow to fill remaining space and be scrollable if needed */}
      <div className="mt-2 space-y-2 overflow-auto pr-1 flex-grow">
        {tasks.map((t) => (
          <DraggableTask key={t.id} task={t} onDoubleClick={() => onOpenDaySheet(date)} />
        ))}
      </div>
    </div>
  )
}

/* Day View */
function DayView({
  date,
  tasks,
  onAdd,
  onUpdate,
  onDelete,
}: {
  date: Date
  tasks: Task[]
  onAdd: (title: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState("")
  const label = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  function add() {
    const v = title.trim()
    if (!v) return
    onAdd(v)
    setTitle("")
  }

  return (
    // Make DayView a flex column that grows to fill available space
    <div className="card-surface p-4 flex flex-col flex-grow overflow-auto">
      {/* Header text - prevent it from shrinking */}
      <div className="mb-3 text-sm font-semibold flex-shrink-0" style={{ color: "var(--foreground)" }}>
        {label}
      </div>

      {/* Quick add input - prevent it from shrinking */}
      <div className="mb-3 flex items-center gap-2 flex-shrink-0">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task for this day"
          className="h-9"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button className="h-9 text-white" style={{ background: "var(--primary)" }} onClick={add}>
          Add
        </Button>
      </div>

      {/* Task list should grow to fill remaining space and be scrollable if needed */}
      <div className="flex-grow overflow-auto pr-1">
        {tasks.length === 0 ? (
          <div className="text-sm" style={{ color: "var(--muted-fg)" }}>
            No tasks for this day. Use the field above to add one.
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar>
                      <AvatarFallback>{t.title[0]}</AvatarFallback>
                    </Avatar>
                    <span>{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={t.completed}
                      onCheckedChange={(checked) => onUpdate(t.id, { completed: checked })}
                    />
                    <Select
                      value={t.priority || "LOW"}
                      onValueChange={(value) => onUpdate(t.id, { priority: value as Task["priority"] })}
                    >
                      <SelectTrigger
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                        style={{ background: "var(--background)", borderColor: "var(--border)" }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">LOW</SelectItem>
                        <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                        <SelectItem value="HIGH">HIGH</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => onDelete(t.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* Draggable pill (Month/Week) */
function DraggableTask({
  task,
  onDoubleClick,
}: {
  task: Task
  onDoubleClick?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", taskId: task.id },
  })

  const baseStyle: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.7 : 1,
    cursor: "grab",
    // Ensure task-pill does not try to expand beyond its parent's width
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem', // Tailwind's gap-2
    padding: '0.25rem 0.5rem', // Tailwind's px-2 py-1 (adjust as needed)
    borderRadius: '0.375rem', // Tailwind's rounded-md
    overflow: 'hidden', // Ensures content stays within the pill
    whiteSpace: 'nowrap', // Prevents title from wrapping unless explicitly allowed
    textOverflow: 'ellipsis', // Truncates text with ellipsis if it overflows
    fontSize: '0.75rem', // Tailwind's text-xs
  };

  // Specific styles to match the light green pills in the screenshot
  const pillAppearanceStyle: React.CSSProperties = {
    backgroundColor: "rgb(235, 250, 240)", // Light green/cyan background
    borderColor: "rgb(150, 220, 180)",     // Slightly darker border
    borderWidth: '1px',
    borderStyle: 'solid',
    color: "rgb(60, 150, 90)",             // Darker text color
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...baseStyle, ...pillAppearanceStyle }}
      className="task-pill"
      {...attributes}
      {...listeners}
      title={task.title}
      onDoubleClick={onDoubleClick}
    >
      <Avatar className="h-5 w-5 flex-shrink-0"> {/* Smaller avatar */}
        <AvatarFallback className="text-[0.6rem] bg-current text-white rounded-full flex items-center justify-center">
          {task.title[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="line-clamp-1 flex-grow">{task.title}</span> {/* flex-grow to take remaining space */}
    </div>
  )
}

/* Right sheet used when double-clicking a day */
function DaySheet({
  open,
  dateISO,
  onOpenChange,
  tasks,
  onAdd,
  onUpdate,
  onDelete,
}: {
  open: boolean
  dateISO: string
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  onAdd: (title: string) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState("")
  useEffect(() => setTitle(""), [dateISO])

  const dateFmt = new Date(dateISO).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  function add() {
    const v = title.trim()
    if (!v) return
    onAdd(v)
    setTitle("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-white">
        <SheetHeader>
          <SheetTitle className="text-foreground">{dateFmt}</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Double-click days to open this panel. Drag tasks between days.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a task"
              className="h-9 bg-white border-border"
              onKeyDown={(e) => e.key === "Enter" && add()}
              autoFocus
            />
            <Button className="h-9 bg-primary text-white hover:bg-primary/90" onClick={add}>
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No tasks for this date.</div>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className="rounded-md border border-border bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{t.title[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-foreground font-medium">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={t.completed}
                        onCheckedChange={(checked) => onUpdate(t.id, { completed: checked })}
                      />
                      <Select
                        value={t.priority || "LOW"}
                        onValueChange={(value) => onUpdate(t.id, { priority: value as Task["priority"] })}
                      >
                        <SelectTrigger className="h-8 rounded-md border border-border bg-white px-2 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-border">
                          <SelectItem value="LOW">LOW</SelectItem>
                          <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                          <SelectItem value="HIGH">HIGH</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(t.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <SheetFooter className="pt-2">
            <SheetClose asChild>
              <Button type="button" className="bg-primary text-white hover:bg-primary/90">
                Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function cryptoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}