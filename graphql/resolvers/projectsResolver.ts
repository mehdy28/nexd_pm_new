import { prisma } from "@/lib/prisma";
import { Context } from "@/lib/apollo-server";

export const projectResolver = {
  Query: {
    project: (_parent: any, { id }: { id: string }, context: Context) => {
      const user = context.user;
      if (!user) {
        throw new Error("Authentication required");
      }
      return prisma.project.findUnique({
        where: { id },
        include: {
          members: {
            include: { user: true },
          },
          tasks: true,
          documents: true,
          wireframes: true,
          activities: true,
          sections: true, // Include sections
        },
      });
    },
    projects: (_parent: any, { workspaceId }: { workspaceId: string }, context: Context) => {
      const user = context.user;
      if (!user) {
        throw new Error("Authentication required");
      }
      return prisma.project.findMany({
        where: { workspaceId },
        include: {
          members: {
            include: { user: true },
          },
          tasks: true,
          documents: true,
          wireframes: true,
          activities: true,
          sections: true, // Include sections
        },
      });
    },
  },
  Mutation: {
    createProject: async (
      _parent: any,
      { input }: { input: { name: string; description?: string; color?: string; privacy?: string; workspaceId: string } },
      context: Context
    ) => {
      const user = context.user;
      if (!user) {
        throw new Error("Authentication required");
      }

      try {
        const project = await prisma.project.create({
          data: {
            name: input.name,
            description: input.description,
            color: input.color,
            privacy: input.privacy,
            workspaceId: input.workspaceId,
            members: {
              create: {
                userId: user.id,
                role: "ADMIN",
              },
            },
            sections: {
              createMany: {
                data: [
                  { name: "Ready", userId: user.id, workspaceId: input.workspaceId },
                  { name: "In Progress", userId: user.id, workspaceId: input.workspaceId },
                  { name: "To Do", userId: user.id, workspaceId: input.workspaceId },
                  { name: "Done", userId: user.id, workspaceId: input.workspaceId },
                ],
              },
            },
          },
          include: {
            members: {
              include: { user: true },
            },
            sections: true,
          },
        });

        return project;
      } catch (error) {
        console.error("Error creating project:", error);
        return null; //add a return null statement to return if catch error
      }
    },
  },
};