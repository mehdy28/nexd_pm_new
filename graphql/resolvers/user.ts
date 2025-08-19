import type { Context } from "@/lib/apollo-server"

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, { prisma, user }: Context) => {
      if (!user) {
        throw new Error("Not authenticated")
      }

      return await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          workspaceMembers: {
            include: {
              workspace: true,
            },
          },
          ownedWorkspaces: true,
          projectMembers: {
            include: {
              project: true,
            },
          },
        },
      })
    },
  },

  User: {
    workspaceMembers: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.workspaceMember.findMany({
        where: { userId: parent.id },
        include: {
          workspace: true,
          user: true,
        },
      })
    },

    ownedWorkspaces: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.workspace.findMany({
        where: { ownerId: parent.id },
      })
    },

    projectMembers: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.projectMember.findMany({
        where: { userId: parent.id },
        include: {
          project: true,
          user: true,
        },
      })
    },

    assignedTasks: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.task.findMany({
        where: { assigneeId: parent.id },
      })
    },

    createdTasks: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.task.findMany({
        where: { creatorId: parent.id },
      })
    },

    activities: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.activity.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: "desc" },
      })
    },

    comments: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.comment.findMany({
        where: { authorId: parent.id },
      })
    },
  },
}
