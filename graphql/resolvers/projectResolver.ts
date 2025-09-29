// graphql/resolvers/projectResolver.ts

import { prisma } from "@/lib/prisma"; // Adjust path if necessary
// REMOVED: import { IResolvers } from 'graphql-tools'; // Or your GraphQL server's type definition

// Consistent logging function
function log(prefix: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`${timestamp} ${prefix} ${message}`, data);
  } else {
    console.log(`${timestamp} ${prefix} ${message}`);
  }
}

// Define the context type
interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string }; // Authenticated user from AuthContextProvider
  // Add other context properties if necessary
}

// Arguments for the createProject mutation
interface CreateProjectArgs {
  workspaceId: string;
  name: string;
  description?: string;
}

// REMOVED: export const projectResolver: IResolvers<any, GraphQLContext> = {
// Changed to a plain object that adheres to the structure resolvers typically expect
export const projectResolver = {
  Mutation: {
    createProject: async (
      _parent: unknown,
      args: CreateProjectArgs,
      context: GraphQLContext
    ) => {
      log("[createProject Mutation]", "called with args:", args);

      if (!context.user?.id) {
        log("[createProject Mutation]", "No authenticated user found in context.");
        throw new Error("Authentication required: No user ID found in context.");
      }

      const userId = context.user.id;
      const { workspaceId, name, description } = args;

      try {
        // 1. Validate Workspace existence and user's membership (optional but good practice)
        const workspaceMember = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: workspaceId,
              userId: userId,
            },
          },
        });

        if (!workspaceMember) {
          log("[createProject Mutation]", `User ${userId} is not a member of workspace ${workspaceId}.`);
          throw new Error(`Forbidden: User is not a member of the specified workspace.`);
        }
        log("[createProject Mutation]", `User ${userId} is a member of workspace ${workspaceId}. Proceeding.`);

        // 2. Create the Project
        const project = await prisma.project.create({
          data: {
            name,
            description,
            workspace: { connect: { id: workspaceId } },
            // Default project color and status if not provided via args
            color: "#4ECDC4", // Using default from Prisma schema
            status: 'PLANNING', // Using default from Prisma schema
            members: {
              create: {
                userId: userId,
                role: 'OWNER', // The creator is the OWNER of this new project
              },
            },
          },
        });
        log("[createProject Mutation]", "Project created successfully:", { id: project.id, name: project.name });


        // 3. Create a default Sprint for the Project
        const now = new Date();
        const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await prisma.sprint.create({
          data: {
            name: "Initial Sprint",
            startDate: now,
            endDate: oneWeekLater,
            project: { connect: { id: project.id } },
          },
        });
        log("[createProject Mutation]", `Initial Sprint created for project ${project.id}.`);


        // 4. Create Default Sections for the Project
        const defaultProjectSections = ["To Do", "In Progress", "In Review", "Done"];
        await prisma.section.createMany({
          data: defaultProjectSections.map((secName, index) => ({
            name: secName,
            order: index,
            projectId: project.id,
          })),
        });
        log("[createProject Mutation]", `Default sections created for project ${project.id}.`);


        // 5. Fetch the newly created project with its relations for the return type
        const createdProject = await prisma.project.findUnique({
          where: { id: project.id },
          include: {
            members: { include: { user: true } },
            sprints: true,
            sections: true,
          },
        });

        if (!createdProject) {
          log("[createProject Mutation]", "Failed to retrieve the created project after creation steps.");
          throw new Error("Failed to retrieve the newly created project.");
        }
        log("[createProject Mutation]", "Project creation and setup complete. Returning project.", { id: createdProject.id, name: createdProject.name });
        return createdProject;

      } catch (error) {
        log("[createProject Mutation]", "Error creating project:", error);
        throw error;
      }
    },
  },
};

export default projectResolver;