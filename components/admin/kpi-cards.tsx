"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  FolderIcon,
  FileTextIcon,
  PenToolIcon,
  CheckSquareIcon,
  BuildingIcon,
} from "lucide-react"

const kpis = [
  {
    title: "Total Users",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: UsersIcon,
  },
  {
    title: "Active Workspaces",
    value: "1,234",
    change: "+8.2%",
    trend: "up",
    icon: BuildingIcon,
  },
  {
    title: "Total Projects",
    value: "5,678",
    change: "+15.3%",
    trend: "up",
    icon: FolderIcon,
  },
  {
    title: "Tasks Created",
    value: "23,456",
    change: "+22.1%",
    trend: "up",
    icon: CheckSquareIcon,
  },
  {
    title: "Documents",
    value: "8,901",
    change: "+18.7%",
    trend: "up",
    icon: FileTextIcon,
  },
  {
    title: "Wireframes",
    value: "3,456",
    change: "+25.4%",
    trend: "up",
    icon: PenToolIcon,
  },
  {
    title: "Monthly Revenue",
    value: "$45,678",
    change: "+9.8%",
    trend: "up",
    icon: TrendingUpIcon,
  },
  {
    title: "Churn Rate",
    value: "2.3%",
    change: "-0.5%",
    trend: "down",
    icon: TrendingDownIcon,
  },
]

export function KPICards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className={`text-xs flex items-center ${kpi.trend === "up" ? "text-green-600" : "text-red-600"}`}>
              {kpi.trend === "up" ? (
                <TrendingUpIcon className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDownIcon className="h-3 w-3 mr-1" />
              )}
              {kpi.change} from last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
