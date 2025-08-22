// ./graphql/resolvers/document.ts

import type { Context } from "@/lib/apollo-server"
import { requireAuth, requireProjectAccess } from "@/lib/utils/auth"
import { prisma } from "@/lib/prisma" // Import Prisma client

export const documentResolvers = {
  Query: {
    document: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)

      const document = await prisma.document.findUnique({
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
    }
    documents: async (_: any, { projectId, userId, personal }: { projectId?: string; userId?: string; personal?: boolean }, context: Context) => {
      const user = requireAuth(context)
      
      let where: any = {}
      
      if (personal || (!projectId && userId)) {
        // Personal documents
        where.userId = user.id
        where.projectId = null
      } else if (projectId) {
        // Project documents
        requireProjectAccess(context, projectId)
        where.projectId = projectId
      }

      return await prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
      })
    },
  },

  Mutation: {
    createDocument: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)
      
      if (input.projectId) {
        requireProjectAccess(context, input.projectId)
      }

      const document = await prisma.document.create({
        data: {
          title: input.title,
          content: input.content,
          type: input.type || "TEXT",
          projectId: input.projectId,
          userId: input.projectId ? null : user.id, // Personal document if no project
        },
        include: {
          project: true,
        },
      })

      // Create activity
      await prisma.activity.create({
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

      const existingDocument = await prisma.document.findUnique({
        where: { id },
      })

      if (existingDocument && existingDocument.projectId) {
        requireProjectAccess(context, existingDocument.projectId)
      }

      const document = await prisma.document.update({
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
      await prisma.activity.create({
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
      const document = await prisma.document.findUnique({
        where: { id },
      })

      if (document && document.projectId) {
        requireProjectAccess(context, document.projectId)
      }

      await prisma.document.delete({
        where: { id },
      })

      return true
    },
  },

  Document: {
    project: async (parent: any, _: any, context: Context) => {
      if (!parent.projectId) return null
      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      })
    },

    comments: async (parent: any, _: any, context: Context) => {
      return await prisma.comment.findMany({
        where: { documentId: parent.id },
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      })
    },

    activities: async (parent: any, _: any, context: Context) => {
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