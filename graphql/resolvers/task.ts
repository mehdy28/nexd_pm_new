import type { Context } from "@/lib/apollo-server"
import { requireAuth, requireProjectAccess } from "@/lib/utils/auth"

export const taskResolvers = {
  Query: {
    task: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)

      const task = await context.prisma.task.findUnique({
        where: { id },
        include: {
          project: true,
          assignee: true,
          creator: true,
          parent: true,
          subtasks: true,
          comments: {
            include: {
              author: true,
            },
          },
          labels: {
            include: {
              label: true,
            },
          },
        },
      })

      if (task) {
        requireProjectAccess(context, task.projectId)
      }

      return task
    },

    tasks: async (_: any, { projectId }: { projectId: string }, context: Context) => {
      requireProjectAccess(context, projectId)

      return await context.prisma.task.findMany({
        where: { projectId },
        include: {
          assignee: true,
          creator: true,
          parent: true,
          subtasks: true,
          labels: {
            include: {
              label: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    },
  },

  Mutation: {
    createTask: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)
      requireProjectAccess(context, input.projectId)

      const task = await context.prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority || "MEDIUM",
          dueDate: input.dueDate,
          projectId: input.projectId,
          assigneeId: input.assigneeId,
          creatorId: user.id,
          parentId: input.parentId,
        },
        include: {
          project: true,
          assignee: true,
          creator: true,
        },
      })

      // Create activity
      await context.prisma.activity.create({
        data: {
          type: "TASK_CREATED",
          data: { taskTitle: task.title },
          userId: user.id,
          projectId: task.projectId,
          taskId: task.id,
        },
      })

      return task
    },

    updateTask: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      const user = requireAuth(context)

      const existingTask = await context.prisma.task.findUnique({
        where: { id },
      })

      if (existingTask) {
        requireProjectAccess(context, existingTask.projectId)
      }

      const task = await context.prisma.task.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate,
          assigneeId: input.assigneeId,
        },
        include: {
          project: true,
          assignee: true,
          creator: true,
          labels: {
            include: {
              label: true,
            },
          },
        },
      })

      // Create activity
      await context.prisma.activity.create({
        data: {
          type: "TASK_UPDATED",
          data: { taskTitle: task.title },
          userId: user.id,
          projectId: task.projectId,
          taskId: task.id,
        },
      })

      return task
    },

    deleteTask: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)

      const task = await context.prisma.task.findUnique({
        where: { id },
      })

      if (task) {
        requireProjectAccess(context, task.projectId)
      }

      await context.prisma.task.delete({
        where: { id },
      })

      return true
    },
  },

  Task: {
    project: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      })
    },

    assignee: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.assigneeId) return null
      return await prisma.user.findUnique({
        where: { id: parent.assigneeId },
      })
    },

    creator: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.user.findUnique({
        where: { id: parent.creatorId },
      })
    },

    parent: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.parentId) return null
      return await prisma.task.findUnique({
        where: { id: parent.parentId },
      })
    },

    subtasks: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.task.findMany({
        where: { parentId: parent.id },
        include: {
          assignee: true,
          creator: true,
        },
      })
    },

    comments: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.comment.findMany({
        where: { taskId: parent.id },
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      })
    },

    activities: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.activity.findMany({
        where: { taskId: parent.id },
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      })
    },

    labels: async (parent: any, _: any, { prisma }: Context) => {
      const taskLabels = await prisma.taskLabel.findMany({
        where: { taskId: parent.id },
        include: {
          label: true,
        },
      })
      return taskLabels.map((tl) => tl.label)
    },
  },
}
