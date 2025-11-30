import { prisma } from "@/lib/prisma"
import { GraphQLError } from "graphql"
import { Plan, TaskStatus, WorkspaceRole } from "@prisma/client"

interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

export const workspaceResolver = {
  Query: {
    getWorkspaceData: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new GraphQLError("User is not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      const userId = context.user.id

      const workspaceMember = await context.prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true },
      })

      if (!workspaceMember) {
        return null
      }

      const includeArgs = {
        owner: true,
        subscription: true,
        members: {
          include: {
            user: true,
          },
        },
        projects: {
          include: {
            tasks: {
              select: {
                status: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      }

      let workspace = await context.prisma.workspace.findUnique({
        where: { id: workspaceMember.workspaceId },
        include: includeArgs,
      })

      if (workspace && !workspace.plan) {
        console.log(
          `[getWorkspaceData Resolver] Found old workspace (ID: ${workspace.id}) with null plan. Backfilling...`
        )
        workspace = await context.prisma.workspace.update({
          where: { id: workspace.id },
          data: { plan: Plan.FREE },
          include: includeArgs,
        })
      }

      if (!workspace) {
        return null
      }

      const projectsWithCounts = workspace.projects.map(project => {
        const { tasks, _count, ...restOfProject } = project
        return {
          ...restOfProject,
          projectMemberCount: _count.members,
          totalTaskCount: tasks.length,
          completedTaskCount: tasks.filter(
            task => task.status === TaskStatus.DONE
          ).length,
        }
      })

      return {
        ...workspace,
        projects: projectsWithCounts,
      }
    },
  },
  Mutation: {
    updateWorkspace: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      console.log("LOG: [updateWorkspace] - Mutation started.");

      if (!context.user) {
        console.error("LOG: [updateWorkspace] - Error: User is not authenticated.");
        throw new GraphQLError("User is not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      const userId = context.user.id;
      console.log(`LOG: [updateWorkspace] - Authenticated user ID: ${userId}`);
      
      const { id: workspaceId, ...dataToUpdate } = input;
      console.log(`LOG: [updateWorkspace] - Received workspace ID: ${workspaceId}`);
      console.log("LOG: [updateWorkspace] - Received data to update:", JSON.stringify(dataToUpdate, null, 2));

      console.log("LOG: [updateWorkspace] - Checking user authorization...");
      const member = await context.prisma.workspaceMember.findFirst({
        where: {
          userId: userId,
          workspaceId: workspaceId,
        },
      })

      if (!member) {
        console.error(`LOG: [updateWorkspace] - Authorization failed: User ${userId} is not a member of workspace ${workspaceId}.`);
        throw new GraphQLError("You are not authorized to perform this action", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (!["OWNER", "ADMIN"].includes(member.role as string)) {
        console.error(`LOG: [updateWorkspace] - Authorization failed: User ${userId} has role ${member.role}, which is not OWNER or ADMIN.`);
        throw new GraphQLError("You are not authorized to perform this action", {
          extensions: { code: "FORBIDDEN" },
        })
      }
      console.log(`LOG: [updateWorkspace] - User ${userId} is authorized with role: ${member.role}.`);
      
      try {
        console.log(`LOG: [updateWorkspace] - Attempting to update workspace ${workspaceId} in database...`);
        const updatedWorkspace = await context.prisma.workspace.update({
          where: { id: workspaceId },
          data: dataToUpdate,
        })

        if (!updatedWorkspace) {
            console.error(`LOG: [updateWorkspace] - Update failed: Prisma returned null for workspace ${workspaceId}.`);
            throw new GraphQLError("Workspace not found or update failed.", {
              extensions: { code: "NOT_FOUND" },
            })
        }
  
        console.log(`LOG: [updateWorkspace] - Successfully updated workspace ${workspaceId}.`);
        return updatedWorkspace;
      } catch (error: any) {
        console.error(`LOG: [updateWorkspace] - An error occurred during database update for workspace ${workspaceId}.`, error);

        if (error.code === 'P2025') {
            console.error(`LOG: [updateWorkspace] - Prisma error P2025: Record to update not found for workspace ${workspaceId}.`);
            throw new GraphQLError(`Workspace with ID ${workspaceId} not found.`, {
                extensions: { code: "NOT_FOUND" },
            });
        }

        throw new GraphQLError("Could not update the workspace.", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
}

export default workspaceResolver;