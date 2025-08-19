import type { Context } from "@/lib/apollo-server"
import { requireAuth, requireProjectAccess } from "@/lib/utils/auth"

export const documentResolvers = {
  Query: {
    document: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)

      const document = await context.prisma.document.findUnique({
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

      if (document) {
        requireProjectAccess(context, document.projectId)
      }

      return document
    },

    documents: async (_: any, { projectId }: { projectId: string }, context: Context) => {
      requireProjectAccess(context, projectId)

      return await context.prisma.document.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      })
    },
  },

  Mutation: {
    createDocument: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)
      requireProjectAccess(context, input.projectId)

      const document = await context.prisma.document.create({
        data: {
          title: input.title,
          content: input.content,
          type: input.type || "TEXT",
          projectId: input.projectId,
        },
        include: {
          project: true,
        },
      })

      // Create activity
      await context.prisma.activity.create({
        data: {
          type: "DOCUMENT_CREATED",
          data: { documentTitle: document.title },
          userId: user.id,
          projectId: document.projectId,
          documentId: document.id,
        },
      })

      return document
    },

    updateDocument: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      const user = requireAuth(context)

      const existingDocument = await context.prisma.document.findUnique({
        where: { id },
      })

      if (existingDocument) {
        requireProjectAccess(context, existingDocument.projectId)
      }

      const document = await context.prisma.document.update({
        where: { id },
        data: {
          title: input.title,
          content: input.content,
          type: input.type,
        },
        include: {
          project: true,
        },
      })

      // Create activity
      await context.prisma.activity.create({
        data: {
          type: "DOCUMENT_UPDATED",
          data: { documentTitle: document.title },
          userId: user.id,
          projectId: document.projectId,
          documentId: document.id,
        },
      })

      return document
    },

    deleteDocument: async (_: any, { id }: { id: string }, context: Context) => {
      const document = await context.prisma.document.findUnique({
        where: { id },
      })

      if (document) {
        requireProjectAccess(context, document.projectId)
      }

      await context.prisma.document.delete({
        where: { id },
      })

      return true
    },
  },

  Document: {
    project: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      })
    },

    comments: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.comment.findMany({
        where: { documentId: parent.id },
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      })
    },

    activities: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.activity.findMany({
        where: { documentId: parent.id },
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      })
    },
  },
}
