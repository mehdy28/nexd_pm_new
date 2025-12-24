import { prisma } from "../../lib/prisma.js"
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

      if (!context.user) {
        throw new GraphQLError("User is not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      const userId = context.user.id;
      
      const { id: workspaceId, ...dataToUpdate } = input;
      const member = await context.prisma.workspaceMember.findFirst({
        where: {
          userId: userId,
          workspaceId: workspaceId,
        },
      })

      if (!member) {
        throw new GraphQLError("You are not authorized to perform this action", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (!["OWNER", "ADMIN"].includes(member.role as string)) {
        throw new GraphQLError("You are not authorized to perform this action", {
          extensions: { code: "FORBIDDEN" },
        })
      }
      
      try {
        const updatedWorkspace = await context.prisma.workspace.update({
          where: { id: workspaceId },
          data: dataToUpdate,
        })

        if (!updatedWorkspace) {
            throw new GraphQLError("Workspace not found or update failed.", {
              extensions: { code: "NOT_FOUND" },
            })
        }
    
        return updatedWorkspace;
      } catch   (error: any) {

        if (error.code === 'P2025') {
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