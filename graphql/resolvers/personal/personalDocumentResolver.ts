import { GraphQLError } from "graphql"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import type { Block } from "@blocknote/core"

interface DocumentListItem {
  id: string
  title: string
  updatedAt: string
  type: "doc" | "pdf"
  projectId: string | null
}

interface DocumentsResponse {
  documents: DocumentListItem[]
  totalCount: number
}

interface CreatePersonalDocumentInput {
  title: string
  content: Block[] | null
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
          type: doc.dataUrl ? "pdf" : "doc",
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
      console.log("[getDocumentDetails Query] called with document ID:", id)
      const { user } = context

      if (!user?.id) {
        console.log("[getDocumentDetails Query] Authentication required: No user ID found.")
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      console.log("[getDocumentDetails Query] User authenticated:", user.id)

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
                  select: { id: true, firstName: true, lastName: true, avatar: true ,avatarColor:true},
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        })

        if (!document) {
          console.log(`[getDocumentDetails Query] Document with ID ${id} not found.`)
          return null
        }
        console.log(`[getDocumentDetails Query] Found document: ${document.title} (ID: ${document.id})`)

        const isProjectDocument = document.projectId !== null
        const isPersonalDocument = document.userId !== null

        let isAuthorized = false

        if (isPersonalDocument && document.userId === user.id) {
          isAuthorized = true
          console.log("[getDocumentDetails Query] Authorized: User is personal owner.")
        } else if (isProjectDocument && document.projectId) {
          // A more robust check would verify project membership here.
          isAuthorized = true
          console.log(
            "[getDocumentDetails Query] Authorized: Document is a project document (membership check skipped).",
          )
        }

        if (!isAuthorized) {
          console.log(
            "[getDocumentDetails Query] Authorization failed: User not authorized to access this document.",
          )
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
      console.log("[createPersonalDocument Mutation] called with input:", input)
      const { user } = context
      const { title, content, dataUrl } = input

      if (!user?.id) {
        console.log("[createPersonalDocument Mutation] Authentication required: No user ID found.")
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      console.log("[createPersonalDocument Mutation] User authenticated:", user.id)

      if (content === null && dataUrl === null) {
        console.log(
          "[createPersonalDocument Mutation] Validation Error: Document content or dataUrl is required.",
        )
        throw new GraphQLError("Document content or dataUrl is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      }

      try {
        const newDocument = await prisma.document.create({
          data: {
            title,
            content: content,
            dataUrl: dataUrl,
            personalUser: { connect: { id: user.id } },
          },
        })
        console.log(
          `[createPersonalDocument Mutation] Successfully created document: ${newDocument.title} (ID: ${newDocument.id})`,
        )

        const result = {
          id: newDocument.id,
          title: newDocument.title,
          updatedAt: newDocument.updatedAt.toISOString(),
          type: newDocument.dataUrl ? "pdf" : "doc",
          projectId: null,
        }
        console.log("[createPersonalDocument Mutation] Returning newly created personal document.")
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
      console.log("[updateDocument Mutation] called with input:", input)
      const { user } = context
      const { id, title, content, dataUrl } = input

      if (!user?.id) {
        console.log("[updateDocument Mutation] Authentication required: No user ID found.")
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      console.log("[updateDocument Mutation] User authenticated:", user.id)

      try {
        const existingDocument = await prisma.document.findUnique({
          where: { id },
          select: { projectId: true, userId: true },
        })

        if (!existingDocument) {
          console.log(`[updateDocument Mutation] Document with ID ${id} not found.`)
          throw new GraphQLError("Document not found", {
            extensions: { code: "NOT_FOUND" },
          })
        }
        console.log(`[updateDocument Mutation] Found existing document for update: ID ${id}`)

        let isAuthorized = false
        if (existingDocument.userId === user.id) {
          isAuthorized = true
          console.log("[updateDocument Mutation] Authorized: User is personal owner.")
        } else if (existingDocument.projectId) {
          isAuthorized = true
          console.log(
            "[updateDocument Mutation] Authorized: Document is a project document (membership check skipped).",
          )
        }

        if (!isAuthorized) {
          console.log(
            "[updateDocument Mutation] Authorization failed: User not authorized to update this document.",
          )
          throw new GraphQLError("Authorization required: Not authorized to update this document", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        const updatedDocument = await prisma.document.update({
          where: { id },
          data: {
            title: title ?? undefined,
            content: content !== undefined ? content : undefined,
            dataUrl: dataUrl !== undefined ? dataUrl : undefined,
          },
        })
        console.log(
          `[updateDocument Mutation] Successfully updated document: ${updatedDocument.title} (ID: ${updatedDocument.id})`,
        )

        const result = {
          id: updatedDocument.id,
          title: updatedDocument.title,
          updatedAt: updatedDocument.updatedAt.toISOString(),
          type: updatedDocument.dataUrl ? "pdf" : "doc",
          projectId: updatedDocument.projectId,
        }
        console.log("[updateDocument Mutation] Returning updated document.")
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
      console.log("[deleteDocument Mutation] called with document ID:", id)
      const { user } = context

      if (!user?.id) {
        console.log("[deleteDocument Mutation] Authentication required: No user ID found.")
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      console.log("[deleteDocument Mutation] User authenticated:", user.id)

      try {
        const existingDocument = await prisma.document.findUnique({
          where: { id },
          select: { projectId: true, userId: true },
        })

        if (!existingDocument) {
          console.log(`[deleteDocument Mutation] Document with ID ${id} not found.`)
          throw new GraphQLError("Document not found", {
            extensions: { code: "NOT_FOUND" },
          })
        }
        console.log(`[deleteDocument Mutation] Found existing document for deletion: ID ${id}`)

        let isAuthorized = false
        if (existingDocument.userId === user.id) {
          isAuthorized = true
          console.log("[deleteDocument Mutation] Authorized: User is personal owner.")
        } else if (existingDocument.projectId) {
          isAuthorized = true
          console.log(
            "[deleteDocument Mutation] Authorized: Document is a project document (membership check skipped).",
          )
        }

        if (!isAuthorized) {
          console.log(
            "[deleteDocument Mutation] Authorization failed: User not authorized to delete this document.",
          )
          throw new GraphQLError("Authorization required: Not authorized to delete this document", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        const deletedDocument = await prisma.document.delete({
          where: { id },
        })
        console.log(
          `[deleteDocument Mutation] Successfully deleted document: ${deletedDocument.title} (ID: ${deletedDocument.id})`,
        )

        const result = {
          id: deletedDocument.id,
          title: deletedDocument.title,
          updatedAt: deletedDocument.updatedAt.toISOString(),
          type: deletedDocument.dataUrl ? "pdf" : "doc",
          projectId: deletedDocument.projectId,
        }
        console.log("[deleteDocument Mutation] Returning deleted document info.")
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
      console.log(
        `[createDocumentComment Mutation] called for documentId: ${documentId} with content: "${content}"`,
      )
      const { user } = context
      if (!user?.id) {
        console.log("[createDocumentComment Mutation] Authentication required.")
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      // Check if document exists and if user has access (same logic as getDocumentDetails)
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { userId: true, projectId: true },
      })
      if (!document) {
        console.log(`[createDocumentComment Mutation] Document with ID ${documentId} not found.`)
        throw new GraphQLError("Document not found", { extensions: { code: "NOT_FOUND" } })
      }
      if (document.userId !== user.id && !document.projectId) {
        // Simple check for personal documents
        console.log(`[createDocumentComment Mutation] User ${user.id} not authorized for document ${documentId}.`)
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
            author: { select: { id: true, firstName: true, lastName: true, avatar: true ,avatarColor:true} },
          },
        })
        console.log(`[createDocumentComment Mutation] Successfully created comment ID: ${newComment.id}`)
        return newComment
      } catch (error) {
        console.error("[createDocumentComment Mutation] Error creating comment:", error)
        throw error
      }
    },
    deleteDocumentComment: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      console.log(`[deleteDocumentComment Mutation] called for comment ID: ${id}`)
      const { user } = context
      if (!user?.id) {
        console.log("[deleteDocumentComment Mutation] Authentication required.")
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const comment = await prisma.comment.findUnique({
        where: { id },
        select: { authorId: true },
      })

      if (!comment) {
        console.log(`[deleteDocumentComment Mutation] Comment with ID ${id} not found.`)
        throw new GraphQLError("Comment not found", { extensions: { code: "NOT_FOUND" } })
      }

      if (comment.authorId !== user.id) {
        console.log(`[deleteDocumentComment Mutation] User ${user.id} is not the author of comment ${id}.`)
        throw new GraphQLError("Not authorized to delete this comment", {
          extensions: { code: "FORBIDDEN" },
        })
      }

      try {
        const deletedComment = await prisma.comment.delete({
          where: { id },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true ,avatarColor:true} },
          },
        })
        console.log(`[deleteDocumentComment Mutation] Successfully deleted comment ID: ${deletedComment.id}`)
        return deletedComment
      } catch (error) {
        console.error(`[deleteDocumentComment Mutation] Error deleting comment ID ${id}:`, error)
        throw error
      }
    },
  },
}

export default personalDocumentResolvers