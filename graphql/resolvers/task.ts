// ./graphql/resolvers/task.ts

import type { Context } from "@/lib/apollo-server"
import { requireAuth, requireProjectAccess } from "@/lib/utils/auth"
import { prisma } from "@/lib/prisma" // Import Prisma client

export const taskResolvers = {
  Query: {
    task: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)

      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          project: true,
          assignee: true,
          creator: true,
          parent: true,
          subtasks: true,
          section: true,
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

      if (task && task.projectId) {
        requireProjectAccess(context, task.projectId)
      }

      return task
    },

    tasks: async (_: any, { projectId, userId, personal }: { projectId?: string; userId?: string; personal?: boolean }, context: Context) => {
      const user = requireAuth(context)
      
      let where: any = {}
      
      if (personal || (!projectId && userId)) {
        // Personal tasks
        where.userId = user.id
        where.projectId = null
      } else if (projectId) {
        // Project tasks
        requireProjectAccess(context, projectId)
        where.projectId = projectId
      } else {
        // All user's tasks across projects they have access to
        const userProjects = await prisma.projectMember.findMany({
          where: { userId: user.id },
          select: { projectId: true },
        })
        const projectIds = userProjects.map(pm => pm.projectId)
        where.OR = [
          { userId: user.id, projectId: null }, // Personal tasks
          { projectId: { in: projectIds } }, // Project tasks
        ]
      }

      return await prisma.task.findMany({
        where,
        include: {
          assignee: true,
          creator: true,
          parent: true,
          subtasks: true,
          section: true,
          labels: {
            include: {
              label: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    },

    taskSections: async (_: any, { projectId, userId, personal }: { projectId?: string; userId?: string; personal?: boolean }, context: Context) => {
      const user = requireAuth(context)
      
      let where: any = {}
      
      if (personal || (!projectId && userId)) {
        // Personal sections
        where.userId = user.id
        where.projectId = null
      } else if (projectId) {
        // Project sections
        requireProjectAccess(context, projectId)
        where.projectId = projectId
      }

      return await prisma.taskSection.findMany({
        where,
        include: {
          tasks: {
            include: {
              assignee: true,
              creator: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { order: "asc" },
      })
    },
  },

  TaskSection: {
    project: async (parent: any, _: any, context: Context) => {
      if (!parent.projectId) return null
      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      })
    },

    tasks: async (parent: any, _: any, context: Context) => {
      return await prisma.task.findMany({
        where: { sectionId: parent.id },
        include: {
          assignee: true,
          creator: true,
        },
        orderBy: { createdAt: "desc" },
      })
    },
  },

  Mutation: {
    createTask: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)
      
      if (input.projectId) {
        requireProjectAccess(context, input.projectId)
      }

      const task = await prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority || "MEDIUM",
          points: input.points || 0,
          dueDate: input.dueDate,
          projectId: input.projectId,
          userId: input.projectId ? null : user.id, // Personal task if no project
          assigneeId: input.assigneeId,
          creatorId: user.id,
          parentId: input.parentId,
          sectionId: input.sectionId,
        },
        include: {
          project: true,
          assignee: true,
          creator: true,
          section: true,
        },
      })

      // Create activity
      await prisma.activity.create({
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

    createTaskSection: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)
      
      if (input.projectId) {
        requireProjectAccess(context, input.projectId)
      }

      const section = await prisma.taskSection.create({
        data: {
          title: input.title,
          order: input.order || 0,
          projectId: input.projectId,
          userId: input.projectId ? null : user.id, // Personal section if no project
        },
        include: {
          tasks: true,
        },
      })

      return section
    },

    updateTaskSection: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      const user = requireAuth(context)

      const existingSection = await prisma.taskSection.findUnique({
        where: { id },
      })

      if (existingSection && existingSection.projectId) {
        requireProjectAccess(context, existingSection.projectId)
      }

      return await prisma.taskSection.update({
        where: { id },
        data: {
          title: input.title,
          order: input.order,
        },
        include: {
          tasks: true,
        },
      })
    },

    deleteTaskSection: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)

      const section = await prisma.taskSection.findUnique({
        where: { id },
      })

      if (section && section.projectId) {
        requireProjectAccess(context, section.projectId)
      }

      await prisma.taskSection.delete({
        where: { id },
      })

      return true
    },

    updateTask: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      const user = requireAuth(context)

      const existingTask = await prisma.task.findUnique({
        where: { id },
      })

      if (existingTask && existingTask.projectId) {
        requireProjectAccess(context, existingTask.projectId)
      }

      const task = await prisma.task.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          points: input.points,
          dueDate: input.dueDate,
          sectionId: input.sectionId,
          assigneeId: input.assigneeId,
        },
        include: {
          project: true,
          assignee: true,
          creator: true,
          section: true,
          labels: {
            include: {
              label: true,
            },
          },
        },
      })

      // Create activity
      await prisma.activity.create({
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

      const task = await prisma.task.findUnique({
        where: { id },
      })

      if (task && task.projectId) {
        requireProjectAccess(context, task.projectId)
      }

      await prisma.task.delete({
        where: { id },
      })

      return true
    },
  },

  Task: {
    section: async (parent: any, _: any, context: Context) => {
      if (!parent.sectionId) return null
      return await prisma.taskSection.findUnique({
        where: { id: parent.sectionId },
      })
    },

    project: async (parent: any, _: any, context: Context) => {
      if (!parent.projectId) return null
      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      })
    },

    assignee: async (parent: any, _: any, context: Context) => {
      if (!parent.assigneeId) return null
      return await prisma.user.findUnique({
        where: { id: parent.assigneeId },
      })
    },

    creator: async (parent: any, _: any, context: Context) => {
      return await prisma.user.findUnique({
        where: { id: parent.creatorId },
      })
    },

    parent: async (parent: any, _: any, context: Context) => {
      if (!parent.parentId) return null
      return await prisma.task.findUnique({
        where: { id: parent.parentId },
      })
    },

    subtasks: async (parent: any, _: any, context: Context) => {
      return await prisma.task.findMany({
        where: { parentId: parent.id },
        include: {
          assignee: true,
          creator: true,
        },
      })
    },

    comments: async (parent: any, _: any, context: Context) => {
      return await prisma.comment.findMany({
        where: { taskId: parent.id },
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      })
    },

    activities: async (parent: any, _: any, context: Context) => {
      return await prisma.activity.findMany({
        where: { taskId: parent.id },
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      })
    },

    labels: async (parent: any, _: any, context: Context) => {
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