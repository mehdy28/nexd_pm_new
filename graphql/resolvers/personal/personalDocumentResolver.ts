//graphql/resolvers/personal/personalDocumentResolver.ts
import { GraphQLError } from "graphql"
import { prisma } from"@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { Block } from "@blocknote/core"

interface DocumentListItem {
  id: string
  title?: string
  updatedAt?: string
  type?: "doc" | "pdf"
  projectId?: string | null
}

interface DocumentsResponse {
  documents?: DocumentListItem[]
  totalCount?: number
}

interface CreatePersonalDocumentInput {
  title?: string
  content?: Block[] | null
  dataUrl?: string | null
}

interface UpdateDocumentInput {
  id: string
  title?: string
  content?: Block[] | null
  dataUrl?: string | null
}

interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

const personalDocumentResolvers = {
  Query: {
    getMyDocuments: async (
      _parent: any,
      { search, skip = 0, take = 12 }: { search?: string; skip?: number; take?: number },
      context: GraphQLContext,
    ): Promise<DocumentsResponse> => {
      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const where: Prisma.DocumentWhereInput = {
        userId: user.id,
        ...(search && {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }),
      }

      try {
        const [documents, totalCount] = await prisma.$transaction([
          prisma.document.findMany({
            where,
            skip,
            take,
            orderBy: { updatedAt: "desc" },
            select: { id: true, title: true, updatedAt: true, dataUrl: true, projectId: true },
          }),
          prisma.document.count({ where }),
        ])

        const mappedDocuments = documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          updatedAt: doc.updatedAt.toISOString(),
          type: doc.dataUrl ? ("pdf" as "pdf") : ("doc" as "doc"),
          projectId: doc.projectId,
        }))

        return {
          documents: mappedDocuments,
          totalCount,
        }
      } catch (error) {
        console.error("[getMyDocuments Query] Error fetching personal documents:", error)
        throw error
      }
    },
    getDocumentDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<any | null> => {
      const { user } = context

      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }

      try {
        const document = await prisma.document.findUnique({
          where: { id },
          include: {
            project: {
              select: { id: true, name: true, workspaceId: true },
            },
            personalUser: {
              select: { id: true, firstName: true, lastName: true },
            },
            comments: {
              include: {
                author: {
                  select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        })

        if (!document) {
          return null
        }

        const isProjectDocument = document.projectId !== null
        const isPersonalDocument = document.userId !== null

        let isAuthorized = false

        if (isPersonalDocument && document.userId === user.id) {
          isAuthorized = true
        } else if (isProjectDocument && document.projectId) {
          // A more robust check would verify project membership here.
          isAuthorized = true
        }

        if (!isAuthorized) {
          throw new GraphQLError("Authorization required: Not authorized to access this document", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        return document
      } catch (error) {
        console.error(`[getDocumentDetails Query] Error fetching document details for ID ${id}:`, error)
        throw error
      }
    },
  },
  Mutation: {
    createPersonalDocument: async (
      _parent: any,
      { input }: { input: CreatePersonalDocumentInput },
      context: GraphQLContext,
    ): Promise<DocumentListItem> => {
      const { user } = context
      const { title, content, dataUrl } = input

      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }

      if (content === null && dataUrl === null) {
        throw new GraphQLError("Document content or dataUrl is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      }

      try {
        const newDocument = await prisma.document.create({
          data: {
            title: title ?? "Untitled Document",
            content: content === null ? Prisma.JsonNull : content,
            dataUrl: dataUrl,
            personalUser: { connect: { id: user.id } },
          },
        })

        const result = {
          id: newDocument.id,
          title: newDocument.title,
          updatedAt: newDocument.updatedAt.toISOString(),
          type: newDocument.dataUrl ? ("pdf" as "pdf") : ("doc" as "doc"),
          projectId: null,
        }
        return result
      } catch (error) {
        console.error("[createPersonalDocument Mutation] Error creating personal document:", error)
        throw error
      }
    },
    updateDocument: async (
      _parent: any,
      { input }: { input: UpdateDocumentInput },
      context: GraphQLContext,
    ): Promise<DocumentListItem> => {
      const { user } = context
      const { id, title, content, dataUrl } = input

      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }

      try {
        const existingDocument = await prisma.document.findUnique({
          where: { id },
          select: { projectId: true, userId: true },
        })

        if (!existingDocument) {
          throw new GraphQLError("Document not found", {
            extensions: { code: "NOT_FOUND" },
          })
        }

        let isAuthorized = false
        if (existingDocument.userId === user.id) {
          isAuthorized = true
        } else if (existingDocument.projectId) {
          isAuthorized = true
        }

        if (!isAuthorized) {
          throw new GraphQLError("Authorization required: Not authorized to update this document", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        const updatedDocument = await prisma.document.update({
          where: { id },
          data: {
            title: title ?? undefined,
            content: content !== undefined ? (content === null ? Prisma.JsonNull : content) : undefined,
            dataUrl: dataUrl !== undefined ? dataUrl : undefined,
          },
        })

        const result = {
          id: updatedDocument.id,
          title: updatedDocument.title,
          updatedAt: updatedDocument.updatedAt.toISOString(),
          type: updatedDocument.dataUrl ? ("pdf" as "pdf") : ("doc" as "doc"),
          projectId: updatedDocument.projectId,
        }
        return result
      } catch (error) {
        console.error(`[updateDocument Mutation] Error updating document ID ${id}:`, error)
        throw error
      }
    },
    deleteDocument: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<DocumentListItem> => {
      const { user } = context

      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }

      try {
        const existingDocument = await prisma.document.findUnique({
          where: { id },
          select: { projectId: true, userId: true },
        })

        if (!existingDocument) {
          throw new GraphQLError("Document not found", {
            extensions: { code: "NOT_FOUND" },
          })
        }

        let isAuthorized = false
        if (existingDocument.userId === user.id) {
          isAuthorized = true
        } else if (existingDocument.projectId) {
          isAuthorized = true
        }

        if (!isAuthorized) {
          throw new GraphQLError("Authorization required: Not authorized to delete this document", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        const deletedDocument = await prisma.document.delete({
          where: { id },
        })

        const result = {
          id: deletedDocument.id,
          title: deletedDocument.title,
          updatedAt: deletedDocument.updatedAt.toISOString(),
          type: deletedDocument.dataUrl ? ("pdf" as "pdf") : ("doc" as "doc"),
          projectId: deletedDocument.projectId,
        }
        return result
      } catch (error) {
        console.error(`[deleteDocument Mutation] Error deleting document ID ${id}:`, error)
        throw error
      }
    },

    createDocumentComment: async (
      _parent: any,
      { documentId, content }: { documentId: string; content: string },
      context: GraphQLContext,
    ) => {
      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      // Check if document exists and if user has access (same logic as getDocumentDetails)
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { userId: true, projectId: true },
      })
      if (!document) {
        throw new GraphQLError("Document not found", { extensions: { code: "NOT_FOUND" } })
      }
      if (document.userId !== user.id && !document.projectId) {
        // Simple check for personal documents
        throw new GraphQLError("Not authorized", { extensions: { code: "FORBIDDEN" } })
      }
      // Add project membership check here if needed

      try {
        const newComment = await prisma.comment.create({
          data: {
            content,
            documentId,
            authorId: user.id,
          },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } },
          },
        })
        return newComment
      } catch (error) {
        console.error("[createDocumentComment Mutation] Error creating comment:", error)
        throw error
      }
    },
    deleteDocumentComment: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const comment = await prisma.comment.findUnique({
        where: { id },
        select: { authorId: true },
      })

      if (!comment) {
        throw new GraphQLError("Comment not found", { extensions: { code: "NOT_FOUND" } })
      }

      if (comment.authorId !== user.id) {
        throw new GraphQLError("Not authorized to delete this comment", {
          extensions: { code: "FORBIDDEN" },
        })
      }

      try {
        const deletedComment = await prisma.comment.delete({
          where: { id },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } },
          },
        })
        return deletedComment
      } catch (error) {
        console.error(`[deleteDocumentComment Mutation] Error deleting comment ID ${id}:`, error)
        throw error
      }
    },
  },
}

export default personalDocumentResolvers