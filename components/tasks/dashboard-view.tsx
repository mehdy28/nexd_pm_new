"use client"

import type React from "react"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BadgeCheck, ListChecks, Clock, Gauge, TrendingUp } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"

type Status = "Backlog" | "Ready" | "In Progress" | "Done"
type Priority = "Low" | "Medium" | "High"

type Task = {
  id: string
  title: string
  status: Status
  priority: Priority
  points: number
  due?: string // ISO
  createdAt: string // ISO
  completedAt?: string // ISO
  projectId?: string
}

// Demo dataset (aligned with your Kanban seeds)
const demoTasks: Task[] = [
  {
    id: "1",
    title: "Create a new feed page",
    status: "Ready",
    priority: "Medium",
    points: 13,
    due: "2025-06-31",
    createdAt: "2025-06-01",
    projectId: "1",
  },
  {
    id: "2",
    title: "Create a new card design",
    status: "Backlog",
    priority: "Low",
    points: 3,
    due: "2025-06-19",
    createdAt: "2025-06-03",
    projectId: "1",
  },
  {
    id: "3",
    title: "Fix the auth system",
    status: "In Progress",
    priority: "High",
    points: 7,
    due: "2025-06-23",
    createdAt: "2025-06-05",
    projectId: "1",
  },
  {
    id: "4",
    title: "Create a document system",
    status: "In Progress",
    priority: "High",
    points: 13,
    due: "2025-06-23",
    createdAt: "2025-06-06",
    projectId: "1",
  },
  {
    id: "5",
    title: "Create wireframe system",
    status: "Ready",
    priority: "High",
    points: 13,
    due: "2025-06-24",
    createdAt: "2025-06-07",
    projectId: "1",
  },
  {
    id: "6",
    title: "Random task",
    status: "Ready",
    priority: "Medium",
    points: 12,
    due: "2025-06-22",
    createdAt: "2025-06-07",
    projectId: "1",
  },
  {
    id: "7",
    title: "Another random task",
    status: "Ready",
    priority: "High",
    points: 3,
    due: "2025-06-23",
    createdAt: "2025-06-09",
    projectId: "1",
  },
  {
    id: "8",
    title: "The TASK",
    status: "In Progress",
    priority: "High",
    points: 8,
    due: "2025-06-21",
    createdAt: "2025-06-10",
    projectId: "1",
  },
  {
    id: "9",
    title: "This",
    status: "Done",
    priority: "High",
    points: 4,
    due: "2025-06-20",
    createdAt: "2025-06-04",
    completedAt: "2025-06-20",
    projectId: "1",
  },
  {
    id: "10",
    title: "Is",
    status: "Done",
    priority: "Medium",
    points: 2,
    due: "2025-06-20",
    createdAt: "2025-06-04",
    completedAt: "2025-06-20",
    projectId: "1",
  },
  {
    id: "11",
    title: "Random",
    status: "Done",
    priority: "Low",
    points: 1,
    due: "2025-06-20",
    createdAt: "2025-06-04",
    completedAt: "2025-06-20",
    projectId: "1",
  },
  {
    id: "12",
    title: "This is done earlier",
    status: "Done",
    priority: "Medium",
    points: 5,
    due: "2025-06-12",
    createdAt: "2025-06-02",
    completedAt: "2025-06-12",
    projectId: "1",
  },
]

interface DashboardViewProps {
  projectId?: string
}

