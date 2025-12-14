import { prisma } from "@/lib/prisma";
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

// Helper for consistent logging
const log = (level: "info" | "warn" | "error", message: string, context?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [WHITEBOARD_RESOLVERS] [${level.toUpperCase()}] ${message}`);
  if (context) {
    console.log(`  Context: ${JSON.stringify(context)}`);
  }
};

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
      log("info", `${operation} called.`, { projectId, search, skip, take });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`, { projectId });
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id, projectId });

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

        log("info", `${operation}: Found ${Whiteboards.length} Whiteboards, total count is ${totalCount}.`, {
          projectId,
        });

        // FIX: Include the 'data' field in the mapped output
        const mappedWhiteboards = Whiteboards.map((wf) => ({
          id: wf.id,
          title: wf.title,
          updatedAt: wf.updatedAt.toISOString(),
          thumbnail: wf.thumbnail,
          projectId: wf.projectId,
          data: wf.data, // <-- Data is now included in the response object
          __typename: "WhiteboardListItem",
        }));

        return {
          Whiteboards: mappedWhiteboards,
          totalCount,
        };
      } catch (error: any) {
        log("error", `${operation}: Failed to fetch Whiteboards.`, {
          projectId,
          errorName: error.name,
          errorMessage: error.message,
        });
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
      log("info", `${operation} called.`, { WhiteboardId: id });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`, { WhiteboardId: id });
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id, WhiteboardId: id });

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
        log("error", `${operation}: Database error while fetching Whiteboard ${id}.`, {
          WhiteboardId: id,
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        });
        throw new GraphQLError(`Failed to retrieve Whiteboard details: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        });
      }

      if (!Whiteboard) {
        log("warn", `${operation}: Whiteboard ${id} not found.`, { WhiteboardId: id });
        return null;
      }
      log("info", `${operation}: Whiteboard ${id} found.`, {
        WhiteboardId: id,
        projectId: Whiteboard.projectId,
        ownerUserId: Whiteboard.userId,
      });

      // Authorization check
      let isAuthorized = false;
      if (Whiteboard.projectId) {
        // Project Whiteboard
        if (!Whiteboard.project) {
          log("error", `${operation}: Project data inconsistency (project relation missing).`, { WhiteboardId: id, projectId: Whiteboard.projectId });
          throw new GraphQLError("Project data inconsistency for this Whiteboard.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
        }

        const isProjectMember = await prisma.projectMember.findFirst({
          where: { projectId: Whiteboard.project.id, userId: user.id },
        });
        const isWorkspaceMember = await prisma.workspaceMember.findFirst({
          where: { workspaceId: Whiteboard.project.workspaceId, userId: user.id },
        });

        isAuthorized = !!isProjectMember || !!isWorkspaceMember;
        log("info", `${operation}: Project Whiteboard authorization check.`, {
          WhiteboardId: id, userId: user.id, isProjectMember: !!isProjectMember, isWorkspaceMember: !!isWorkspaceMember, authorized: isAuthorized
        });
      } else if (Whiteboard.userId) {
        // Personal Whiteboard
        isAuthorized = Whiteboard.userId === user.id;
        log("info", `${operation}: Personal Whiteboard authorization check.`, {
          WhiteboardId: id, userId: user.id, ownerUserId: Whiteboard.userId, authorized: isAuthorized
        });
      } else {
        log("error", `${operation}: Whiteboard ${id} has no associated project or user.`, { WhiteboardId: id });
        throw new GraphQLError("Whiteboard has no associated project or user.", { extensions: { code: "FORBIDDEN" } });
      }

      if (!isAuthorized) {
        log("warn", `${operation}: Forbidden: User ${user.id} not authorized to access Whiteboard ${id}.`, { WhiteboardId: id, userId: user.id });
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
      } as PrismaWhiteboardWithRelations & { __typename: 'Whiteboard'; comments: any[]; activities: any[] };

      log("info", `${operation}: Successfully retrieved details for ${id}.`, { WhiteboardId: id });
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
      log("info", `${operation} called.`, { input: { ...input, data: "[REDACTED]" } });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`);
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id });

      const { projectId, title, data, thumbnail } = input;

      if (!projectId) {
        log("warn", `${operation}: Validation Error: Project ID is required.`, { input });
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
        log("error", `${operation}: Database error fetching project for authorization.`, { projectId, errorName: error.name, errorMessage: error.message });
        throw new GraphQLError(`Failed to authorize Whiteboard creation: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }

      if (!projectContext) {
        log("warn", `${operation}: Project ${projectId} not found.`, { projectId });
        throw new GraphQLError("Project not found.", { extensions: { code: "NOT_FOUND" } });
      }

      const isProjectMember = projectContext.members.length > 0;
      const isWorkspaceMember = projectContext.workspace?.members.length > 0;

      if (!isProjectMember && !isWorkspaceMember) {
        log("warn", `${operation}: Forbidden: User ${user.id} not authorized to create Whiteboard in project ${projectId}.`, { projectId, userId: user.id });
        throw new GraphQLError("Forbidden: Not authorized to create Whiteboard in this project.", { extensions: { code: "FORBIDDEN" } });
      }
      log("info", `${operation}: User ${user.id} authorized to create Whiteboard.`, { projectId, userId: user.id });

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
        log("info", `${operation}: Whiteboard ${newWhiteboard.id} created.`, { WhiteboardId: newWhiteboard.id, title: newWhiteboard.title });

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
          log("info", `${operation}: Activity log created.`, { WhiteboardId: newWhiteboard.id, activityType: "WHITEBOARD_CREATED" });
        } catch (activityError: any) {
          log("warn", `${operation}: Failed to create activity log.`, { WhiteboardId: newWhiteboard.id, activityError: activityError.message });
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
        log("error", `${operation}: Failed to create Whiteboard.`, { errorName: error.name, errorMessage: error.message, stack: error.stack });
        throw new GraphQLError(`Failed to create Whiteboard: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }
    },

    updateWhiteboard: async (
      _parent: any,
      { input }: { input: UpdateWhiteboardInput },
      context: GraphQLContext,
    ): Promise<WhiteboardListItemOutput> => {
      const operation = "updateWhiteboard";
      log("info", `${operation} called.`, { input: { ...input, data: "[REDACTED]" } });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`);
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id });

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
        log("error", `${operation}: Database error fetching existing Whiteboard ${id} for authorization.`, { WhiteboardId: id, errorName: error.name, errorMessage: error.message });
        throw new GraphQLError(`Failed to authorize Whiteboard update: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }

      if (!existingWhiteboard) {
        log("warn", `${operation}: Whiteboard ${id} not found.`, { WhiteboardId: id });
        throw new GraphQLError("Whiteboard not found.", { extensions: { code: "NOT_FOUND" } });
      }
      log("info", `${operation}: Found existing Whiteboard for update.`, { WhiteboardId: id, projectId: existingWhiteboard.projectId, ownerUserId: existingWhiteboard.userId });

      let isAuthorized = false;
      if (existingWhiteboard.projectId) {
        if (!existingWhiteboard.project) {
          log("error", `${operation}: Project data inconsistency (project relation missing for existingWhiteboard).`, { WhiteboardId: id, projectId: existingWhiteboard.projectId });
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
        log("error", `${operation}: Whiteboard ${id} has no associated project or user.`, { WhiteboardId: id });
        throw new GraphQLError("Whiteboard has no associated project or user.", { extensions: { code: "FORBIDDEN" } });
      }

      if (!isAuthorized) {
        log("warn", `${operation}: Forbidden: User ${user.id} not authorized to update Whiteboard ${id}.`, { WhiteboardId: id, userId: user.id });
        throw new GraphQLError("Forbidden: Not authorized to update this Whiteboard", { extensions: { code: "FORBIDDEN" } });
      }
      log("info", `${operation}: User ${user.id} authorized to update Whiteboard ${id}.`, { WhiteboardId: id, userId: user.id });

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
        log("info", `${operation}: Whiteboard ${updatedWhiteboard.id} updated.`, { WhiteboardId: updatedWhiteboard.id, newTitle: updatedWhiteboard.title });

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
          log("info", `${operation}: Activity log created.`, { WhiteboardId: updatedWhiteboard.id, activityType: "WHITEBOARD_UPDATED" });
        } catch (activityError: any) {
          log("warn", `${operation}: Failed to create activity log.`, { WhiteboardId: updatedWhiteboard.id, activityError: activityError.message });
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
        log("error", `${operation}: Failed to update Whiteboard ${id}.`, { WhiteboardId: id, errorName: error.name, errorMessage: error.message, stack: error.stack });
        throw new GraphQLError(`Failed to update Whiteboard: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }
    },
    deleteWhiteboard: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<WhiteboardListItemOutput> => {
      const operation = "deleteWhiteboard";
      log("info", `${operation} called.`, { WhiteboardId: id });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`);
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id });

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
        log("error", `${operation}: Database error fetching existing Whiteboard ${id} for authorization.`, { WhiteboardId: id, errorName: error.name, errorMessage: error.message });
        throw new GraphQLError(`Failed to authorize Whiteboard deletion: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }

      if (!existingWhiteboard) {
        log("warn", `${operation}: Whiteboard ${id} not found.`, { WhiteboardId: id });
        throw new GraphQLError("Whiteboard not found.", { extensions: { code: "NOT_FOUND" } });
      }
      log("info", `${operation}: Found existing Whiteboard for deletion.`, { WhiteboardId: id, projectId: existingWhiteboard.projectId, ownerUserId: existingWhiteboard.userId });

      let isAuthorized = false;
      if (existingWhiteboard.projectId) {
        if (!existingWhiteboard.project) {
          log("error", `${operation}: Project data inconsistency (project relation missing for existingWhiteboard).`, { WhiteboardId: id, projectId: existingWhiteboard.projectId });
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
        log("error", `${operation}: Whiteboard ${id} has no associated project or user.`, { WhiteboardId: id });
        throw new GraphQLError("Whiteboard has no associated project or user.", { extensions: { code: "FORBIDDEN" } });
      }

      if (!isAuthorized) {
        log("warn", `${operation}: Forbidden: User ${user.id} not authorized to delete Whiteboard ${id}.`, { WhiteboardId: id, userId: user.id });
        throw new GraphQLError("Forbidden: Not authorized to delete this Whiteboard", { extensions: { code: "FORBIDDEN" } });
      }
      log("info", `${operation}: User ${user.id} authorized to delete Whiteboard ${id}.`, { WhiteboardId: id, userId: user.id });

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
         log("warn", `${operation}: Failed to fetch 'data' before deletion, proceeding with delete.`, { WhiteboardId: id });
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
        log("info", `${operation}: Whiteboard ${id} deleted.`, { WhiteboardId: id, title: existingWhiteboard.title });

        return deletedWhiteboardInfo;
      } catch (error: any) {
        log("error", `${operation}: Failed to delete Whiteboard ${id}.`, { WhiteboardId: id, errorName: error.name, errorMessage: error.message, stack: error.stack });
        throw new GraphQLError(`Failed to delete Whiteboard: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }
    },
        
    deleteManyWhiteboards: async (
      _parent: any,
      { ids }: { ids: string[] },
      context: GraphQLContext
    ): Promise<{ count: number }> => {
      const operation = "deleteManyWhiteboards";
      log("info", `${operation} called.`, { ids });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`);
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

        log("info", `${operation}: Successfully deleted ${count} Whiteboards.`);
        return { count };
      } catch (error: any) {
        log("error", `${operation}: Error deleting Whiteboards.`, { errorName: error.name, errorMessage: error.message });
        throw error;
      }
    },
  },

  Whiteboard: {
    project: async (parent: PrismaWhiteboardWithRelations, _args: any, context: GraphQLContext) => {
      const operation = "Whiteboard.project Type Resolver";
      log("info", `${operation} called for Whiteboard ${parent.id}.`, { WhiteboardId: parent.id, parentProjectId: parent.projectId });

      if (parent.project) {
        log("info", `${operation}: Project already present on parent.`, { WhiteboardId: parent.id, projectId: parent.project.id });
        return { ...parent.project, __typename: 'Project' };
      }

      if (parent.projectId) {
        log("info", `${operation}: Lazily fetching project.`, { WhiteboardId: parent.id, projectId: parent.projectId });
        try {
          const project = await prisma.project.findUnique({
            where: { id: parent.projectId },
            select: { id: true, name: true, workspaceId: true },
          });
          if (!project) {
             log("warn", `${operation}: Project ${parent.projectId} not found. Returning null.`, { WhiteboardId: parent.id, projectId: parent.projectId });
             return null;
          }
          log("info", `${operation}: Project ${project.id} fetched.`, { WhiteboardId: parent.id, projectId: project.id });
          return { ...project, __typename: 'Project' };
        } catch (error: any) {
          log("error", `${operation}: Database error fetching project.`, {
            WhiteboardId: parent.id, projectId: parent.projectId, errorName: error.name, errorMessage: error.message, stack: error.stack,
          });
          throw new GraphQLError(`Failed to resolve project for Whiteboard ${parent.id}: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
        }
      }

      log("info", `${operation}: No project or projectId found. Returning null.`, { WhiteboardId: parent.id });
      return null;
    },

    personalUser: async (parent: PrismaWhiteboardWithRelations, _args: any, context: GraphQLContext) => {
      const operation = "Whiteboard.personalUser Type Resolver";
      log("info", `${operation} called for Whiteboard ${parent.id}.`, { WhiteboardId: parent.id, parentUserId: parent.userId });

      if (parent.personalUser) {
        log("info", `${operation}: Personal user already present on parent.`, { WhiteboardId: parent.id, userId: parent.personalUser.id });
        return { ...parent.personalUser, __typename: 'User' };
      }

      if (parent.userId) {
        log("info", `${operation}: Lazily fetching personal user.`, { WhiteboardId: parent.id, userId: parent.userId });
        try {
          const user = await prisma.user.findUnique({
            where: { id: parent.userId },
            select: { id: true, firstName: true, lastName: true },
          });
          if (!user) {
             log("warn", `${operation}: User ${parent.userId} not found. Returning null.`, { WhiteboardId: parent.id, userId: parent.userId });
             return null;
          }
          log("info", `${operation}: User ${user.id} fetched.`, { WhiteboardId: parent.id, userId: user.id });
          return { ...user, __typename: 'User' };
        } catch (error: any) {
          log("error", `${operation}: Database error fetching user.`, {
            WhiteboardId: parent.id, userId: parent.userId, errorName: error.name, errorMessage: error.message, stack: error.stack,
          });
          throw new GraphQLError(`Failed to resolve personal user for Whiteboard ${parent.id}: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
        }
      }

      log("info", `${operation}: No personal user or userId found. Returning null.`, { WhiteboardId: parent.id });
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