import { prisma } from "@/lib/prisma"
import { GraphQLError } from "graphql"
import { Plan, TaskStatus } from "@prisma/client"

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
  Mutation: {},
}

export default workspaceResolver