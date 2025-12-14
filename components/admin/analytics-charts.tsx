// components/admin/analytics-charts.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"

interface AnalyticsChartsProps {
  userGrowthData?: {
    date: string
    users?: number | null
    projects?: number | null
    tasks?: number | null
  }[]
  contentCreationData?: {
    date: string
    documents?: number | null
    wireframes?: number | null
    tasks?: number | null
  }[]
}

export function AnalyticsCharts({ userGrowthData, contentCreationData }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Platform Growth Over Time</CardTitle>
          <CardDescription>Monthly growth in users, projects, and tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              users: { label: "Users", color: "hsl(174, 70%, 54%)" },
              projects: { label: "Projects", color: "hsl(210, 25%, 25%)" },
              tasks: { label: "Tasks", color: "hsl(200, 70%, 54%)" },
            }}
            className="h-[350px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} />
                <Line type="monotone" dataKey="projects" stroke="var(--color-projects)" strokeWidth={2} />
                <Line type="monotone" dataKey="tasks" stroke="var(--color-tasks)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Content Creation Trends</CardTitle>
          <CardDescription>Monthly creation of documents, wireframes, and tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              documents: { label: "Documents", color: "hsl(174, 70%, 54%)" },
              wireframes: { label: "Wireframes", color: "hsl(210, 25%, 25%)" },
              tasks: { label: "Tasks", color: "hsl(200, 70%, 54%)" },
            }}
            className="h-[350px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentCreationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="documents" stackId="a" fill="var(--color-documents)" />
                <Bar dataKey="wireframes" stackId="a" fill="var(--color-wireframes)" />
                <Bar dataKey="tasks" stackId="a" fill="var(--color-tasks)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}