import type { Context } from "@/lib/apollo-server"
import { requireAuth, requireWorkspaceAccess } from "@/lib/utils/auth"

export const workspaceResolvers = {
  Query: {
    workspace: async (_: any, { id }: { id: string }, context: Context) => {
      requireWorkspaceAccess(context, id)

      return await context.prisma.workspace.findUnique({
        where: { id },
        include: {
          owner: true,
          members: {
            include: {
              user: true,
            },
          },
          projects: true,
          subscription: true,
          settings: true,
        },
      })
    },

    workspaces: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context)

      return await context.prisma.workspace.findMany({
        where: {
          OR: [
            { ownerId: user.id },
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
          owner: true,
          members: {
            include: {
              user: true,
            },
          },
          projects: true,
        },
      })
    },
  },

  Mutation: {
    createWorkspace: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)

      const workspace = await context.prisma.workspace.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          ownerId: user.id,
          settings: {
            create: {
              allowGuestAccess: false,
              defaultProjectPrivacy: "PRIVATE",
              timeZone: "UTC",
            },
          },
        },
        include: {
          owner: true,
          settings: true,
        },
      })

      // Add owner as workspace member
      await context.prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
        },
      })

      return workspace
    },

    updateWorkspace: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      requireWorkspaceAccess(context, id)

      return await context.prisma.workspace.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          avatar: input.avatar,
        },
        include: {
          owner: true,
          members: {
            include: {
              user: true,
            },
          },
        },
      })
    },

    deleteWorkspace: async (_: any, { id }: { id: string }, context: Context) => {
      requireWorkspaceAccess(context, id)

      await context.prisma.workspace.delete({
        where: { id },
      })

      return true
    },
  },

  Workspace: {
    owner: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.user.findUnique({
        where: { id: parent.ownerId },
      })
    },

    members: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.workspaceMember.findMany({
        where: { workspaceId: parent.id },
        include: {
          user: true,
          workspace: true,
        },
      })
    },

    projects: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.project.findMany({
        where: { workspaceId: parent.id },
        orderBy: { createdAt: "desc" },
      })
    },

    subscription: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.subscription.findUnique({
        where: { workspaceId: parent.id },
      })
    },

    settings: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.workspaceSettings.findUnique({
        where: { workspaceId: parent.id },
      })
    },
  },
}
