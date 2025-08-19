import type { Context } from "@/lib/apollo-server"
import { requireAuth, requireProjectAccess } from "@/lib/utils/auth"

export const projectResolvers = {
  Query: {
    project: async (_: any, { id }: { id: string }, context: Context) => {
      requireProjectAccess(context, id)

      return await context.prisma.project.findUnique({
        where: { id },
        include: {
          workspace: true,
          members: {
            include: {
              user: true,
            },
          },
          tasks: {
            orderBy: { createdAt: "desc" },
          },
          documents: {
            orderBy: { createdAt: "desc" },
          },
          wireframes: {
            orderBy: { createdAt: "desc" },
          },
        },
      })
    },

    projects: async (_: any, { workspaceId }: { workspaceId: string }, context: Context) => {
      const user = requireAuth(context)

      return await context.prisma.project.findMany({
        where: {
          workspaceId,
          OR: [
            { privacy: "PUBLIC" },
            {
              members: {
                some: {
                  userId: user.id,
                },
              },
            },
          ],
        },
        include: {
          workspace: true,
          members: {
            include: {
              user: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    },
  },

  Mutation: {
    createProject: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)

      const project = await context.prisma.project.create({
        data: {
          name: input.name,
          description: input.description,
          color: input.color || "#4ECDC4",
          privacy: input.privacy || "PRIVATE",
          workspaceId: input.workspaceId,
        },
        include: {
          workspace: true,
        },
      })

      // Add creator as project member
      await context.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          role: "OWNER",
        },
      })

      // Create activity
      await context.prisma.activity.create({
        data: {
          type: "PROJECT_CREATED",
          data: { projectName: project.name },
          userId: user.id,
          projectId: project.id,
        },
      })

      return project
    },

    updateProject: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      const user = requireAuth(context)
      requireProjectAccess(context, id)

      const project = await context.prisma.project.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          privacy: input.privacy,
          status: input.status,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        include: {
          workspace: true,
          members: {
            include: {
              user: true,
            },
          },
        },
      })

      // Create activity
      await context.prisma.activity.create({
        data: {
          type: "PROJECT_UPDATED",
          data: { projectName: project.name },
          userId: user.id,
          projectId: project.id,
        },
      })

      return project
    },

    deleteProject: async (_: any, { id }: { id: string }, context: Context) => {
      requireProjectAccess(context, id)

      await context.prisma.project.delete({
        where: { id },
      })

      return true
    },
  },

  Project: {
    workspace: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.workspace.findUnique({
        where: { id: parent.workspaceId },
      })
    },

    members: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.projectMember.findMany({
        where: { projectId: parent.id },
        include: {
          user: true,
          project: true,
        },
      })
    },

    tasks: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.task.findMany({
        where: { projectId: parent.id },
        include: {
          assignee: true,
          creator: true,
          labels: {
            include: {
              label: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    },

    documents: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.document.findMany({
        where: { projectId: parent.id },
        orderBy: { createdAt: "desc" },
      })
    },

    wireframes: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.wireframe.findMany({
        where: { projectId: parent.id },
        orderBy: { createdAt: "desc" },
      })
    },

    activities: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.activity.findMany({
        where: { projectId: parent.id },
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      })
    },
  },
}
