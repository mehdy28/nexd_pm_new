"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"

const userGrowthData = [
  { month: "Jan", users: 1200, projects: 2400, tasks: 8900 },
  { month: "Feb", users: 1350, projects: 2800, tasks: 9800 },
  { month: "Mar", users: 1580, projects: 3200, tasks: 11200 },
  { month: "Apr", users: 1820, projects: 3800, tasks: 13500 },
  { month: "May", users: 2100, projects: 4500, tasks: 16800 },
  { month: "Jun", users: 2450, projects: 5200, tasks: 19200 },
  { month: "Jul", users: 2847, projects: 5678, tasks: 23456 },
]

const subscriptionData = [
  { name: "Free", value: 1200, color: "#94a3b8" },
  { name: "Pro", value: 980, color: "#4ecdc4" },
  { name: "Team", value: 450, color: "#3a4a5c" },
  { name: "Enterprise", value: 217, color: "#06b6d4" },
]

const projectsVsWorkspacesData = [
  { name: "Jan", projects: 2400, workspaces: 800 },
  { name: "Feb", projects: 2800, workspaces: 950 },
  { name: "Mar", projects: 3200, workspaces: 1100 },
  { name: "Apr", projects: 3800, workspaces: 1180 },
  { name: "May", projects: 4500, workspaces: 1200 },
  { name: "Jun", projects: 5200, workspaces: 1220 },
  { name: "Jul", projects: 5678, workspaces: 1234 },
]

const contentCreationData = [
  { month: "Jan", documents: 2100, wireframes: 800, tasks: 8900 },
  { month: "Feb", documents: 2800, wireframes: 1200, tasks: 9800 },
  { month: "Mar", documents: 3500, wireframes: 1600, tasks: 11200 },
  { month: "Apr", documents: 4200, wireframes: 2100, tasks: 13500 },
  { month: "May", documents: 5800, wireframes: 2600, tasks: 16800 },
  { month: "Jun", documents: 7200, wireframes: 3100, tasks: 19200 },
  { month: "Jul", documents: 8901, wireframes: 3456, tasks: 23456 },
]

export function AnalyticsCharts() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>User Growth Over Time</CardTitle>
          <CardDescription>Monthly growth in users, projects, and tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              users: { label: "Users", color: "hsl(174, 70%, 54%)" },
              projects: { label: "Projects", color: "hsl(210, 25%, 25%)" },
              tasks: { label: "Tasks", color: "hsl(200, 70%, 54%)" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
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

      <Card>
        <CardHeader>
          <CardTitle>Subscription Distribution</CardTitle>
          <CardDescription>Current subscription plan breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              free: { label: "Free", color: "#94a3b8" },
              pro: { label: "Pro", color: "#4ecdc4" },
              team: { label: "Team", color: "#3a4a5c" },
              enterprise: { label: "Enterprise", color: "#06b6d4" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {subscriptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects vs Workspaces</CardTitle>
          <CardDescription>Relationship between projects and workspaces</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              projects: { label: "Projects", color: "hsl(174, 70%, 54%)" },
              workspaces: { label: "Workspaces", color: "hsl(210, 25%, 25%)" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectsVsWorkspacesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="projects" fill="var(--color-projects)" />
                <Bar dataKey="workspaces" fill="var(--color-workspaces)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="col-span-2">
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
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentCreationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="documents" fill="var(--color-documents)" />
                <Bar dataKey="wireframes" fill="var(--color-wireframes)" />
                <Bar dataKey="tasks" fill="var(--color-tasks)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
