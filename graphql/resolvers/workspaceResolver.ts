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
  prisma: typeof prisma; // Use the imported prisma instance type
  user?: { id: string; email: string; role: string }; // The authenticated user from your AuthContextProvider
  // Add other context properties if necessary, like decodedToken
}

// REMOVED: export const workspaceResolver: IResolvers<any, GraphQLContext> = {
export const workspaceResolver = { // Now a plain JavaScript object
  Query: {
    getWorkspaceData: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      log("[getWorkspaceData Query]", "called");

         if (!context.user?.id) {
         log("[getWorkspaceData Query]", "No authenticated user found in context.");
         throw new Error("Authentication required: No user ID found in context.");
       }

      const userId = context.user.id;
      log("[getWorkspaceData Query]", `Fetching data for userId: ${userId}`);

      try {
        // Find the user's workspaces where they are a member
        const workspaceMember = await prisma.workspaceMember.findFirst({
          where: { userId: userId },
          include: {
            workspace: {
              include: {
                members: {
                  include: { user: true }, // Include user details for each member
                },
                projects: {
                  include: {
                    _count: {
                      select: { members: true, tasks: true },
                    },
                    tasks: {
                      where: { status: "DONE" },
                      select: { id: true }, // Only need to count them
                    },
                  },
                },
              },
            },
          },
        });

        if (!workspaceMember) {
          log("[getWorkspaceData Query]", `No workspace found for user ID: ${userId}`);
          // A user might not have a workspace yet (e.g., just registered, going through setup)
          // You might return null or an empty object, depending on your UI's expectation for this state.
          // For this command, we'll return null if no workspace is found.
          return null;
        }

        const workspace = workspaceMember.workspace;
        log("[getWorkspaceData Query]", `Found workspace: ${workspace.name} (ID: ${workspace.id})`);


        // Transform projects to include custom counts
        const transformedProjects = workspace.projects.map(project => ({
          ...project,
          projectMemberCount: project._count.members,
          totalTaskCount: project._count.tasks, // Total tasks from _count.tasks
          completedTaskCount: project.tasks.length, // Number of tasks where status is DONE
          // Exclude the 'tasks' array which was only for counting finished tasks
          tasks: undefined, // Remove the specific tasks array from the returned project object
          _count: undefined, // Remove the raw _count object
        }));

        // Transform members to the desired output format (id, email, role in workspace)
        const transformedMembers = workspace.members.map(member => ({
          id: member.id, // WorkspaceMember ID
          role: member.role,
          user: {
            id: member.user.id,
            email: member.user.email,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            // Only expose necessary user fields
          },
        }));

        const result = {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          industry: workspace.industry,
          teamSize: workspace.teamSize,
          workFields: workspace.workFields,
          members: transformedMembers,
          projects: transformedProjects,
        };

        log("[getWorkspaceData Query]", "Workspace data fetched and transformed successfully.", result);
        return result;

      } catch (error) {
        log("[getWorkspaceData Query]", "Error fetching workspace data:", error);
        throw error;
      }
    },
  },
  // Custom field resolvers for Project
  Project: {
    // These fields are already computed and attached in the getWorkspaceData resolver
    // but they must also be defined in the Project type to be valid.
    projectMemberCount: (project: any) => project.projectMemberCount,
    totalTaskCount: (project: any) => project.totalTaskCount,
    completedTaskCount: (project: any) => project.completedTaskCount,
  }
};

export default workspaceResolver;