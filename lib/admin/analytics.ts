import { prisma } from "@/lib/prisma"

export interface DashboardMetrics {
  totalUsers: number
  activeWorkspaces: number
  totalProjects: number
  tasksCreated: number
  documentsCount: number
  wireframesCount: number
  monthlyRevenue: number
  churnRate: number
}

export interface UserGrowthData {
  month: string
  users: number
  projects: number
  tasks: number
}

export interface SubscriptionData {
  name: string
  value: number
  color: string
  workspaces: number
  projects: number
  revenue: number
}

export interface ContentCreationData {
  month: string
  documents: number
  wireframes: number
  tasks: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [totalUsers, activeWorkspaces, totalProjects, tasksCreated, documentsCount, wireframesCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.workspace.count({
        where: {
          isActive: true,
        },
      }),
      prisma.project.count(),
      prisma.task.count(),
      prisma.document.count(),
      prisma.wireframe.count(),
    ])

  // Calculate monthly revenue from subscriptions
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "active",
    },
    include: {
      workspace: true,
    },
  })

  const monthlyRevenue = subscriptions.reduce((total, sub) => {
    const planPrices = {
      FREE: 0,
      PRO: 20,
      TEAM: 50,
      ENTERPRISE: 100,
    }
    return total + (planPrices[sub.plan as keyof typeof planPrices] || 0)
  }, 0)

  // Calculate churn rate (simplified - last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [canceledSubscriptions, totalSubscriptionsStart] = await Promise.all([
    prisma.subscription.count({
      where: {
        status: "canceled",
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    prisma.subscription.count({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    }),
  ])

  const churnRate = totalSubscriptionsStart > 0 ? (canceledSubscriptions / totalSubscriptionsStart) * 100 : 0

  return {
    totalUsers,
    activeWorkspaces,
    totalProjects,
    tasksCreated,
    documentsCount,
    wireframesCount,
    monthlyRevenue,
    churnRate: Math.round(churnRate * 10) / 10,
  }
}

export async function getUserGrowthData(): Promise<UserGrowthData[]> {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // Get monthly user registrations
  const userGrowth = await prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
    SELECT 
      TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
      COUNT(*) as count
    FROM "User"
    WHERE "createdAt" >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY DATE_TRUNC('month', "createdAt")
  `

  // Get monthly project creation
  const projectGrowth = await prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
    SELECT 
      TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
      COUNT(*) as count
    FROM "Project"
    WHERE "createdAt" >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY DATE_TRUNC('month', "createdAt")
  `

  // Get monthly task creation
  const taskGrowth = await prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
    SELECT 
      TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
      COUNT(*) as count
    FROM "Task"
    WHERE "createdAt" >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY DATE_TRUNC('month', "createdAt")
  `

  // Combine the data
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
  return months.map((month) => ({
    month,
    users: Number(userGrowth.find((u) => u.month === month)?.count || 0),
    projects: Number(projectGrowth.find((p) => p.month === month)?.count || 0),
    tasks: Number(taskGrowth.find((t) => t.month === month)?.count || 0),
  }))
}

export async function getSubscriptionData(): Promise<SubscriptionData[]> {
  const subscriptions = await prisma.subscription.groupBy({
    by: ["plan"],
    where: {
      status: "active",
    },
    _count: {
      id: true,
    },
  })

  const planColors = {
    FREE: "#94a3b8",
    PRO: "#4ecdc4",
    TEAM: "#3a4a5c",
    ENTERPRISE: "#06b6d4",
  }

  const planPrices = {
    FREE: 0,
    PRO: 20,
    TEAM: 50,
    ENTERPRISE: 100,
  }

  const result: SubscriptionData[] = []

  for (const sub of subscriptions) {
    const workspaces = await prisma.workspace.count({
      where: {
        subscription: {
          plan: sub.plan,
          status: "active",
        },
      },
    })

    const projects = await prisma.project.count({
      where: {
        workspace: {
          subscription: {
            plan: sub.plan,
            status: "active",
          },
        },
      },
    })

    result.push({
      name: sub.plan,
      value: sub._count.id,
      color: planColors[sub.plan as keyof typeof planColors] || "#94a3b8",
      workspaces,
      projects,
      revenue: sub._count.id * (planPrices[sub.plan as keyof typeof planPrices] || 0),
    })
  }

  return result
}

export async function getContentCreationData(): Promise<ContentCreationData[]> {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [documentsData, wireframesData, tasksData] = await Promise.all([
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
        COUNT(*) as count
      FROM "Document"
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt")
    `,
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
        COUNT(*) as count
      FROM "Wireframe"
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt")
    `,
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
        COUNT(*) as count
      FROM "Task"
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt")
    `,
  ])

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
  return months.map((month) => ({
    month,
    documents: Number(documentsData.find((d) => d.month === month)?.count || 0),
    wireframes: Number(wireframesData.find((w) => w.month === month)?.count || 0),
    tasks: Number(tasksData.find((t) => t.month === month)?.count || 0),
  }))
}

export async function getRecentActivity() {
  const activities = await prisma.activity.findMany({
    take: 20,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
          subscription: {
            select: {
              plan: true,
            },
          },
        },
      },
    },
  })

  return activities.map((activity) => ({
    id: activity.id,
    user: activity.user.name || "Unknown User",
    avatar: activity.user.avatar,
    action: activity.action,
    target: activity.entityType,
    workspace: activity.workspace?.name || "Personal",
    plan: activity.workspace?.subscription?.plan || "FREE",
    time: formatTimeAgo(activity.createdAt),
    type: activity.entityType.toLowerCase(),
  }))
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hours ago`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} days ago`
}
