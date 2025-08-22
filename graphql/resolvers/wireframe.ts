// ./graphql/resolvers/wireframe.ts

import type { Context } from "@/lib/apollo-server"
import { requireAuth, requireProjectAccess } from "@/lib/utils/auth"
import { prisma } from "@/lib/prisma" // Import Prisma client

export const wireframeResolvers = {
  Query: {
    wireframe: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)

      const wireframe = await prisma.wireframe.findUnique({
        where: { id },
        include: {
          project: true,
          comments: {
            include: {
              author: true,
            },
          },
        },
      })

      if (wireframe) {
        requireProjectAccess(context, wireframe.projectId)
      }

      return wireframe
    },

    wireframes: async (_: any, { projectId }: { projectId: string }, context: Context) => {
    wireframes: async (_: any, { projectId, userId, personal }: { projectId?: string; userId?: string; personal?: boolean }, context: Context) => {
      const user = requireAuth(context)
      
      let where: any = {}
      
      if (personal || (!projectId && userId)) {
        // Personal wireframes
        where.userId = user.id
        where.projectId = null
      } else if (projectId) {
        // Project wireframes
        requireProjectAccess(context, projectId)
        where.projectId = projectId
      }

      return await prisma.wireframe.findMany({
        where,
        orderBy: { createdAt: "desc" },
      })
    },
  },

  Mutation: {
    createWireframe: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)
      
      if (input.projectId) {
        requireProjectAccess(context, input.projectId)
      }

      const wireframe = await prisma.wireframe.create({
        data: {
          title: input.title,
          data: input.data,
          thumbnail: input.thumbnail,
          projectId: input.projectId,
          userId: input.projectId ? null : user.id, // Personal wireframe if no project
        },
        include: {
          project: true,
        },
      })

      // Create activity
      await prisma.activity.create({
        data: {
          type: "WIREFRAME_CREATED",
          data: { wireframeTitle: wireframe.title },
          userId: user.id,
          projectId: wireframe.projectId,
          wireframeId: wireframe.id,
        },
      })

      return wireframe
    },

    updateWireframe: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      const user = requireAuth(context)

      const existingWireframe = await prisma.wireframe.findUnique({
        where: { id },
      })

      if (existingWireframe && existingWireframe.projectId) {
        requireProjectAccess(context, existingWireframe.projectId)
      }

      const wireframe = await prisma.wireframe.update({
        where: { id },
        data: {
          title: input.title,
          data: input.data,
          thumbnail: input.thumbnail,
        },
        include: {
          project: true,
        },
      })

      // Create activity
      await prisma.activity.create({
        data: {
          type: "WIREFRAME_UPDATED",
          data: { wireframeTitle: wireframe.title },
          userId: user.id,
          projectId: wireframe.projectId,
          wireframeId: wireframe.id,
        },
      })

      return wireframe
    },

    deleteWireframe: async (_: any, { id }: { id: string }, context: Context) => {
      const wireframe = await prisma.wireframe.findUnique({
        where: { id },
      })

      if (wireframe && wireframe.projectId) {
        requireProjectAccess(context, wireframe.projectId)
      }

      await prisma.wireframe.delete({
        where: { id },
      })

      return true
    },
  },

  Wireframe: {
    project: async (parent: any, _: any, context: Context) => {
      if (!parent.projectId) return null
      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      })
    },

    comments: async (parent: any, _: any, context: Context) => {
      return await prisma.comment.findMany({
        where: { wireframeId: parent.id },
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      })
    },

    activities: async (parent: any, _: any, context: Context) => {
      return await prisma.activity.findMany({
        where: { wireframeId: parent.id },
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      })
    },
  },
}