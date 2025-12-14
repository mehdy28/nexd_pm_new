// graphql/resolvers/admin.ts

import { GraphQLError } from "graphql"
import { subDays, startOfDay, subMonths, format } from "date-fns"
import { prisma } from "@/lib/prisma"

interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

// --- Helper Functions ---

/**
 * Calculates start and previous start dates based on a timeframe string.
 * @param timeframe - e.g., "30d", "90d", "1y"
 * @returns An object with startDate and previousStartDate.
 */
const getDatesFromTimeframe = (timeframe: string) => {
  const now = new Date()
  let days: number
  switch (timeframe) {
    case "90d":
      days = 90
      break
    case "1y":
      days = 365
      break
    case "30d":
    default:
      days = 30
      break
  }
  const startDate = startOfDay(subDays(now, days))
  const previousStartDate = startOfDay(subDays(startDate, days))
  return { startDate, previousStartDate, now }
}

/**
 * Calculates the percentage change between two values.
 * @returns A string representing the change, e.g., "+12.5%".
 */
const calculatePercentageChange = (current: number, previous: number): { change: string; trend: "up" | "down" } => {
  if (previous === 0) {
    return { change: current > 0 ? "+100%" : "+0%", trend: "up" }
  }
  const change = ((current - previous) / previous) * 100
  const trend = change >= 0 ? "up" : "down"
  const changeString = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
  return { change: changeString, trend }
}

/**
 * Maps a plan enum to a monthly price.
 * NOTE: These are assumptions. Adjust to your actual pricing.
 */
const getPlanPrice = (plan: "FREE" | "PRO" | "ENTERPRISE"): number => {
  switch (plan) {
    case "PRO":
      return 25
    case "ENTERPRISE":
      return 100 // Example price
    case "FREE":
    default:
      return 0
  }
}

// --- Main Resolver ---

