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
  priority?: "Low" | "Medium" | "High"
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
  { id: "t-1", title: "Create a new card design", date: "2025-06-19", priority: "Medium" },
  { id: "t-2", title: "This", date: "2025-06-20", priority: "Low" },
  { id: "t-3", title: "Is", date: "2025-06-20", priority: "High" },
  { id: "t-4", title: "Random", date: "2025-06-20", priority: "Low" },
  { id: "t-5", title: "The TASK", date: "2025-06-21", priority: "Medium" },
  { id: "t-6", title: "Random task", date: "2025-06-22", priority: "High" },
  { id: "t-7", title: "Another random task", date: "2025-06-23", priority: "Low" },
  { id: "t-8", title: "Create a new feed page", date: "2025-06-30", priority: "Medium" },
  { id: "t-9", title: "TASK", date: "2025-06-24", priority: "High" },
  { id: "t-10", title: ":D", date: "2025-06-24", priority: "Low" },
  { id: "t-11", title: "Create wireframe system", date: "2025-06-24", priority: "Medium" },
  { id: "t-12", title: "Create the kanban board", date: "2025-06-24", priority: "High" },
  { id: "t-13", title: "Invitation system", date: "2025-06-24", priority: "Low" },
]

interface CalendarViewProps {
  projectId?: string
}

export function CalendarView({ projectId }: CalendarViewProps) {
  const [anchor, setAnchor] = useState<Date>(new Date(2025, 5, 1))
  const [view, setView] = useState<ViewMode>("month")
  const [tasks, setTasks] = useState<Task[]>(seed)
  const [daySheetDate, setDaySheetDate] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const weekDays = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], [])

  function tasksOn(dateISO: string) {
    return tasks.filter((t) => t.date === dateISO)
  }
  function addTask(dateISO: string, title: string, priority: Task["priority"] = "Low") {
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
    <div className="page-scroller p-4">
      {projectId && <div className="mb-4 text-sm text-slate-600">Viewing calendar for Project {projectId}</div>}

      {/* Header with view switcher */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
    <div className="card-surface">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border)" }}>
        {weekDays.map((d) => (
          <div key={d} className="px-3 py-2 text-xs font-medium" style={{ color: "var(--muted-fg)" }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
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
    <div
      ref={setNodeRef}
      className={cn("calendar-cell", borderX, borderY, !inMonth && "outside", isOver && "over")}
      style={{ borderColor: "var(--border)" }}
      onDoubleClick={() => onOpenDaySheet(date)}
    >
      <button
        className="rounded px-1.5 py-0.5 text-xs font-medium hover:bg-slate-100"
        style={{ color: inMonth ? "var(--foreground)" : "var(--slate-400)" }}
        title="Open day"
        onClick={() => onClickDay(date)}
      >
        {date.getDate()}
      </button>
      {isToday && <span className="ml-2 today-badge">Today</span>}

      <div className="mt-2 max-h-[100px] space-y-2 overflow-auto pr-1">
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
    <div className="card-surface">
      {/* Weekday header */}
      <div
        className="grid grid-cols-7 border-b"
        style={{ borderColor: "var(--border)", background: "var(--muted-bg)" }}
      >
        {days.map((d, i) => (
          <div key={i} className="px-3 py-2 text-xs font-medium" style={{ color: "var(--muted-fg)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]} {d.getMonth() + 1}/{d.getDate()}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
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
    <div
      ref={setNodeRef}
      className={cn("p-2 min-h-[320px] border-l transition-colors", isOver && "over")}
      style={{ borderColor: "var(--border)" }}
      onDoubleClick={() => onOpenDaySheet(date)}
    >
      <button
        className="rounded px-1.5 py-0.5 text-xs font-medium hover:bg-slate-100"
        style={{ color: "var(--foreground)" }}
        onClick={() => onClickDay(date)}
        title="Open day"
      >
        {date.getDate()}
      </button>

      <div className="mt-2 max-h-[280px] space-y-2 overflow-auto pr-1">
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
    <div className="card-surface p-4">
      <div className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
        {label}
      </div>

      {/* Quick add for the selected day (top input) */}
      <div className="mb-3 flex items-center gap-2">
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

      <div className="max-h-[520px] overflow-auto pr-1">
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
                      value={t.priority || "Low"}
                      onValueChange={(value) => onUpdate(t.id, { priority: value as Task["priority"] })}
                    >
                      <SelectTrigger
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                        style={{ background: "var(--background)", borderColor: "var(--border)" }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
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

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.7 : 1,
    cursor: "grab",
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="task-pill"
      {...attributes}
      {...listeners}
      title={task.title}
      onDoubleClick={onDoubleClick}
    >
      <Avatar>
        <AvatarFallback>{task.title[0]}</AvatarFallback>
      </Avatar>
      <span className="line-clamp-1">{task.title}</span>
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
                        value={t.priority || "Low"}
                        onValueChange={(value) => onUpdate(t.id, { priority: value as Task["priority"] })}
                      >
                        <SelectTrigger className="h-8 rounded-md border border-border bg-white px-2 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-border">
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
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
