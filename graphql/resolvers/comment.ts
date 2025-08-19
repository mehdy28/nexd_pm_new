import type { Context } from "@/lib/apollo-server"
import { requireAuth } from "@/lib/utils/auth"

export const commentResolvers = {
  Mutation: {
    createComment: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)

      const comment = await context.prisma.comment.create({
        data: {
          content: input.content,
          authorId: user.id,
          taskId: input.taskId,
          documentId: input.documentId,
          wireframeId: input.wireframeId,
        },
        include: {
          author: true,
        },
      })

      // Handle mentions if provided
      if (input.mentions && input.mentions.length > 0) {
        await context.prisma.mention.createMany({
          data: input.mentions.map((userId: string) => ({
            commentId: comment.id,
            userId,
          })),
        })
      }

      // Create activity
      await context.prisma.activity.create({
        data: {
          type: "COMMENT_ADDED",
          data: { commentContent: comment.content.substring(0, 100) },
          userId: user.id,
          taskId: input.taskId,
          documentId: input.documentId,
          wireframeId: input.wireframeId,
        },
      })

      return comment
    },

    updateComment: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      const user = requireAuth(context)

      return await context.prisma.comment.update({
        where: { id },
        data: {
          content: input.content,
        },
        include: {
          author: true,
        },
      })
    },

    deleteComment: async (_: any, { id }: { id: string }, context: Context) => {
      const user = requireAuth(context)

      await context.prisma.comment.delete({
        where: { id },
      })

      return true
    },
  },

  Comment: {
    author: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.user.findUnique({
        where: { id: parent.authorId },
      })
    },

    task: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.taskId) return null
      return await prisma.task.findUnique({
        where: { id: parent.taskId },
      })
    },

    document: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.documentId) return null
      return await prisma.document.findUnique({
        where: { id: parent.documentId },
      })
    },

    wireframe: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.wireframeId) return null
      return await prisma.wireframe.findUnique({
        where: { id: parent.wireframeId },
      })
    },

    mentions: async (parent: any, _: any, { prisma }: Context) => {
      const mentions = await prisma.mention.findMany({
        where: { commentId: parent.id },
        include: {
          user: true,
        },
      })
      return mentions.map((mention) => mention.user)
    },
  },
}
