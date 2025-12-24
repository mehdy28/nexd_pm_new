import { prisma } from "../../lib/prisma.js";
import { GraphQLError } from "graphql";
import type { Prisma } from "@prisma/client";

// Extend Prisma's Whiteboard type to include relations we often fetch
type PrismaWhiteboardWithRelations = Prisma.WhiteboardGetPayload<{
  include: {
    project: {
      select: { id: true; name: true; workspaceId: true };
    };
    personalUser: {
      select: { id: true; firstName: true; lastName: true };
    };
  };
}>;

// GraphQL Context Interface
interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

// Input Types based on your Schema
interface CreateWhiteboardInput {
  projectId: string;
  title: string;
  data: any; // JSON scalar
  thumbnail?: string | null;
}

interface UpdateWhiteboardInput {
  id: string;
  title?: string | null;
  data?: any | null; // JSON scalar
  thumbnail?: string | null;
}

// Return Type for WhiteboardListItem - ensure projectId matches schema nullability
interface WhiteboardListItemOutput {
  id: string;
  title: string;
  updatedAt: string; // ISO date string
  thumbnail: string | null;
  projectId: string | null; // Adjusted to be nullable based on typical Whiteboard model
  data: any | null; // ADDED: Include the data field here
  __typename: "WhiteboardListItem";
}

// NEW: Response shape for the paginated query
interface WhiteboardsResponse {
  Whiteboards: WhiteboardListItemOutput[];
  totalCount: number;
}



