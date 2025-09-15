import { prisma } from "@/lib/prisma";
import { Context } from "@/lib/apollo-server";

export const setupResolver = {
  Mutation: {
    setupWorkspaceAndProject: async (
      _: any,
      { input }: any,
      context: Context
    ) => {
      console.log("Mutation called: setupWorkspaceAndProject");
      console.log("Input received:", input);

      const user = context.user;
      console.log("User from context:", user);

      if (!user || !user.id) {
        console.error("No user in context or missing Prisma user ID");
        throw new Error("Unauthorized");
      }

      const { workspaceName, workspaceDescription, projectName, projectDescription } = input;
      console.log("Using userId (Prisma DB ID):", user.id);

      let workspace;
      try {
        console.log("Creating workspace with:", {
          workspaceName,
          workspaceDescription,
          ownerId: user.id,
        });

        workspace = await prisma.workspace.create({
          data: {
            name: workspaceName,
            description: workspaceDescription,
            slug: workspaceName.toLowerCase().replace(/\s+/g, "-"),
            owner: { connect: { id: user.id } }, // Prisma ID
            members: {
              create: {
                userId: user.id, // Prisma ID
                role: "OWNER",
              },
            },
          },
          include: {
            members: {
              include: { user: true },
            },
            projects: true,
          },
        });

        console.log("Workspace created successfully:", workspace);
      } catch (err: any) {
        console.error("Error creating workspace:", err);
        throw err;
      }

      try {
        console.log("Creating project with:", {
          projectName,
          projectDescription,
          workspaceId: workspace.id,
        });

        const project = await prisma.project.create({
          data: {
            name: projectName,
            description: projectDescription,
            workspaceId: workspace.id,
            members: {
              create: {
                userId: user.id, // Prisma ID
                role: "ADMIN",
              },
            },
          },
        });

        console.log("Project created successfully:", project);
      } catch (err: any) {
        console.error("Error creating project:", err);
        throw err;
      }

      return workspace;
    },
  },
};