export function DashboardView({ projectId }: DashboardViewProps) {
  // In a real app, supply tasks via props/store. Using demoTasks for now.
  const tasks = useMemo(() => {
    if (!projectId) return demoTasks
    // In real implementation, filter by projectId
    return demoTasks.filter((task) => task.projectId === projectId)
  }, [projectId])

  // KPIs
  const { total, done, inProgress, overdue, velocity, completionRate } = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === "Done").length
    const inProgress = tasks.filter((t) => t.status === "In Progress").length
    const today = new Date()
    const overdue = tasks.filter((t) => {
      const due = parseISO(t.due)
      return due && isBefore(due, today) && t.status !== "Done"
    }).length

    // Velocity: sum of points completed this week
    const start = startOfWeek(today)
    const end = addDays(start, 6)
    const velocity = tasks
      .filter((t) => t.status === "Done" && t.completedAt)
      .filter((t) => {
        const c = parseISO(t.completedAt!)
        return c && !isBefore(c, start) && !isBefore(end, c)
      })
      .reduce((sum, t) => sum + t.points, 0)

    const completionRate = total ? Math.round((done / total) * 100) : 0

    return { total, done, inProgress, overdue, velocity, completionRate }
  }, [tasks])

  // Chart: Tasks by status (bar)
  const statusData = useMemo(() => {
    const by: Record<Status, number> = {
      Backlog: 0,
      Ready: 0,
      "In Progress": 0,
      Done: 0,
    }
    tasks.forEach((t) => (by[t.status] += 1))
    return Object.entries(by).map(([status, count]) => ({ status, count }))
  }, [tasks])

  // Chart: Completed per day this month (line)
  const completedLine = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const days: { day: string; completed: number }[] = []
    for (let d = new Date(monthStart); !isAfter(d, monthEnd); d = addDays(d, 1)) {
      const dayStr = `${d.getMonth() + 1}/${d.getDate()}`
      const count = tasks.filter(
        (t) => t.status === "Done" && t.completedAt && isSameDay(parseISO(t.completedAt!)!, d),
      ).length
      days.push({ day: dayStr, completed: count })
    }
    return days
  }, [tasks])

  // Chart: Priority distribution (pie)
  const priorityPie = useMemo(() => {
    const by: Record<Priority, number> = { Low: 0, Medium: 0, High: 0 }
    tasks.forEach((t) => (by[t.priority] += 1))
    return [
      { name: "High", value: by.High, fill: "var(--color-high)" },
      { name: "Medium", value: by.Medium, fill: "var(--color-medium)" },
      { name: "Low", value: by.Low, fill: "var(--color-low)" },
    ]
  }, [tasks])

  return (
    <div className="page-scroller p-4">
      {projectId && <div className="mb-4 text-sm text-slate-600">Dashboard for Project {projectId}</div>}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Tasks" value={total} icon={<ListChecks className="h-5 w-5 text-emerald-700" />} />
        <KpiCard title="Completed" value={done} icon={<BadgeCheck className="h-5 w-5 text-emerald-700" />} />
        <KpiCard title="In Progress" value={inProgress} icon={<Clock className="h-5 w-5 text-emerald-700" />} />
        <KpiCard title="Velocity (SP/wk)" value={velocity} icon={<Gauge className="h-5 w-5 text-emerald-700" />} />
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Status distribution */}
        <Card className="saas-card overflow-hidden lg:col-span-1">
          <CardHeader>
            <CardTitle>Priority Mix</CardTitle>
            <CardDescription>Distribution of tasks by priority</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] p-2">
            <ChartContainer
              config={{
                high: { label: "High", color: "hsl(var(--chart-1))" },
                medium: { label: "Medium", color: "hsl(var(--chart-2))" },
                low: { label: "Low", color: "hsl(var(--chart-3))" },
              }}
              className="h-full w-full overflow-hidden"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={priorityPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    strokeWidth={2}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Tasks by status */}
        <Card className="saas-card overflow-hidden lg:col-span-1">
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
            <CardDescription>Current pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] p-2">
            <ChartContainer
              config={{
                count: { label: "Tasks", color: "hsl(var(--chart-4))" },
              }}
              className="h-full w-full overflow-hidden"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Completed this month */}
        <Card className="saas-card overflow-hidden lg:col-span-1">
          <CardHeader>
            <CardTitle>Completions (This Month)</CardTitle>
            <CardDescription>Daily completions trend</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] p-2">
            <ChartContainer
              config={{
                completed: { label: "Completed", color: "hsl(var(--chart-5))" },
              }}
              className="h-full w-full overflow-hidden"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completedLine} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="var(--color-completed)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Focus / Quality */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="saas-card overflow-hidden">
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>Done vs total tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-1 flex items-center gap-3">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${Math.min(100, completionPercent(tasks))}%` }}
                />
              </div>
              <div className="w-16 text-right text-sm font-medium">{Math.round(completionPercent(tasks))}%</div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Keep momentum high by clearing blockers on In Progress tasks.</p>
          </CardContent>
        </Card>

        <Card className="saas-card overflow-hidden">
          <CardHeader>
            <CardTitle>Throughput Signal</CardTitle>
            <CardDescription>Recent completions compared week-over-week</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <TrendingUp className="h-9 w-9 text-emerald-700" />
            <div>
              <div className="text-2xl font-semibold">
                {throughputThisWeek(tasks)} <span className="text-base font-normal text-slate-500">tasks</span>
              </div>
              <div className={cn("text-xs", throughputDelta(tasks) >= 0 ? "text-emerald-700" : "text-red-600")}>
                {throughputDelta(tasks) >= 0 ? "+" : ""}
                {throughputDelta(tasks)} vs last week
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon }: { title: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <Card className="saas-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

function parseISO(d?: string) {
  if (!d) return null
  const [y, m, day] = d.split("-").map(Number)
  return new Date(y, (m || 1) - 1, day || 1)
}

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  const w = x.getDay()
  x.setDate(x.getDate() - w)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(date: Date, n: number) {
  const x = new Date(date)
  x.setDate(x.getDate() + n)
  return x
}

function isBefore(a: Date, b: Date) {
  return a.getTime() < b.getTime()
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function isAfter(a: Date, b: Date) {
  return a.getTime() > b.getTime()
}

function completionPercent(tasks: Task[]) {
  const total = tasks.length || 1
  const done = tasks.filter((t) => t.status === "Done").length
  return (done / total) * 100
}

function throughputThisWeek(tasks: Task[]) {
  const start = startOfWeek(new Date())
  const end = addDays(start, 6)
  return tasks
    .filter((t) => t.completedAt)
    .filter((t) => {
      const c = parseISO(t.completedAt!)
      return c && !isAfter(start, c) && !isAfter(c, end)
    }).length
}

function throughputDelta(tasks: Task[]) {
  const thisW = throughputThisWeek(tasks)
  const lastStart = addDays(startOfWeek(new Date()), -7)
  const lastEnd = addDays(lastStart, 6)
  const last = tasks
    .filter((t) => t.completedAt)
    .filter((t) => {
      const c = parseISO(t.completedAt!)
      return c && !isAfter(lastStart, c) && !isAfter(c, lastEnd)
    }).length
  return thisW - last
}
