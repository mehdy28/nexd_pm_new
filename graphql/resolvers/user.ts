// ./graphql/resolvers/user.ts

import type { Context } from "@/lib/apollo-server"
import { prisma } from "@/lib/prisma" // Import Prisma


export const userResolvers = {
  Query: {
    me: async (_: any, __: any, { user }: Context) => {
      if (!user) {
        throw new Error("Not authenticated")
      }

      // Get user from Prisma
      const prismaUser = await prisma.user.findUnique({
        where: { firebaseUid: user.id },
      })

      if (!prismaUser) {
        throw new Error("User not found in Prisma")
      }

      return prismaUser
    },
  },

  Mutation: {
    createUser: async (
      _: any,
      { input }: { input: { firebaseUid: string; email: string; firstName?: string; lastName?: string } },
      {}: Context
    ) => {
      try {
        const user = await prisma.user.create({
          data: {
            firebaseUid: input.firebaseUid,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
          },
        });
        return user;
      } catch (error) {
        console.error("Error creating user:", error);
        throw new Error("Could not create user");
      }
    },
  },

  User: {
    workspaceMembers: async (parent: any, _: any, {}: Context) => {
      return await prisma.workspaceMember.findMany({
        where: { userId: parent.id },
      })
    },

    ownedWorkspaces: async (parent: any, _: any, {}: Context) => {
      return await prisma.workspace.findMany({
        where: { ownerId: parent.id },
      })
    },

    projectMembers: async (parent: any, _: any, {}: Context) => {
      return await prisma.projectMember.findMany({
        where: { userId: parent.id },
      })
    },

    assignedTasks: async (parent: any, _: any, {}: Context) => {
      return await prisma.task.findMany({
        where: { assigneeId: parent.id },
      })
    },

    createdTasks: async (parent: any, _: any, {}: Context) => {
      return await prisma.task.findMany({
        where: { creatorId: parent.id },
      })
    },

    activities: async (parent: any, _: any, {}: Context) => {
      return await prisma.activity.findMany({
        where: { userId: parent.id },
      })
    },

    comments: async (parent: any, _: any, {}: Context) => {
      return await prisma.comment.findMany({
        where: { authorId: parent.id },
      })
    },
  },
}