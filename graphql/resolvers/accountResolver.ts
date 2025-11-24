// graphql/resolvers/accountResolver.ts
import { prisma } from "@/lib/prisma"
import { GraphQLError } from "graphql"

interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

interface UpdateNotificationSettingsInput {
  input: {
    atMention?: boolean
    taskAssigned?: boolean
    projectUpdates?: boolean
    productNews?: boolean
  }
}

export const accountResolver = {
  Query: {
    getMyNotificationSettings: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new GraphQLError("User is not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      const userId = context.user.id

      const settings = await prisma.userNotificationSettings.findUnique({
        where: { userId },
      })

      // If settings don't exist, create them with default values for a better UX
      if (!settings) {
        return prisma.userNotificationSettings.create({
          data: {
            userId,
            atMention: true,
            taskAssigned: true,
            projectUpdates: true,
            productNews: true,
          },
        })
      }

      return settings
    },

    getWorkspaceAuditLogs: async (
      _: any,
      { workspaceId, skip, take }: { workspaceId: string; skip: number; take: number },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new GraphQLError("User is not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      const userId = context.user.id

      // Authorization Check: Must be an OWNER or ADMIN of an ENTERPRISE plan workspace
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        include: {
          workspace: {
            select: { plan: true },
          },
        },
      })

      if (!member) {
        throw new GraphQLError("You are not a member of this workspace", {
          extensions: { code: "FORBIDDEN" },
        })
      }

      if (member.workspace.plan !== "ENTERPRISE") {
        throw new GraphQLError("This feature is only available for Enterprise plans", {
          extensions: { code: "FORBIDDEN" },
        })
      }

      if (member.role !== "OWNER" && member.role !== "ADMIN") {
        throw new GraphQLError("You do not have permission to view audit logs", {
          extensions: { code: "FORBIDDEN" },
        })
      }

      const [logs, totalCount] = await prisma.$transaction([
        prisma.auditLog.findMany({
          where: { workspaceId },
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            user: true, // Include the user who performed the action
          },
        }),
        prisma.auditLog.count({
          where: { workspaceId },
        }),
      ])

      return {
        logs,
        totalCount,
      }
    },
  },
  Mutation: {
    updateMyProfile: async (
      _: any,
      { 
        firstName, 
        lastName, 
        avatar, 
        avatarColor 
      }: { 
        firstName?: string; 
        lastName?: string; 
        avatar?: string; 
        avatarColor?: string 
      },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new GraphQLError("User is not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      const userId = context.user.id

      // Filter out undefined values so we only update what's provided
      const dataToUpdate: { firstName?: string; lastName?: string; avatar?: string; avatarColor?: string } = {}
      if (firstName !== undefined) dataToUpdate.firstName = firstName
      if (lastName !== undefined) dataToUpdate.lastName = lastName
      if (avatar !== undefined) dataToUpdate.avatar = avatar
      if (avatarColor !== undefined) dataToUpdate.avatarColor = avatarColor

      if (Object.keys(dataToUpdate).length === 0) {
        throw new GraphQLError("No profile information provided to update.", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      }

      return prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      })
    },

    updateMyNotificationSettings: async (
      _: any,
      { input }: UpdateNotificationSettingsInput,
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new GraphQLError("User is not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      const userId = context.user.id

      // The 'upsert' operation is perfect here.
      // It will UPDATE settings if they exist, or CREATE them if they don't.
      return prisma.userNotificationSettings.upsert({
        where: { userId: userId },
        update: {
          ...input,
        },
        create: {
          userId: userId,
          atMention: input.atMention ?? true,
          taskAssigned: input.taskAssigned ?? true,
          projectUpdates: input.projectUpdates ?? true,
          productNews: input.productNews ?? true,
        },
      })
    },
  },
}
