// src/graphql/resolvers/lookupResolvers.ts
import { prisma } from "@/lib/prisma"; 
import { UserRole } from '@prisma/client';

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: UserRole }; 
}

const lookupResolvers = {
  Query: {
    getProjectSprintsLookup: async (
      _parent: any,
      { projectId }: { projectId: string },
      context: GraphQLContext
    ) => {
      if (!context.user) throw new Error("Authentication required.");
      if (!projectId) throw new Error("Project ID is required.");

      // LOGIC CHANGE: "Active" sprint is defined as the most recently created one.
      // We sort by createdAt DESC.
      return prisma.sprint.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { createdAt: 'desc' }, 
      });
    },

    getProjectMembersLookup: async (
      _parent: any,
      { projectId }: { projectId: string },
      context: GraphQLContext
    ) => {
      if (!context.user) throw new Error("Authentication required.");
      if (!projectId) throw new Error("Project ID is required.");
      
      return prisma.projectMember.findMany({
        where: { projectId },
        select: {
          id: true, 
          role: true,
          user: {
            select: {
              id: true, 
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      });
    },

    getProjectTasksLookup: async (
        _parent: any,
        { projectId, sprintId }: { projectId: string; sprintId?: string },
        context: GraphQLContext
      ) => {
        if (!context.user) throw new Error("Authentication required.");
        if (!projectId) throw new Error("Project ID is required.");
        
        return prisma.task.findMany({
          where: {
            projectId,
            sprintId: sprintId || undefined, 
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            endDate: true,
            assignee: {
              select: { id: true, firstName: true, lastName: true },
            },
            sprint: {
                select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 100, // Increased limit to ensure the item picker has data to show
        });
      },

    getProjectDocumentsLookup: async (
        _parent: any,
        { projectId }: { projectId: string },
        context: GraphQLContext
      ) => {
        if (!context.user) throw new Error("Authentication required.");
        if (!projectId) throw new Error("Project ID is required.");

        return prisma.document.findMany({
          where: { projectId },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            content: true, // Needed for type inference
            dataUrl: true  // Needed for type inference
          },
          orderBy: { updatedAt: 'desc' },
          take: 100, // Increased limit
        });
    },

    getWorkspaceDataLookup: async (
        _parent: any,
        { workspaceId }: { workspaceId: string },
        context: GraphQLContext
    ) => {
        if (!context.user) throw new Error("Authentication required.");
        if (!workspaceId) throw new Error("Workspace ID is required.");

        return prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                name: true,
                owner: { select: { id: true, firstName: true, lastName: true } },
                members: {
                    select: {
                        id: true,
                        role: true,
                        user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    },
                },
            },
        });
    },
    
  },

  DocumentListItem: {
    type: (parent: any) => {
      // Logic to determine if it's a 'doc' or 'pdf' based on content/dataUrl
      return parent.content ? 'doc' : (parent.dataUrl ? 'pdf' : 'unknown');
    }
  }
};

export default lookupResolvers;