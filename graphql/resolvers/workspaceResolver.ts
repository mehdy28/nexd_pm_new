import { prisma } from "@/lib/prisma"
import { GraphQLError } from "graphql"
import { Plan } from "@prisma/client" // Import Plan enum for type safety

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

      // Find the first workspace the user is a member of.
      // In a multi-workspace context, you'd need a way to specify which one.
      const workspaceMember = await context.prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true },
      })

      if (!workspaceMember) {
        // This case should ideally not happen if a user is logged in,
        // but it's good practice to handle it.
        return null
      }

      let workspace = await context.prisma.workspace.findUnique({
        where: { id: workspaceMember.workspaceId },
        include: {
          owner: true,
          subscription: true,
          members: {
            include: {
              user: true,
            },
          },
          projects: true,
        },
      })

      // --- SOLUTION: DEFENSIVE CHECK FOR OLD DATA ---
      // If an old workspace is found without a plan, update it and refetch.
      if (workspace && !workspace.plan) {
        console.log(
          `[getWorkspaceData Resolver] Found old workspace (ID: ${workspace.id}) with null plan. Backfilling...`
        )
        workspace = await context.prisma.workspace.update({
          where: { id: workspace.id },
          data: { plan: Plan.FREE }, // Set the default plan
          include: {
            // Re-include all the necessary data
            owner: true,
            subscription: true,
            members: {
              include: {
                user: true,
              },
            },
            projects: true,
          },
        })
      }
      // --- END OF SOLUTION ---

      return workspace
    },

    // Placeholder for other workspace-related queries you might have
    // Example:
    // getWorkspaceDataLookup: async (_: any, { workspaceId }: { workspaceId: string }, context: GraphQLContext) => {
    //   // ... implementation ...
    // },
  },
  Mutation: {
    // Placeholder for any workspace-specific mutations
    // Example:
    // updateWorkspaceSettings: async (_: any, args: any, context: GraphQLContext) => {
    //   // ... implementation ...
    // },
  },
}

export default workspaceResolver