// graphql/resolvers/projectDashboardResolver.ts

import { prisma } from "../../lib/prisma.js"
import { type TaskStatus, type Priority } from "@prisma/client"
import { addDays, differenceInDays, format, isBefore, startOfDay } from "date-fns"

interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

// Helper function to create a date range array
const eachDayOfInterval = (start: Date, end: Date): Date[] => {
  const dates = []
  let currentDate = startOfDay(start)
  const finalDate = startOfDay(end)

  while (currentDate <= finalDate) {
    dates.push(new Date(currentDate))
    currentDate = addDays(currentDate, 1)
  }
  return dates
}

export const projectDashboardResolvers = {
  Query: {
    getProjectDashboardData: async (
      _parent: any,
      { projectId, sprintId }: { projectId: string; sprintId?: string },
      { user }: GraphQLContext,
    ) => {
      if (!user) {
        throw new Error("Authentication required")
      }

      // 1. Fetch Sprints for the filter
      const sprints = await prisma.sprint.findMany({
        where: { projectId },
        select: { id: true, name: true },
        orderBy: { startDate: "desc" },
      })

      // 2. Fetch relevant tasks
      const tasks = await prisma.task.findMany({
        where: {
          projectId,
          ...(sprintId && { sprintId }),
        },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      })

      // 3. Define the date range for charts
      let startDate: Date | null = null
      let endDate: Date | null = null

      if (sprintId) {
        const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
        if (sprint) {
          startDate = sprint.startDate
          endDate = sprint.endDate
        }
      } else {
        const project = await prisma.project.findUnique({ where: { id: projectId } })
        if (project) {
          startDate = project.startDate
          endDate = project.endDate
        }
      }

      // Fallback if no dates are set on project/sprint
      if (!startDate || !endDate) {
        if (tasks.length > 0) {
          startDate = tasks.reduce(
            (earliest, task) => (task.createdAt < earliest ? task.createdAt : earliest),
            tasks[0].createdAt,
          )
          endDate = tasks.reduce((latest, task) => {
            const dateToCompare = task.endDate || task.endDate || task.createdAt
            return dateToCompare > latest ? dateToCompare : latest
          }, new Date(0))
        } else {
          // No tasks and no dates, return empty data
          return {
            kpis: {
              totalTasks: 0,
              completedTasks: 0,
              inProgressTasks: 0,
              overdueTasks: 0,
              totalPoints: 0,
              completedPoints: 0,
              completionPercentage: 0,
              velocity: 0,
            },
            priorityDistribution: [],
            statusDistribution: [],
            burnupChart: [],
            burndownChart: [],
            memberWorkload: [],
            sprints,
          }
        }
      }

      // 4. Calculate KPIs
      const now = new Date()
      const completedTasks = tasks.filter(t => t.status === "DONE").length
      const totalTasks = tasks.length
      const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0)
      const completedPoints = tasks
        .filter(t => t.status === "DONE")
        .reduce((sum, t) => sum + (t.points || 0), 0)

      const durationInWeeks = Math.max(1, differenceInDays(endDate, startDate) / 7)
      const velocity = completedPoints / durationInWeeks

      const kpis = {
        totalTasks,
        completedTasks,
        inProgressTasks: tasks.filter(t => t.status === "TODO" && t.assigneeId).length, // Simplified to assigned but not done
        overdueTasks: tasks.filter(t => t.endDate && isBefore(t.endDate, now) && t.status !== "DONE").length,
        totalPoints,
        completedPoints,
        completionPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        velocity,
      }

      // 5. Calculate Chart Data
      // Priority Distribution
      const priorityCounts = tasks.reduce(
        (acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1
          return acc
        },
        {} as Record<Priority, number>,
      )

      const priorityDistribution = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }))

      // Status Distribution
      const statusCounts = tasks.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1
          return acc
        },
        {} as Record<TaskStatus, number>,
      )
      const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

      // Member Workload
      const workloadMap = new Map<
        string,
        {
          assigneeName: string
          taskCount: number
          totalPoints: number
          assigneeAvatar: string | null
          assigneeId: string
        }
      >()

      tasks.forEach(task => {
        if (task.assignee) {
          const assigneeKey = task.assignee.id
          if (!workloadMap.has(assigneeKey)) {
            workloadMap.set(assigneeKey, {
              assigneeName: `${task.assignee.firstName || ""} ${task.assignee.lastName || ""}`.trim(),
              taskCount: 0,
              totalPoints: 0,
              assigneeAvatar: task.assignee.avatar,
              assigneeId: task.assignee.id,
            })
          }
          const current = workloadMap.get(assigneeKey)!
          current.taskCount += 1
          current.totalPoints += task.points || 0
        }
      })
      const memberWorkload = Array.from(workloadMap.values())

      // Burndown / Burnup Charts
      const dateInterval = eachDayOfInterval(startDate, endDate)
      const idealPointsPerDay = totalPoints / Math.max(1, dateInterval.length - 1)

      const burnupChart: any[] = []
      const burndownChart: any[] = []

      dateInterval.forEach((day, index) => {
        const dayStr = format(day, "MMM d")

        const scopeOnDay = tasks
          .filter(t => !isBefore(day, startOfDay(t.createdAt)))
          .reduce((sum, t) => sum + (t.points || 0), 0)

        const completedOnDay = tasks
          .filter(t => t.status === "DONE" && t.endDate && !isBefore(day, startOfDay(t.endDate)))
          .reduce((sum, t) => sum + (t.points || 0), 0)

        burnupChart.push({
          date: dayStr,
          scope: scopeOnDay,
          actual: completedOnDay,
        })

        burndownChart.push({
          date: dayStr,
          ideal: Math.max(0, totalPoints - idealPointsPerDay * index),
          actual: scopeOnDay - completedOnDay,
        })
      })

      return {
        kpis,
        priorityDistribution,
        statusDistribution,
        burnupChart,
        burndownChart,
        memberWorkload,
        sprints,
      }
    },
  },
}