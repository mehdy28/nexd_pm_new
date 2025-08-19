import type { Context } from "@/lib/apollo-server"
import { requireAuth, requireProjectAccess } from "@/lib/utils/auth"

export const wireframeResolvers = {
  Query: {
    wireframe: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)

      const wireframe = await context.prisma.wireframe.findUnique({
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
      requireProjectAccess(context, projectId)

      return await context.prisma.wireframe.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      })
    },
  },

  Mutation: {
    createWireframe: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)
      requireProjectAccess(context, input.projectId)

      const wireframe = await context.prisma.wireframe.create({
        data: {
          title: input.title,
          data: input.data,
          thumbnail: input.thumbnail,
          projectId: input.projectId,
        },
        include: {
          project: true,
        },
      })

      // Create activity
      await context.prisma.activity.create({
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

      const existingWireframe = await context.prisma.wireframe.findUnique({
        where: { id },
      })

      if (existingWireframe) {
        requireProjectAccess(context, existingWireframe.projectId)
      }

      const wireframe = await context.prisma.wireframe.update({
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
      await context.prisma.activity.create({
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
      const wireframe = await context.prisma.wireframe.findUnique({
        where: { id },
      })

      if (wireframe) {
        requireProjectAccess(context, wireframe.projectId)
      }

      await context.prisma.wireframe.delete({
        where: { id },
      })

      return true
    },
  },

  Wireframe: {
    project: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      })
    },

    comments: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.comment.findMany({
        where: { wireframeId: parent.id },
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      })
    },

    activities: async (parent: any, _: any, { prisma }: Context) => {
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
