// ./graphql/resolvers/activity.ts

import type { Context } from "@/lib/apollo-server"
import { requireAuth } from "@/lib/utils/auth"
import { prisma } from "@/lib/prisma" // Import Prisma client

export const activityResolvers = {
  Query: {
    activities: async (_: any, { projectId }: { projectId?: string }, context: Context) => {
      const user = requireAuth(context)

      const where: any = {}

      if (projectId) {
        where.projectId = projectId
      } else {
        // Get activities from user's workspaces
        const userWorkspaces = await prisma.workspaceMember.findMany({
          where: { userId: user.id },
          select: { workspaceId: true },
        })

        const workspaceIds = userWorkspaces.map((wm) => wm.workspaceId)

        where.project = {
          workspaceId: {
            in: workspaceIds,
          },
        }
      }

      return await prisma.activity.findMany({
        where,
        include: {
          user: true,
          project: true,
          task: true,
          document: true,
          wireframe: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    },
  },

  Activity: {
    user: async (parent: any, _: any, context: Context) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      })
    },

    project: async (parent: any, _: any, context: Context) => {
      if (!parent.projectId) return null
      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      })
    },

    task: async (parent: any, _: any, context: Context) => {
      if (!parent.taskId) return null
      return await prisma.task.findUnique({
        where: { id: parent.taskId },
      })
    },

    document: async (parent: any, _: any, context: Context) => {
      if (!parent.documentId) return null
      return await prisma.document.findUnique({
        where: { id: parent.documentId },
      })
    },

    wireframe: async (parent: any, _: any, context: Context) => {
      if (!parent.wireframeId) return null
      return await prisma.wireframe.findUnique({
        where: { id: parent.wireframeId },
      })
    },
  },
}