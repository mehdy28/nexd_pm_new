// src/graphql/resolvers/lookupResolvers.ts
import { prisma } from "@/lib/prisma"; // Assuming this path
import { UserRole, WorkspaceRole, ProjectRole, SprintStatus, TaskStatus, Priority } from '@prisma/client';

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: UserRole }; // Use UserRole enum here
}

const lookupResolvers = {
  Query: {
    getProjectSprintsLookup: async (
      _parent: any,
      { projectId }: { projectId: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error("Authentication required.");
      }
      // TODO: Add authorization check - ensure user is a member of the project's workspace or project
      // For now, only check if projectId is provided
      if (!projectId) {
        throw new Error("Project ID is required to fetch sprints lookup data.");
      }

      return prisma.sprint.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: 'desc' },
      });
    },

    getProjectMembersLookup: async (
      _parent: any,
      { projectId }: { projectId: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error("Authentication required.");
      }
      if (!projectId) {
        throw new Error("Project ID is required to fetch project members lookup data.");
      }

      // TODO: Add authorization check - ensure user is a member of the project's workspace or project

      return prisma.projectMember.findMany({
        where: { projectId },
        select: {
          id: true, // This is ProjectMember ID
          role: true,
          user: {
            select: {
              id: true, // This is User ID
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
        if (!context.user) {
          throw new Error("Authentication required.");
        }
        if (!projectId) {
          throw new Error("Project ID is required to fetch project tasks lookup data.");
        }

        // TODO: Add authorization check

        return prisma.task.findMany({
          where: {
            projectId,
            sprintId: sprintId || undefined, // Filter by sprint if provided
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            sprint: {
                select: {
                    id: true,
                    name: true,
                }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50, // Limit for lookup to avoid too many options
        });
      },

    getProjectDocumentsLookup: async (
        _parent: any,
        { projectId }: { projectId: string },
        context: GraphQLContext
      ) => {
        if (!context.user) {
          throw new Error("Authentication required.");
        }
        if (!projectId) {
          throw new Error("Project ID is required to fetch project documents lookup data.");
        }

        // TODO: Add authorization check

        return prisma.document.findMany({
          where: { projectId },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            // Determine type for DocumentListItem based on content/dataUrl
            // This is a resolver-level computation, not a direct Prisma field
          },
          orderBy: { updatedAt: 'desc' },
          take: 50, // Limit for lookup
        });
    },

    getWorkspaceDataLookup: async (
        _parent: any,
        { workspaceId }: { workspaceId: string },
        context: GraphQLContext
    ) => {
        if (!context.user) {
          throw new Error("Authentication required.");
        }
        if (!workspaceId) {
            throw new Error("Workspace ID is required to fetch workspace data.");
        }
        // TODO: Authorization check: ensure user is a member of this workspace

        return prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                name: true,
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                members: {
                    select: {
                        id: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
    },
  },

  // Custom resolver for `type` field in DocumentListItem
  DocumentListItem: {
    type: (parent: any) => {
      // Logic to determine if it's a 'doc' or 'pdf' based on content/dataUrl
      return parent.content ? 'doc' : (parent.dataUrl ? 'pdf' : 'unknown');
    }
  }
};

export default lookupResolvers;