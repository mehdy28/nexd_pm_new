// components/admin/engagement-charts.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"

interface EngagementChartsProps {
  featureAdoptionData?: { name: string; value: number }[]
  topWorkspacesData?: { id: string; name: string; activityCount: number }[]
}

const FEATURE_COLORS = ["#4ecdc4", "#3a4a5c", "#06b6d4", "#f9c80e"]

export function EngagementCharts({ featureAdoptionData, topWorkspacesData }: EngagementChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Feature Adoption</CardTitle>
          <CardDescription>Percentage of active users engaging with key features.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={featureAdoptionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} label={({ name, value }) => `${name} ${value}%`}>
                  {featureAdoptionData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FEATURE_COLORS[index % FEATURE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Most Active Workspaces</CardTitle>
          <CardDescription>Workspaces with the highest activity count this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ activity: { label: "Activity", color: "hsl(174, 70%, 54%)" } }} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topWorkspacesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="activityCount" fill="var(--color-activity)" name="Activity Count" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}