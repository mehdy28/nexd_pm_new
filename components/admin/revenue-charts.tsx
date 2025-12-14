// components/admin/revenue-charts.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"

interface RevenueChartsProps {
  mrrData?: { date: string; value: number }[]
  churnData?: { date: string; value: number }[]
  subscriptionDistributionData?: { name: string; value: number }[]
  revenueByPlanData?: { name: string; value: number }[]
}

const PLAN_COLORS = {
  FREE: "#94a3b8",
  PRO: "#4ecdc4",
  ENTERPRISE: "#06b6d4",
}

export function RevenueCharts({
  mrrData,
  churnData,
  subscriptionDistributionData,
  revenueByPlanData,
}: RevenueChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Recurring Revenue (MRR)</CardTitle>
          <CardDescription>Track revenue growth over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ mrr: { label: "MRR", color: "hsl(174, 70%, 54%)" } }} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => `$${value.toFixed(2)}`} />} />
                <Area type="monotone" dataKey="value" stroke="var(--color-mrr)" fill="var(--color-mrr)" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Churn Rate</CardTitle>
          <CardDescription>Monthly percentage of users who cancel.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ churn: { label: "Churn", color: "hsl(0, 70%, 54%)" } }} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={churnData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value.toFixed(2)}%`} />} />
                <Area type="monotone" dataKey="value" stroke="var(--color-churn)" fill="var(--color-churn)" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Subscription Distribution</CardTitle>
          <CardDescription>User breakdown by subscription plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subscriptionDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {subscriptionDistributionData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PLAN_COLORS[entry.name.toUpperCase() as keyof typeof PLAN_COLORS] || "#3a4a5c"} />
                  ))}
                </Pie>
                <Legend />
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Plan</CardTitle>
          <CardDescription>Revenue contribution from each plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByPlanData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {revenueByPlanData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PLAN_COLORS[entry.name.toUpperCase() as keyof typeof PLAN_COLORS] || "#3a4a5c"} />
                  ))}
                </Pie>
                <Legend />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => `$${value.toFixed(2)}`} />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}