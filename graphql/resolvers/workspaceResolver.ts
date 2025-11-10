import { prisma } from "@/lib/prisma"; // Adjust path if necessary

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
}

export const workspaceResolver = {
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
                  // MODIFICATION: Filter projects to only include those the user is a member of.
                  where: {
                    members: {
                      some: {
                        userId: userId,
                      },
                    },
                  },
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
          tasks: undefined,
          _count: undefined,
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
    projectMemberCount: (project: any) => project.projectMemberCount,
    totalTaskCount: (project: any) => project.totalTaskCount,
    completedTaskCount: (project: any) => project.completedTaskCount,
  }
};

export default workspaceResolver;