import { prisma } from "@/lib/prisma"
import { GraphQLError } from "graphql"
import { Priority, TaskStatus } from "@prisma/client"

function log(prefix: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  if (data !== undefined) {
    console.log(`${timestamp} ${prefix} ${message}`, data)
  } else {
    console.log(`${timestamp} ${prefix} ${message}`)
  }
}

interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

interface CreatePersonalSectionArgs {
  name: string
  order?: number
}

interface UpdatePersonalSectionArgs {
  id: string
  name?: string
  order?: number
}

interface DeleteSectionOptions {
  deleteTasks: boolean
  reassignToSectionId?: string | null
}

interface DeletePersonalSectionArgs {
  id: string
  options?: DeleteSectionOptions
}

export const personalResolver = {
  Query: {
    getMyTasksAndSections: async (_parent: unknown, _args: {}, context: GraphQLContext) => {
      log("[getMyTasksAndSections Query]", "called")

      if (!context.user?.id) {
        log("[getMyTasksAndSections Query]", "No authenticated user found in context.")
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }
      const userId = context.user.id

      try {
        const personalSections = await prisma.personalSection.findMany({
          where: { userId: userId },
          orderBy: { order: "asc" },
          include: {
            tasks: {
              where: {
                personalUserId: userId,
              },
              include: {
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        })
        log("[getMyTasksAndSections Query]", `Fetched ${personalSections.length} personal sections for user ${userId}.`)

        const transformedPersonalSections = personalSections.map(section => ({
          id: section.id,
          name: section.name,
          order: section.order,
          tasks: section.tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            startDate: task.startDate?.toISOString().split("T")[0] || null,
            endDate: task.endDate?.toISOString().split("T")[0] || null,
            points: task.points,
            completed: task.status === "DONE",
            personalSectionId: null, // Personal tasks don't belong to project sections
            assignee: null, // Personal tasks are self-assigned
          })),
        }))

        const result = {
          personalSections: transformedPersonalSections,
        }

        log("[getMyTasksAndSections Query]", "Personal tasks and sections fetched successfully.")
        return result
      } catch (error) {
        log("[getMyTasksAndSections Query]", "Error fetching personal tasks and sections:", error)
        throw error
      }
    },
    getMyDashboardData: async (_parent: unknown, _args: {}, context: GraphQLContext) => {
      log("[getMyDashboardData Query]", "called")

      if (!context.user?.id) {
        log("[getMyDashboardData Query]", "No authenticated user found.")
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }
      const userId = context.user.id

      try {
        const tasks = await prisma.task.findMany({
          where: { personalUserId: userId },
        })

        const totalTasks = tasks.length
        const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE).length
        const inProgressTasks = tasks.filter(task => task.status === TaskStatus.TODO).length
        const overdueTasks = tasks.filter(
          task => task.endDate && new Date(task.endDate) < new Date() && task.status !== TaskStatus.DONE
        ).length

        const kpis = {
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
        }

        const priorityDistribution = Object.values(Priority).map(p => ({
          name: p,
          value: tasks.filter(t => t.priority === p).length,
        }))

        const statusDistribution = Object.values(TaskStatus).map(s => ({
          name: s,
          value: tasks.filter(t => t.status === s).length,
        }))

        const result = {
          kpis,
          priorityDistribution,
          statusDistribution,
        }

        log("[getMyDashboardData Query]", "Successfully fetched user dashboard data.")
        return result
      } catch (error) {
        log("[getMyDashboardData Query]", "Error fetching user dashboard data:", error)
        throw new GraphQLError("Failed to fetch user dashboard data.")
      }
    },
  },
  Mutation: {
    createPersonalSection: async (
      _parent: unknown,
      args: CreatePersonalSectionArgs,
      context: GraphQLContext
    ) => {
      log("[createPersonalSection Mutation]", "called with args:", args)

      if (!context.user?.id) {
        log("[createPersonalSection Mutation]", "No authenticated user found.")
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }
      const userId = context.user.id
      const { name, order } = args

      try {
        const newSection = await prisma.personalSection.create({
          data: {
            name,
            order: order ?? 0,
            user: { connect: { id: userId } },
          },
        })
        log("[createPersonalSection Mutation]", "Personal section created successfully:", newSection)
        return { ...newSection, tasks: [] }
      } catch (error: any) {
        if (error.code === "P2002") {
          throw new GraphQLError("A section with this name already exists for your personal tasks.", {
            extensions: { code: "BAD_USER_INPUT" },
          })
        }
        log("[createPersonalSection Mutation]", "Error creating personal section:", error)
        throw new GraphQLError("Could not create personal section.")
      }
    },

    updatePersonalSection: async (
      _parent: unknown,
      args: UpdatePersonalSectionArgs,
      context: GraphQLContext
    ) => {
      log("[updatePersonalSection Mutation]", "called with args:", args)

      if (!context.user?.id) {
        log("[updatePersonalSection Mutation]", "No authenticated user found.")
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }
      const userId = context.user.id
      const { id, name, order } = args

      try {
        const section = await prisma.personalSection.findFirst({
          where: { id: id, userId: userId },
        })

        if (!section) {
          log("[updatePersonalSection Mutation]", `Section ${id} not found or user ${userId} not authorized.`)
          throw new GraphQLError("Section not found or you don't have permission to update it.", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        const updatedSection = await prisma.personalSection.update({
          where: { id: id },
          data: {
            name: name ?? undefined,
            order: order ?? undefined,
          },
        })
        log("[updatePersonalSection Mutation]", "Personal section updated successfully:", updatedSection)
        return updatedSection
      } catch (error) {
        log("[updatePersonalSection Mutation]", "Error updating personal section:", error)
        throw new GraphQLError("Could not update personal section.")
      }
    },

    deletePersonalSection: async (
      _parent: unknown,
      args: DeletePersonalSectionArgs,
      context: GraphQLContext
    ) => {
      log("[deletePersonalSection Mutation]", "called with args:", args)

      if (!context.user?.id) {
        log("[deletePersonalSection Mutation]", "No authenticated user found.")
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }
      const userId = context.user.id
      const { id, options } = args

      try {
        const sectionToDelete = await prisma.personalSection.findFirst({
          where: { id, userId },
          include: { tasks: { select: { id: true } } },
        })

        if (!sectionToDelete) {
          log("[deletePersonalSection Mutation]", `Section ${id} not found or user ${userId} not authorized.`)
          throw new GraphQLError("Section not found or you don't have permission to delete it.", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        const taskIds = sectionToDelete.tasks.map(t => t.id)

        await prisma.$transaction(async tx => {
          if (taskIds.length > 0) {
            if (options?.deleteTasks) {
              log("[deletePersonalSection Mutation]", `Deleting ${taskIds.length} tasks from section ${id}.`)
              await tx.task.deleteMany({ where: { id: { in: taskIds } } })
            } else if (options?.reassignToSectionId) {
              log("[deletePersonalSection Mutation]", `Reassigning tasks to section ${options.reassignToSectionId}.`)
              await tx.task.updateMany({
                where: { id: { in: taskIds } },
                data: { personalSectionId: options.reassignToSectionId },
              })
            } else {
              log("[deletePersonalSection Mutation]", `Unassigning tasks from section ${id}.`)
              await tx.task.updateMany({
                where: { id: { in: taskIds } },
                data: { personalSectionId: null },
              })
            }
          }

          await tx.personalSection.delete({ where: { id } })
          log("[deletePersonalSection Mutation]", `Personal section ${id} deleted successfully.`)
        })

        return sectionToDelete
      } catch (error) {
        log("[deletePersonalSection Mutation]", "Error deleting personal section:", error)
        throw new GraphQLError("Could not delete personal section.")
      }
    },
  },
}

export default personalResolver