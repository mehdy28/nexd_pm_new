"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, BadgeCheck, ListChecks } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Pie, PieChart, ResponsiveContainer, Legend, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { useMyDashboard } from "@/hooks/personal/useMyDashboard"
import { LoadingPlaceholder, ErrorPlaceholder } from "@/components/placeholders/status-placeholders"

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const chartConfig = {
  value: { label: "Tasks", color: "hsl(var(--chart-1))" },
}

export function MyDashboardView() {
  const { dashboardData, loading, error, refetch } = useMyDashboard()

  if (loading) return <LoadingPlaceholder message="Loading your dashboard..." />
  if (error) return <ErrorPlaceholder error={error} onRetry={refetch} />
  if (!dashboardData) return <div>No data available.</div>

  const { kpis, priorityDistribution, statusDistribution } = dashboardData

  const priorityPieData = priorityDistribution.map((p, index) => ({
    ...p,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }))

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Total Tasks" value={kpis.totalTasks} icon={<ListChecks className="text-muted-foreground" />} />
        <KpiCard
          title="Completed"
          value={kpis.completedTasks}
          icon={<BadgeCheck className="text-muted-foreground" />}
        />
        <KpiCard
          title="Overdue Tasks"
          value={kpis.overdueTasks}
          icon={<AlertCircle className="text-muted-foreground" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionChartCard
          title="My Task Priorities"
          description="Distribution of your personal tasks by priority"
          data={priorityPieData}
        />
        <BarDistributionChartCard
          title="My Tasks by Status"
          description="Current status of your personal tasks"
          data={statusDistribution}
          dataKey="value"
        />
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon }: { title: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function DistributionChartCard({
  title,
  description,
  data,
}: {
  title: string
  description: string
  data: any[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] p-2 flex items-center justify-center">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function BarDistributionChartCard({
  title,
  description,
  data,
  dataKey,
  xAxisKey = "name",
}: {
  title: string
  description: string
  data: any[]
  dataKey: string
  xAxisKey?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] p-2">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} interval={0} />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey={dataKey} fill="var(--color-value)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}