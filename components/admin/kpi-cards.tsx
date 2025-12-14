// components/admin/kpi-cards.tsx
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
  DollarSignIcon,
  UserXIcon,
} from "lucide-react"
import type { Icon } from "lucide-react"

type Kpi = {
  value: string
  change: string
  trend: string
}

interface KPICardsProps {
  kpis?: {
    totalUsers: Kpi
    activeWorkspaces: Kpi
    totalProjects: Kpi
    tasksCreated: Kpi
    documents: Kpi
    Whiteboards: Kpi
    monthlyRevenue: Kpi
    churnRate: Kpi
  }
}

const iconMap: { [key: string]: Icon } = {
  totalUsers: UsersIcon,
  activeWorkspaces: BuildingIcon,
  totalProjects: FolderIcon,
  tasksCreated: CheckSquareIcon,
  documents: FileTextIcon,
  Whiteboards: PenToolIcon,
  monthlyRevenue: DollarSignIcon,
  churnRate: UserXIcon,
}

const titleMap: { [key: string]: string } = {
  totalUsers: "Total Users",
  activeWorkspaces: "Active Workspaces",
  totalProjects: "Total Projects",
  tasksCreated: "Tasks Created",
  documents: "Documents",
  Whiteboards: "Whiteboards",
  monthlyRevenue: "Monthly Revenue",
  churnRate: "Churn Rate",
}

export function KPICards({ kpis }: KPICardsProps) {
  if (!kpis) return null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Object.entries(kpis).map(([key, kpi]) => {
        const Icon = iconMap[key]
        return (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{titleMap[key]}</CardTitle>
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p
                className={`text-xs flex items-center ${
                  kpi.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {kpi.trend === "up" ? (
                  <TrendingUpIcon className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDownIcon className="h-3 w-3 mr-1" />
                )}
                {kpi.change} from last month
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}