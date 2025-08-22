// graphql/resolvers/setup.ts
import { prisma } from "@/lib/prisma";
import { Context } from "@/lib/apollo-server";
import { generateSlug } from "@/lib/utils/formatting";

export const setupResolvers = {
  Mutation: {
    setupWorkspaceAndProject: async (
      _: any,
      { input }: { input: { workspaceName: string; workspaceDescription?: string; projectName: string; projectDescription?: string } },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const { workspaceName, workspaceDescription, projectName, projectDescription } = input;

      try {
        // 1. Create Workspace
        const workspace = await prisma.workspace.create({
          data: {
            name: workspaceName,
            slug: generateSlug(workspaceName),
            description: workspaceDescription,
            ownerId: context.user.id,
            members: {
              create: {
                userId: context.user.id,
                role: "OWNER",
              },
            },
            projects: {
              create: {
                name: projectName,
                description: projectDescription,
              },
            },
          },
          include: {
            projects: true,
          },
        });

        // Return the created workspace
        return workspace;
      } catch (error) {
        console.error("Error setting up workspace and project:", error);
        throw new Error("Could not set up workspace and project");
      }
    },
  },
};