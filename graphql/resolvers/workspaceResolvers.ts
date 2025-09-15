import { prisma } from "@/lib/prisma";

export const workspaceResolver = {
  Query: {
    workspacePageData: async (_parent: any, { userId }: { userId: string }) => {
      try {
        const workspace = await prisma.workspace.findFirst({
          where: {
            members: { some: { userId } },
          },
          include: {
            owner: true, // ✅ include owner
            projects: {
              include: {
                members: { include: { user: true } },
              },
            },
            members: { include: { user: true } },
          },
        });

        if (!workspace) {
          console.warn(`[workspaceResolver] No workspace found for userId=${userId}`);
          return {
            workspace: null,
            projects: [],
            members: [],
          };
        }

        console.log(`[workspaceResolver] Fetched workspace for userId=${userId}:`, workspace.id);

        return {
          workspace,
          projects: workspace.projects,
          members: workspace.members,
        };
      } catch (error: any) {
        console.error("[workspaceResolver] Failed to fetch workspace page data:", error);
        throw new Error("Internal server error while fetching workspace data");
      }
    },
  },
};