const WhiteboardResolvers = {
  Query: {
    getProjectWhiteboards: async (
      _parent: any,
      {
        projectId,
        search,
        skip = 0,
        take = 12,
      }: { projectId: string; search?: string; skip?: number; take?: number },
      context: GraphQLContext,
    ): Promise<WhiteboardsResponse> => {
      const operation = "getProjectWhiteboards";

      const { user } = context;
      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const where: Prisma.WhiteboardWhereInput = {
        projectId: projectId,
        ...(search && {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }),
      };

      try {
        const [Whiteboards, totalCount] = await prisma.$transaction([
          prisma.whiteboard.findMany({
            where,
            skip,
            take,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              title: true,
              updatedAt: true,
              data: true, // <-- Data is correctly selected from Prisma
              thumbnail: true,
              projectId: true,
            },
          }),
          prisma.whiteboard.count({ where }),
        ]);



        // FIX: Include the 'data' field in the mapped output
        const mappedWhiteboards = Whiteboards.map((wf) => ({
          id: wf.id,
          title: wf.title,
          updatedAt: wf.updatedAt.toISOString(),
          thumbnail: wf.thumbnail,
          projectId: wf.projectId,
          data: wf.data, // <-- Data is now included in the response object
          __typename: "WhiteboardListItem" as const,
        }));

        return {
          Whiteboards: mappedWhiteboards,
          totalCount,
        };
      } catch (error: any) {
        throw new GraphQLError(`Failed to retrieve Whiteboards: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        });
      }
    },

    getWhiteboardDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<PrismaWhiteboardWithRelations | null> => {
      const operation = "getWhiteboardDetails";

      const { user } = context;
      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      let Whiteboard: PrismaWhiteboardWithRelations | null = null;
      try {
        Whiteboard = await prisma.whiteboard.findUnique({
          where: { id },
          include: {
            project: {
              select: { id: true, name: true, workspaceId: true },
            },
            personalUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });
      } catch (error: any) {

        throw new GraphQLError(`Failed to retrieve Whiteboard details: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        });
      }

      if (!Whiteboard) {
        return null;
      }


      // Authorization check
      let isAuthorized = false;
      if (Whiteboard.projectId) {
        // Project Whiteboard
        if (!Whiteboard.project) {
          throw new GraphQLError("Project data inconsistency for this Whiteboard.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
        }

        const isProjectMember = await prisma.projectMember.findFirst({
          where: { projectId: Whiteboard.project.id, userId: user.id },
        });
        const isWorkspaceMember = await prisma.workspaceMember.findFirst({
          where: { workspaceId: Whiteboard.project.workspaceId, userId: user.id },
        });

        isAuthorized = !!isProjectMember || !!isWorkspaceMember;

      } else if (Whiteboard.userId) {
        // Personal Whiteboard
        isAuthorized = Whiteboard.userId === user.id;

      } else {
        throw new GraphQLError("Whiteboard has no associated project or user.", { extensions: { code: "FORBIDDEN" } });
      }

      if (!isAuthorized) {
        throw new GraphQLError("Authorization required: Not authorized to access this Whiteboard", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const result = {
        ...Whiteboard,
        createdAt: Whiteboard.createdAt.toISOString(),
        updatedAt: Whiteboard.updatedAt.toISOString(),
        __typename: 'Whiteboard',
        project: Whiteboard.project ? { ...Whiteboard.project, __typename: 'Project' } : null,
        personalUser: Whiteboard.personalUser ? { ...Whiteboard.personalUser, __typename: 'User' } : null,
        comments: [],
        activities: [],
      } as unknown as PrismaWhiteboardWithRelations & { __typename: 'Whiteboard'; comments: any[]; activities: any[] };

      return result;
    },
  },

  Mutation: {
    createWhiteboard: async (
      _parent: any,
      { input }: { input: CreateWhiteboardInput },
      context: GraphQLContext,
    ): Promise<WhiteboardListItemOutput> => {
      const operation = "createWhiteboard";

      const { user } = context;
      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const { projectId, title, data, thumbnail } = input;

      if (!projectId) {
        throw new GraphQLError("Project ID is required to create a Whiteboard.", { extensions: { code: "BAD_USER_INPUT" } });
      }

      let projectContext;
      try {
        projectContext = await prisma.project.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            workspaceId: true,
            members: { where: { userId: user.id } },
            workspace: { select: { members: { where: { userId: user.id } } } },
          },
        });
      } catch (error: any) {
        throw new GraphQLError(`Failed to authorize Whiteboard creation: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }

      if (!projectContext) {
        throw new GraphQLError("Project not found.", { extensions: { code: "NOT_FOUND" } });
      }

      const isProjectMember = projectContext.members.length > 0;
      const isWorkspaceMember = projectContext.workspace?.members.length > 0;

      if (!isProjectMember && !isWorkspaceMember) {
        throw new GraphQLError("Forbidden: Not authorized to create Whiteboard in this project.", { extensions: { code: "FORBIDDEN" } });
      }

      let newWhiteboard;
      try {
        newWhiteboard = await prisma.whiteboard.create({
          data: {
            title,
            data,
            thumbnail,
            projectId,
            userId: user.id,
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            thumbnail: true,
            projectId: true,
            data: true, // Also include data here for the return type (although not strictly necessary if schema allows null, better for consistency)
          },
        });

        try {
          await prisma.activity.create({
            data: {
              type: "WHITEBOARD_CREATED",
              data: { WhiteboardTitle: newWhiteboard.title },
              userId: user.id,
              projectId: newWhiteboard.projectId,
              WhiteboardId: newWhiteboard.id,
            },
          });
        } catch (activityError: any) {
        }

        return {
          id: newWhiteboard.id,
          title: newWhiteboard.title,
          updatedAt: newWhiteboard.updatedAt.toISOString(),
          thumbnail: newWhiteboard.thumbnail,
          projectId: newWhiteboard.projectId,
          data: newWhiteboard.data, // Return data here
          __typename: "WhiteboardListItem",
        };
      } catch (error: any) {
        throw new GraphQLError(`Failed to create Whiteboard: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }
    },

    updateWhiteboard: async (
      _parent: any,
      { input }: { input: UpdateWhiteboardInput },
      context: GraphQLContext,
    ): Promise<WhiteboardListItemOutput> => {
      const operation = "updateWhiteboard";

      const { user } = context;
      if (!user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
      }

      const { id, title, data, thumbnail } = input;

      let existingWhiteboard;
      try {
        existingWhiteboard = await prisma.whiteboard.findUnique({
          where: { id },
          select: {
            id: true, projectId: true, userId: true, title: true, updatedAt: true, thumbnail: true,
            project: { select: { workspaceId: true, members: { where: { userId: user.id } } } },
            personalUser: { select: { id: true } }
          },
        });
      } catch (error: any) {
        throw new GraphQLError(`Failed to authorize Whiteboard update: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }

      if (!existingWhiteboard) {
        throw new GraphQLError("Whiteboard not found.", { extensions: { code: "NOT_FOUND" } });
      }

      let isAuthorized = false;
      if (existingWhiteboard.projectId) {
        if (!existingWhiteboard.project) {
          throw new GraphQLError("Project data inconsistency for this Whiteboard.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
        }
        const isProjectMember = existingWhiteboard.project.members.length > 0;
        const isWorkspaceMember = await prisma.workspaceMember.findFirst({
          where: { workspaceId: existingWhiteboard.project.workspaceId, userId: user.id },
        });
        isAuthorized = isProjectMember || !!isWorkspaceMember;
      } else if (existingWhiteboard.userId) {
        isAuthorized = existingWhiteboard.userId === user.id;
      } else {
        throw new GraphQLError("Whiteboard has no associated project or user.", { extensions: { code: "FORBIDDEN" } });
      }

      if (!isAuthorized) {
        throw new GraphQLError("Forbidden: Not authorized to update this Whiteboard", { extensions: { code: "FORBIDDEN" } });
      }

      let updatedWhiteboard;
      try {
        updatedWhiteboard = await prisma.whiteboard.update({
          where: { id },
          data: {
            title: title ?? undefined,
            data: data ?? undefined,
            thumbnail: thumbnail ?? undefined,
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            thumbnail: true,
            projectId: true,
            data: true, // Include data to return
          },
        });

        try {
          await prisma.activity.create({
            data: {
              type: "WHITEBOARD_UPDATED",
              data: { WhiteboardTitle: updatedWhiteboard.title },
              userId: user.id,
              projectId: updatedWhiteboard.projectId,
              WhiteboardId: updatedWhiteboard.id,
            },
          });
        } catch (activityError: any) {
        }

        return {
          id: updatedWhiteboard.id,
          title: updatedWhiteboard.title,
          updatedAt: updatedWhiteboard.updatedAt.toISOString(),
          thumbnail: updatedWhiteboard.thumbnail,
          projectId: updatedWhiteboard.projectId,
          data: updatedWhiteboard.data, // Return data here
          __typename: "WhiteboardListItem",
        };
      } catch (error: any) {
        throw new GraphQLError(`Failed to update Whiteboard: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }
    },
    deleteWhiteboard: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<WhiteboardListItemOutput> => {
      const operation = "deleteWhiteboard";

      const { user } = context;
      if (!user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
      }

      let existingWhiteboard;
      try {
        existingWhiteboard = await prisma.whiteboard.findUnique({
          where: { id },
          select: {
            id: true, title: true, projectId: true, userId: true, updatedAt: true, thumbnail: true,
            project: { select: { workspaceId: true, members: { where: { userId: user.id } } } },
          },
        });
      } catch (error: any) {
        throw new GraphQLError(`Failed to authorize Whiteboard deletion: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }

      if (!existingWhiteboard) {
        throw new GraphQLError("Whiteboard not found.", { extensions: { code: "NOT_FOUND" } });
      }

      let isAuthorized = false;
      if (existingWhiteboard.projectId) {
        if (!existingWhiteboard.project) {
          throw new GraphQLError("Project data inconsistency for this Whiteboard.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
        }
        const isProjectMember = existingWhiteboard.project.members.length > 0;
        const isWorkspaceMember = await prisma.workspaceMember.findFirst({
          where: { workspaceId: existingWhiteboard.project.workspaceId, userId: user.id },
        });
        isAuthorized = isProjectMember || !!isWorkspaceMember;
      } else if (existingWhiteboard.userId) {
        isAuthorized = existingWhiteboard.userId === user.id;
      } else {
        throw new GraphQLError("Whiteboard has no associated project or user.", { extensions: { code: "FORBIDDEN" } });
      }

      if (!isAuthorized) {
        throw new GraphQLError("Forbidden: Not authorized to delete this Whiteboard", { extensions: { code: "FORBIDDEN" } });
      }

      // NOTE: Since the delete operation returns the item *before* deletion, 
      // we must fetch the data field if the GraphQL schema requires it for the 
      // return type (WhiteboardListItemOutput).
      let WhiteboardBeforeDelete: { data: any | null } | null = null;
      try {
         WhiteboardBeforeDelete = await prisma.whiteboard.findUnique({
             where: { id },
             select: { data: true }
         });
      } catch (e) {
      }


      const deletedWhiteboardInfo: WhiteboardListItemOutput = {
        id: existingWhiteboard.id,
        title: existingWhiteboard.title,
        updatedAt: existingWhiteboard.updatedAt.toISOString(),
        thumbnail: existingWhiteboard.thumbnail,
        projectId: existingWhiteboard.projectId,
        data: WhiteboardBeforeDelete?.data ?? null, // Include data from the pre-fetch
        __typename: "WhiteboardListItem",
      };

      try {
        await prisma.whiteboard.delete({
          where: { id },
        });

        return deletedWhiteboardInfo;
      } catch (error: any) {
        throw new GraphQLError(`Failed to delete Whiteboard: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }
    },
        
    deleteManyWhiteboards: async (
      _parent: any,
      { ids }: { ids: string[] },
      context: GraphQLContext
    ): Promise<{ count: number }> => {
      const operation = "deleteManyWhiteboards";

      const { user } = context;
      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      if (!ids || ids.length === 0) {
        return { count: 0 };
      }

      try {
        // We use a direct deleteMany with OR logic to efficiently matching authorized Whiteboards.
        // It matches if the ID is in the list AND (the user owns it OR it belongs to a project).
        // This mirrors the logic in deleteManyDocuments.
        
        const { count } = await prisma.whiteboard.deleteMany({
          where: {
            id: { in: ids },
            OR: [
              { userId: user.id },            // User is the owner (personal Whiteboard)
              { projectId: { not: null } }    // Whiteboard belongs to a project
            ]
          },
        });

        return { count };
      } catch (error: any) {
        throw error;
      }
    },
  },

  Whiteboard: {
    project: async (parent: PrismaWhiteboardWithRelations, _args: any, context: GraphQLContext) => {
      const operation = "Whiteboard.project Type Resolver";

      if (parent.project) {
        return { ...parent.project, __typename: 'Project' };
      }

      if (parent.projectId) {
        try {
          const project = await prisma.project.findUnique({
            where: { id: parent.projectId },
            select: { id: true, name: true, workspaceId: true },
          });
          if (!project) {
             return null;
          }
          return { ...project, __typename: 'Project' };
        } catch (error: any) {

          throw new GraphQLError(`Failed to resolve project for Whiteboard ${parent.id}: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
        }
      }

      return null;
    },

    personalUser: async (parent: PrismaWhiteboardWithRelations, _args: any, context: GraphQLContext) => {
      const operation = "Whiteboard.personalUser Type Resolver";

      if (parent.personalUser) {
        return { ...parent.personalUser, __typename: 'User' };
      }

      if (parent.userId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: parent.userId },
            select: { id: true, firstName: true, lastName: true },
          });
          if (!user) {
             return null;
          }
          return { ...user, __typename: 'User' };
        } catch (error: any) {
  
          throw new GraphQLError(`Failed to resolve personal user for Whiteboard ${parent.id}: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
        }
      }

      return null;
    },
    comments: async (parent: PrismaWhiteboardWithRelations, _args: any, context: GraphQLContext) => {
        // Implement logic to fetch comments for the Whiteboard
        // For now, return an empty array if not implemented
        return [];
    },
    activities: async (parent: PrismaWhiteboardWithRelations, _args: any, context: GraphQLContext) => {
        // Implement logic to fetch activities for the Whiteboard
        // For now, return an empty array if not implemented
        return [];
    },
  },
};

export default WhiteboardResolvers;