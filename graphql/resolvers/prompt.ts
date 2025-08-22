// ./graphql/resolvers/prompt.ts

import type { Context } from "@/lib/apollo-server"
import { requireAuth, requireProjectAccess } from "@/lib/utils/auth"
import { prisma } from "@/lib/prisma"

export const promptResolvers = {
  Query: {
    prompts: async (_: any, { projectId, userId, personal }: { projectId?: string; userId?: string; personal?: boolean }, context: Context) => {
      const user = requireAuth(context)
      
      let where: any = {}
      
      if (personal || (!projectId && userId)) {
        // Personal prompts
        where.userId = user.id
        where.projectId = null
      } else if (projectId) {
        // Project prompts
        requireProjectAccess(context, projectId)
        where.projectId = projectId
      }

      return await prisma.prompt.findMany({
        where,
        orderBy: { createdAt: "desc" },
      })
    },
  },

  Mutation: {
    createPrompt: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAuth(context)
      
      if (input.projectId) {
        requireProjectAccess(context, input.projectId)
      }

      const prompt = await prisma.prompt.create({
        data: {
          title: input.title,
          content: input.content,
          description: input.description,
          category: input.category,
          tags: input.tags || [],
          isPublic: input.isPublic || false,
          projectId: input.projectId,
          userId: input.projectId ? null : user.id, // Personal prompt if no project
        },
        include: {
          project: true,
        },
      })

      // Create activity
      await prisma.activity.create({
        data: {
          type: "PROMPT_CREATED",
          data: { promptTitle: prompt.title },
          userId: user.id,
          projectId: prompt.projectId,
          promptId: prompt.id,
        },
      })

      return prompt
    },

    updatePrompt: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      const user = requireAuth(context)

      const existingPrompt = await prisma.prompt.findUnique({
        where: { id },
      })

      if (existingPrompt && existingPrompt.projectId) {
        requireProjectAccess(context, existingPrompt.projectId)
      }

      const prompt = await prisma.prompt.update({
        where: { id },
        data: {
          title: input.title,
          content: input.content,
          description: input.description,
          category: input.category,
          tags: input.tags,
          isPublic: input.isPublic,
        },
        include: {
          project: true,
        },
      })

      return prompt
    },

    deletePrompt: async (_: any, { id }: { id: string }, context: Context) => {
      const prompt = await prisma.prompt.findUnique({
        where: { id },
      })

      if (prompt && prompt.projectId) {
        requireProjectAccess(context, prompt.projectId)
      }

      await prisma.prompt.delete({
        where: { id },
      })

      return true
    },
  },

  Prompt: {
    project: async (parent: any, _: any, context: Context) => {
      if (!parent.projectId) return null
      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      })
    },

    comments: async (parent: any, _: any, context: Context) => {
      return await prisma.comment.findMany({
        where: { promptId: parent.id },
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      })
    },

    activities: async (parent: any, _: any, context: Context) => {
      return await prisma.activity.findMany({
        where: { promptId: parent.id },
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      })
    },
  },
}