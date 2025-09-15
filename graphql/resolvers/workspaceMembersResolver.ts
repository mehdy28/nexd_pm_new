// resolvers/workspaceMemberResolver.ts
import { prisma } from "@/lib/prisma";

export const workspaceMemberResolver = {
  Query: {
    workspaceMembers: (_parent: any, { workspaceId }: { workspaceId: string }) => {
      return prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: true },
      });
    },
  },
};
