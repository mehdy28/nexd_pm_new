// components/admin/admin-dashboard.tsx
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KPICards } from "./kpi-cards"
import { AnalyticsCharts } from "./analytics-charts"
import { RecentActivity } from "./recent-activity"
import { useAdminDashboard } from "@/hooks/use-admin-dashboard"
import { RevenueCharts } from "./revenue-charts"
import { Skeleton } from "../ui/skeleton"
import { EngagementCharts } from "./engagement-charts"


export function AdminDashboard() {
  const { data, loading, error } = useAdminDashboard("30d")

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">Error loading dashboard data: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 pt-0 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600">Monitor your SaaS performance and key metrics</p>
        </div>

        <KPICards kpis={data?.kpis} />

        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics">Growth Analytics</TabsTrigger>
            <TabsTrigger value="revenue">Revenue & Subscriptions</TabsTrigger>
            <TabsTrigger value="engagement">User Engagement</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsCharts
              userGrowthData={data?.userGrowth}
              contentCreationData={data?.contentCreation}
            />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <RevenueCharts
              mrrData={data?.mrrGrowth}
              churnData={data?.churnRate}
              subscriptionDistributionData={data?.subscriptionDistribution}
              revenueByPlanData={data?.revenueByPlan}
            />
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <EngagementCharts
              featureAdoptionData={data?.featureAdoption}
              topWorkspacesData={data?.topWorkspaces}
            />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <RecentActivity activities={data?.recentActivities} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}