export const adminResolvers = {
  Query: {
    adminGetDashboardData: async (_: any, { timeframe = "30d" }: { timeframe?: string }, context: GraphQLContext) => {
      // 1. Authentication and Authorization
      if (!context.user) {
        throw new GraphQLError("You must be logged in to perform this action.", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      if (context.user.role !== "ADMIN") {
        throw new GraphQLError("You are not authorized to access this resource.", {
          extensions: { code: "FORBIDDEN" },
        })
      }

      const { startDate, previousStartDate, now } = getDatesFromTimeframe(timeframe)

      // 2. Fetch all data concurrently
      const [
        totalUserCount,
        prevUserCount,
        totalWorkspaceCount,
        prevWorkspaceCount,
        totalProjectCount,
        prevProjectCount,
        totalTaskCount,
        prevTaskCount,
        totalDocumentCount,
        prevDocumentCount,
        totalWhiteboardCount,
        prevWhiteboardCount,
        activeSubscriptions,
        recentActivities,
        subscriptionDistribution,
        allUsers,
        allProjects,
        allTasks,
        allDocuments,
        allWhiteboards,
        topWorkspaceActivity,
      ] = await Promise.all([
        // KPI Counts
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { lt: startDate } } }),
        prisma.workspace.count(),
        prisma.workspace.count({ where: { createdAt: { lt: startDate } } }),
        prisma.project.count(),
        prisma.project.count({ where: { createdAt: { lt: startDate } } }),
        prisma.task.count(),
        prisma.task.count({ where: { createdAt: { lt: startDate } } }),
        prisma.document.count(),
        prisma.document.count({ where: { createdAt: { lt: startDate } } }),
        prisma.whiteboard.count(),
        prisma.whiteboard.count({ where: { createdAt: { lt: startDate } } }),
        // Subscription & Revenue Data
        prisma.subscription.findMany({ where: { status: "ACTIVE" } }),
        // Activity Log
        prisma.auditLog.findMany({
          take: 7,
          orderBy: { createdAt: "desc" },
          include: { user: true },
        }),
        // Distribution Charts
        prisma.subscription.groupBy({
          by: ["plan"],
          _count: { plan: true },
          where: { status: "ACTIVE" },
        }),
        // Time Series Data (fetching all records in range for JS processing)
        prisma.user.findMany({ where: { createdAt: { gte: startDate } } }),
        prisma.project.findMany({ where: { createdAt: { gte: startDate } } }),
        prisma.task.findMany({ where: { createdAt: { gte: startDate } } }),
        prisma.document.findMany({ where: { createdAt: { gte: startDate } } }),
        prisma.whiteboard.findMany({ where: { createdAt: { gte: startDate } } }),
        // Top Workspaces - CORRECTED QUERY
        prisma.auditLog.groupBy({
          by: ["workspaceId"],
          _count: { id: true }, // Count by a specific field, 'id' is reliable
          where: { createdAt: { gte: startDate } },
          orderBy: { _count: { id: "desc" } }, // Order by the count of that same field
          take: 10,
        }),
      ])

      // 3. Process Fetched Data
      // 3.1 KPIs
      const mrr = activeSubscriptions.reduce((acc, sub) => acc + getPlanPrice(sub.plan), 0)
      // NOTE: Previous MRR and churn are simplified here. A real implementation
      // would use a ledger or historical subscription data.
      const prevMrr = mrr / 1.08 // Simulate 8% growth for demo
      const churn = 2.3 // Hardcoded churn for demo
      const prevChurn = 2.8

      const kpis = {
        totalUsers: { value: totalUserCount.toLocaleString(), ...calculatePercentageChange(totalUserCount, prevUserCount) },
        activeWorkspaces: { value: totalWorkspaceCount.toLocaleString(), ...calculatePercentageChange(totalWorkspaceCount, prevWorkspaceCount) },
        totalProjects: { value: totalProjectCount.toLocaleString(), ...calculatePercentageChange(totalProjectCount, prevProjectCount) },
        tasksCreated: { value: totalTaskCount.toLocaleString(), ...calculatePercentageChange(totalTaskCount, prevTaskCount) },
        documents: { value: totalDocumentCount.toLocaleString(), ...calculatePercentageChange(totalDocumentCount, prevDocumentCount) },
        Whiteboards: { value: totalWhiteboardCount.toLocaleString(), ...calculatePercentageChange(totalWhiteboardCount, prevWhiteboardCount) },
        monthlyRevenue: { value: `$${mrr.toLocaleString()}`, ...calculatePercentageChange(mrr, prevMrr) },
        churnRate: { value: `${churn}%`, ...calculatePercentageChange(churn, prevChurn) },
      }

      // 3.2 Time Series Charts (Processing in JS)
      const timeSeries: { [key: string]: { users: number; projects: number; tasks: number; documents: number; Whiteboards: number } } = {}
      for (let i = 0; i <= 30; i++) {
        const date = format(subDays(now, 30 - i), "MMM d")
        timeSeries[date] = { users: 0, projects: 0, tasks: 0, documents: 0, Whiteboards: 0 }
      }

      allUsers.forEach(u => { const d = format(u.createdAt, "MMM d"); if(timeSeries[d]) timeSeries[d].users++ })
      allProjects.forEach(p => { const d = format(p.createdAt, "MMM d"); if(timeSeries[d]) timeSeries[d].projects++ })
      allTasks.forEach(t => { const d = format(t.createdAt, "MMM d"); if(timeSeries[d]) timeSeries[d].tasks++ })
      allDocuments.forEach(doc => { const date = format(doc.createdAt, "MMM d"); if(timeSeries[date]) timeSeries[date].documents++ })
      allWhiteboards.forEach(w => { const d = format(w.createdAt, "MMM d"); if(timeSeries[d]) timeSeries[d].Whiteboards++ })
      
      const chartData = Object.entries(timeSeries).map(([date, values]) => ({ date, ...values }))

      const userGrowth = chartData.map(d => ({ date: d.date, users: d.users, projects: d.projects, tasks: d.tasks }))
      const contentCreation = chartData.map(d => ({ date: d.date, documents: d.documents, Whiteboards: d.Whiteboards, tasks: d.tasks }))

      // 3.3 Distribution Charts
      const formattedSubDistribution = subscriptionDistribution.map(group => ({
        name: group.plan,
        value: group._count.plan,
      }))

      const revenueByPlan = subscriptionDistribution.map(group => ({
        name: group.plan,
        value: group._count.plan * getPlanPrice(group.plan),
      }))

      // 3.4 Top Workspaces
      const workspaceIds = topWorkspaceActivity.map(w => w.workspaceId)
      const workspaceDetails = await prisma.workspace.findMany({
        where: { id: { in: workspaceIds } },
        select: { id: true, name: true },
      })
      const workspaceMap = new Map(workspaceDetails.map(w => [w.id, w.name]))

      const topWorkspaces = topWorkspaceActivity.map(activity => ({
        id: activity.workspaceId,
        name: workspaceMap.get(activity.workspaceId) || "Unknown Workspace",
        activityCount: activity._count.id, // Use the count of the specific field
      }))

      // 3.5 Mocked Data (for features not easily trackable with current schema)
      const mrrGrowth = userGrowth.map((d, i) => ({
        date: d.date,
        value: prevMrr + (mrr - prevMrr) * (i / 30) * (1 + Math.sin(i) * 0.1),
      }))
      const churnRateData = userGrowth.map((d, i) => ({
        date: d.date,
        value: prevChurn + (churn - prevChurn) * (i / 30) * (1 + Math.sin(i * 0.5) * 0.1),
      }))
      const featureAdoption = [
        { name: "Whiteboards", value: 45 },
        { name: "Prompts", value: 25 },
        { name: "Gantt Charts", value: 60 },
        { name: "Documents", value: 85 },
      ]

      // 4. Construct and Return Final Payload
      return {
        kpis,
        userGrowth,
        contentCreation,
        mrrGrowth,
        churnRate: churnRateData,
        subscriptionDistribution: formattedSubDistribution,
        revenueByPlan,
        featureAdoption,
        topWorkspaces,
        recentActivities: recentActivities.map(activity => ({
          ...activity,
          data: activity.data, // Prisma returns JSON, GraphQL expects JSON scalar
          user: {
            // Map user to the partial type expected by GraphQL
            id: activity.user.id,
            firstName: activity.user.firstName,
            lastName: activity.user.lastName,
            avatar: activity.user.avatar,
            avatarColor: activity.user.avatarColor,
          },
        })),
      }
    },
  },
}