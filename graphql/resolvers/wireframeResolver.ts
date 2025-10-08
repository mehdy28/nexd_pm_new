// graphql/resolvers/wireframeResolver.ts

import { prisma } from "@/lib/prisma";
import { GraphQLError } from "graphql";
import type { Prisma } from "@prisma/client"; // Import Prisma types for full type safety

// Extend Prisma's Wireframe type to include relations we often fetch
type PrismaWireframeWithRelations = Prisma.WireframeGetPayload<{
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

// Input Types based on your Schema (for internal use, matching schema definitions)
interface CreateWireframeInput {
  projectId: string;
  title: string;
  data: any; // JSON scalar
  thumbnail?: string | null;
}

interface UpdateWireframeInput {
  id: string;
  title?: string | null;
  data?: any | null; // JSON scalar
  thumbnail?: string | null;
}

// Return Types based on your Schema (for internal use)
interface WireframeListItem {
  id: string;
  title: string;
  updatedAt: string; // ISO date string
  thumbnail: string | null;
  projectId: string;
  __typename: "WireframeListItem"; // Explicitly match type name
}

// Helper for consistent logging
const log = (level: "info" | "warn" | "error", message: string, context?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [WIREFRAME_RESOLVERS] [${level.toUpperCase()}] ${message}`);
  if (context) {
    console.log(`  Context: ${JSON.stringify(context)}`);
  }
};

const wireframeResolvers = {
  Query: {
    getProjectWireframes: async (
      _parent: any,
      { projectId }: { projectId: string },
      context: GraphQLContext,
    ): Promise<WireframeListItem[]> => {
      const operation = "getProjectWireframes";
      log("info", `${operation} called.`, { projectId });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`, { projectId });
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id, projectId });

      console.log(`della3a 1`);

      try {
        const wireframes = await context.prisma.wireframe.findMany({
          where: {
            projectId: projectId,
          },
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            thumbnail: true,
            projectId: true,
          },
        });

        log("info", `${operation}: Found ${wireframes.length} wireframes.`, { projectId, wireframeCount: wireframes.length });

        // Map to WireframeListItem and add __typename
        return wireframes.map((wf) => ({
          ...wf,
          updatedAt: wf.updatedAt.toISOString(), // Ensure ISO string format
          thumbnail: wf.thumbnail, // thumbnail can be null from DB
          __typename: "WireframeListItem", // Explicitly define __typename as per schema
        }));
      } catch (error: any) {
        log("error", `${operation}: Failed to fetch wireframes.`, {
          projectId,
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        });
        throw new GraphQLError(`Failed to retrieve wireframes: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        });
      }
    },

    getWireframeDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<PrismaWireframeWithRelations | null> => {
      const operation = "getWireframeDetails";
      log("info", `${operation} called.`, { wireframeId: id });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`, { wireframeId: id });
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id, wireframeId: id });

      let wireframe: PrismaWireframeWithRelations | null = null;
      try {
        wireframe = await context.prisma.wireframe.findUnique({
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
        log("error", `${operation}: Database error while fetching wireframe ${id}.`, {
          wireframeId: id,
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        });
        throw new GraphQLError(`Failed to retrieve wireframe details: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        });
      }

      if (!wireframe) {
        log("warn", `${operation}: Wireframe ${id} not found.`, { wireframeId: id });
        return null; // Return null if not found as per schema
      }
      log("info", `${operation}: Wireframe ${id} found.`, {
        wireframeId: id,
        projectId: wireframe.projectId,
        ownerUserId: wireframe.userId,
      });

      // Authorization check
      let isAuthorized = false;
      if (wireframe.projectId) {
        // Project wireframe
        if (!wireframe.project) {
          log("error", `${operation}: Project data inconsistency (project relation missing).`, { wireframeId: id, projectId: wireframe.projectId });
          throw new GraphQLError("Project data inconsistency for this wireframe.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
        }

        const isProjectMember = await context.prisma.projectMember.findFirst({
          where: { projectId: wireframe.project.id, userId: user.id },
        });
        const isWorkspaceMember = await context.prisma.workspaceMember.findFirst({
          where: { workspaceId: wireframe.project.workspaceId, userId: user.id },
        });

        isAuthorized = !!isProjectMember || !!isWorkspaceMember;
        log("info", `${operation}: Project wireframe authorization check.`, {
          wireframeId: id, userId: user.id, isProjectMember: !!isProjectMember, isWorkspaceMember: !!isWorkspaceMember, authorized: isAuthorized
        });
      } else if (wireframe.userId) {
        // Personal wireframe
        isAuthorized = wireframe.userId === user.id;
        log("info", `${operation}: Personal wireframe authorization check.`, {
          wireframeId: id, userId: user.id, ownerUserId: wireframe.userId, authorized: isAuthorized
        });
      } else {
        log("error", `${operation}: Wireframe ${id} has no associated project or user.`, { wireframeId: id });
        throw new GraphQLError("Wireframe has no associated project or user.", { extensions: { code: "FORBIDDEN" } });
      }

      if (!isAuthorized) {
        log("warn", `${operation}: Forbidden: User ${user.id} not authorized to access wireframe ${id}.`, { wireframeId: id, userId: user.id });
        throw new GraphQLError("Authorization required: Not authorized to access this wireframe", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      // Add __typename to the top-level wireframe object and nested relations
      const result = {
        ...wireframe,
        createdAt: wireframe.createdAt.toISOString(),
        updatedAt: wireframe.updatedAt.toISOString(),
        __typename: 'Wireframe', // As per schema Type Wireframe
        project: wireframe.project ? { ...wireframe.project, __typename: 'Project' } : null,
        personalUser: wireframe.personalUser ? { ...wireframe.personalUser, __typename: 'User' } : null,
        // Assuming comments and activities are handled by other resolvers or are always empty arrays here
        comments: [], // Placeholder, if not fetched
        activities: [], // Placeholder, if not fetched
      } as PrismaWireframeWithRelations & { __typename: 'Wireframe' }; // Type assertion to include __typename

      log("info", `${operation}: Successfully retrieved details for ${id}.`, { wireframeId: id });
      return result;
    },
  },

  Mutation: {
    createWireframe: async (
      _parent: any,
      { input }: { input: CreateWireframeInput },
      context: GraphQLContext,
    ): Promise<WireframeListItem> => {
      const operation = "createWireframe";
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

      // Validate input for projectId
      if (!projectId) {
        log("warn", `${operation}: Validation Error: Project ID is required.`, { input });
        throw new GraphQLError("Project ID is required to create a wireframe.", { extensions: { code: "BAD_USER_INPUT" } });
      }

      // Authorization: Check if user is a member of the project's workspace or the project itself
      let projectContext;
      try {
        projectContext = await context.prisma.project.findUnique({
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
        throw new GraphQLError(`Failed to authorize wireframe creation: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }

      if (!projectContext) {
        log("warn", `${operation}: Project ${projectId} not found.`, { projectId });
        throw new GraphQLError("Project not found.", { extensions: { code: "NOT_FOUND" } });
      }

      const isProjectMember = projectContext.members.length > 0;
      const isWorkspaceMember = projectContext.workspace?.members.length > 0;

      if (!isProjectMember && !isWorkspaceMember) {
        log("warn", `${operation}: Forbidden: User ${user.id} not authorized to create wireframe in project ${projectId}.`, { projectId, userId: user.id });
        throw new GraphQLError("Forbidden: Not authorized to create wireframe in this project.", { extensions: { code: "FORBIDDEN" } });
      }
      log("info", `${operation}: User ${user.id} authorized to create wireframe.`, { projectId, userId: user.id });

      let newWireframe;
      try {
        newWireframe = await context.prisma.wireframe.create({
          data: {
            title,
            data,
            thumbnail,
            projectId,
            userId: user.id, // Associate creator for activity/tracking
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            thumbnail: true,
            projectId: true,
          },
        });
        log("info", `${operation}: Wireframe ${newWireframe.id} created.`, { wireframeId: newWireframe.id, title: newWireframe.title });

        // Create activity log (non-critical, warn on failure)
        try {
          await context.prisma.activity.create({
            data: {
              type: "WIREFRAME_CREATED",
              data: { wireframeTitle: newWireframe.title },
              userId: user.id,
              projectId: newWireframe.projectId,
              wireframeId: newWireframe.id,
            },
          });
          log("info", `${operation}: Activity log created.`, { wireframeId: newWireframe.id, activityType: "WIREFRAME_CREATED" });
        } catch (activityError: any) {
          log("warn", `${operation}: Failed to create activity log.`, { wireframeId: newWireframe.id, activityError: activityError.message });
        }

        return {
          ...newWireframe,
          updatedAt: newWireframe.updatedAt.toISOString(),
          thumbnail: newWireframe.thumbnail,
          __typename: "WireframeListItem",
        };
      } catch (error: any) {
        log("error", `${operation}: Failed to create wireframe.`, { errorName: error.name, errorMessage: error.message, stack: error.stack });
        throw new GraphQLError(`Failed to create wireframe: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }
    },

    updateWireframe: async (
      _parent: any,
      { input }: { input: UpdateWireframeInput },
      context: GraphQLContext,
    ): Promise<WireframeListItem> => {
      const operation = "updateWireframe";
      log("info", `${operation} called.`, { input: { ...input, data: "[REDACTED]" } });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`);
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id });

      const { id, title, data, thumbnail } = input;

      let existingWireframe;
      try {
        existingWireframe = await context.prisma.wireframe.findUnique({
          where: { id },
          select: {
            id: true, projectId: true, userId: true, title: true, // Need title for activity log
            project: { select: { workspaceId: true, members: { where: { userId: user.id } } } },
            personalUser: { select: { id: true } }
          },
        });
      } catch (error: any) {
        log("error", `${operation}: Database error fetching existing wireframe ${id} for authorization.`, { wireframeId: id, errorName: error.name, errorMessage: error.message });
        throw new GraphQLError(`Failed to authorize wireframe update: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }

      if (!existingWireframe) {
        log("warn", `${operation}: Wireframe ${id} not found.`, { wireframeId: id });
        throw new GraphQLError("Wireframe not found.", { extensions: { code: "NOT_FOUND" } });
      }
      log("info", `${operation}: Found existing wireframe for update.`, { wireframeId: id, projectId: existingWireframe.projectId, ownerUserId: existingWireframe.userId });

      // Authorization checks
      let isAuthorized = false;
      if (existingWireframe.projectId) {
        if (!existingWireframe.project) {
          log("error", `${operation}: Project data inconsistency (project relation missing for existingWireframe).`, { wireframeId: id, projectId: existingWireframe.projectId });
          throw new GraphQLError("Project data inconsistency for this wireframe.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
        }
        const isProjectMember = existingWireframe.project.members.length > 0;
        const isWorkspaceMember = await context.prisma.workspaceMember.findFirst({
          where: { workspaceId: existingWireframe.project.workspaceId, userId: user.id },
        });
        isAuthorized = isProjectMember || !!isWorkspaceMember;
      } else if (existingWireframe.userId) {
        isAuthorized = existingWireframe.userId === user.id;
      } else {
        log("error", `${operation}: Wireframe ${id} has no associated project or user.`, { wireframeId: id });
        throw new GraphQLError("Wireframe has no associated project or user.", { extensions: { code: "FORBIDDEN" } });
      }

      if (!isAuthorized) {
        log("warn", `${operation}: Forbidden: User ${user.id} not authorized to update wireframe ${id}.`, { wireframeId: id, userId: user.id });
        throw new GraphQLError("Forbidden: Not authorized to update this wireframe", { extensions: { code: "FORBIDDEN" } });
      }
      log("info", `${operation}: User ${user.id} authorized to update wireframe ${id}.`, { wireframeId: id, userId: user.id });

      let updatedWireframe;
      try {
        updatedWireframe = await context.prisma.wireframe.update({
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
          },
        });
        log("info", `${operation}: Wireframe ${updatedWireframe.id} updated.`, { wireframeId: updatedWireframe.id, newTitle: updatedWireframe.title });

        // Create activity log (non-critical, warn on failure)
        try {
          await context.prisma.activity.create({
            data: {
              type: "WIREFRAME_UPDATED",
              data: { wireframeTitle: updatedWireframe.title },
              userId: user.id,
              projectId: updatedWireframe.projectId,
              wireframeId: updatedWireframe.id,
            },
          });
          log("info", `${operation}: Activity log created.`, { wireframeId: updatedWireframe.id, activityType: "WIREFRAME_UPDATED" });
        } catch (activityError: any) {
          log("warn", `${operation}: Failed to create activity log.`, { wireframeId: updatedWireframe.id, activityError: activityError.message });
        }

        return {
          ...updatedWireframe,
          updatedAt: updatedWireframe.updatedAt.toISOString(),
          thumbnail: updatedWireframe.thumbnail,
          __typename: "WireframeListItem",
        };
      } catch (error: any) {
        log("error", `${operation}: Failed to update wireframe ${id}.`, { wireframeId: id, errorName: error.name, errorMessage: error.message, stack: error.stack });
        throw new GraphQLError(`Failed to update wireframe: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }
    },

    deleteWireframe: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<WireframeListItem> => {
      const operation = "deleteWireframe";
      log("info", `${operation} called.`, { wireframeId: id });

      const { user } = context;
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`);
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id });

      let existingWireframe;
      try {
        existingWireframe = await context.prisma.wireframe.findUnique({
          where: { id },
          select: {
            id: true, title: true, projectId: true, userId: true, updatedAt: true, thumbnail: true, // Select all fields needed for WireframeListItem return
            project: { select: { workspaceId: true, members: { where: { userId: user.id } } } },
          },
        });
      } catch (error: any) {
        log("error", `${operation}: Database error fetching existing wireframe ${id} for authorization.`, { wireframeId: id, errorName: error.name, errorMessage: error.message });
        throw new GraphQLError(`Failed to authorize wireframe deletion: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }

      if (!existingWireframe) {
        log("warn", `${operation}: Wireframe ${id} not found.`, { wireframeId: id });
        throw new GraphQLError("Wireframe not found.", { extensions: { code: "NOT_FOUND" } });
      }
      log("info", `${operation}: Found existing wireframe for deletion.`, { wireframeId: id, projectId: existingWireframe.projectId, ownerUserId: existingWireframe.userId });

      // Authorization checks
      let isAuthorized = false;
      if (existingWireframe.projectId) {
        if (!existingWireframe.project) {
          log("error", `${operation}: Project data inconsistency (project relation missing for existingWireframe).`, { wireframeId: id, projectId: existingWireframe.projectId });
          throw new GraphQLError("Project data inconsistency for this wireframe.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
        }
        const isProjectMember = existingWireframe.project.members.length > 0;
        const isWorkspaceMember = await context.prisma.workspaceMember.findFirst({
          where: { workspaceId: existingWireframe.project.workspaceId, userId: user.id },
        });
        isAuthorized = isProjectMember || !!isWorkspaceMember; // Adjust logic if deletion requires higher role
      } else if (existingWireframe.userId) {
        isAuthorized = existingWireframe.userId === user.id;
      } else {
        log("error", `${operation}: Wireframe ${id} has no associated project or user.`, { wireframeId: id });
        throw new GraphQLError("Wireframe has no associated project or user.", { extensions: { code: "FORBIDDEN" } });
      }

      if (!isAuthorized) {
        log("warn", `${operation}: Forbidden: User ${user.id} not authorized to delete wireframe ${id}.`, { wireframeId: id, userId: user.id });
        throw new GraphQLError("Forbidden: Not authorized to delete this wireframe", { extensions: { code: "FORBIDDEN" } });
      }
      log("info", `${operation}: User ${user.id} authorized to delete wireframe ${id}.`, { wireframeId: id, userId: user.id });


      // Store info for return value before deletion
      const deletedWireframeInfo = {
        id: existingWireframe.id,
        title: existingWireframe.title,
        updatedAt: existingWireframe.updatedAt.toISOString(),
        thumbnail: existingWireframe.thumbnail,
        projectId: existingWireframe.projectId!, // projectId is nullable in DB, but if it exists here, it's safe to assert
        __typename: "WireframeListItem",
      };

      try {
        await context.prisma.wireframe.delete({
          where: { id },
        });
        log("info", `${operation}: Wireframe ${id} deleted.`, { wireframeId: id, title: existingWireframe.title });

        // Create activity log (non-critical, warn on failure)
        try {
          await context.prisma.activity.create({
            data: {
              type: "WIREFRAME_DELETED",
              data: { wireframeTitle: existingWireframe.title },
              userId: user.id,
              projectId: existingWireframe.projectId,
              wireframeId: existingWireframe.id,
            },
          });
          log("info", `${operation}: Activity log created.`, { wireframeId: existingWireframe.id, activityType: "WIREFRAME_DELETED" });
        } catch (activityError: any) {
          log("warn", `${operation}: Failed to create activity log.`, { wireframeId: existingWireframe.id, activityError: activityError.message });
        }

        return deletedWireframeInfo;
      } catch (error: any) {
        log("error", `${operation}: Failed to delete wireframe ${id}.`, { wireframeId: id, errorName: error.name, errorMessage: error.message, stack: error.stack });
        throw new GraphQLError(`Failed to delete wireframe: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
      }
    },
  },

  // Type resolvers for Wireframe fields not always eager-loaded by root queries
  Wireframe: {
    // TEMPORARILY REMOVING THE PROJECT RESOLVER TO DEBUG THE ROOT CAUSE
    // project: async (parent: PrismaWireframeWithRelations, _args: any, context: GraphQLContext) => {
    //   const operation = "Wireframe.project Type Resolver";
    //   log("info", `${operation} called for wireframe.`, { parentObject: parent, wireframeId: parent?.id, parentProjectId: parent?.projectId });

    //   if (parent && parent.project) {
    //     log("info", `${operation}: Project already present on parent for wireframe ${parent.id}.`, { wireframeId: parent.id, projectId: parent.project.id });
    //     return { ...parent.project, __typename: 'Project' };
    //   }

    //   if (parent && parent.projectId) {
    //     log("info", `${operation}: Lazily fetching project for wireframe ${parent.id} (projectId: ${parent.projectId}).`, { wireframeId: parent.id, projectId: parent.projectId });
    //     try {
    //       const project = await context.prisma.project.findUnique({
    //         where: { id: parent.projectId },
    //         select: { id: true, name: true, workspaceId: true },
    //       });
    //       if (!project) {
    //          log("warn", `${operation}: Project ${parent.projectId} not found for wireframe ${parent.id}. Returning null.`, { wireframeId: parent.id, projectId: parent.projectId });
    //          return null;
    //       }
    //       log("info", `${operation}: Project ${project.id} fetched for wireframe ${parent.id}.`, { wireframeId: parent.id, projectId: project.id });
    //       return { ...project, __typename: 'Project' };
    //     } catch (error: any) {
    //       log("error", `${operation}: Database error fetching project ${parent.projectId} for wireframe ${parent.id}.`, {
    //         wireframeId: parent.id, projectId: parent.projectId, errorName: error.name, errorMessage: error.message, stack: error.stack,
    //       });
    //       throw new GraphQLError(`Failed to resolve project for wireframe ${parent.id}: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
    //     }
    //   }

    //   log("info", `${operation}: No project found for wireframe ${parent?.id} (no projectId present on parent). Returning null.`, { wireframeId: parent?.id });
    //   return null;
    // },

    personalUser: async (parent: PrismaWireframeWithRelations, _args: any, context: GraphQLContext) => {
      const operation = "Wireframe.personalUser Type Resolver";

      // If personalUser data is already on the parent (eager-loaded), return it.
      if (parent.personalUser) {
        log("info", `${operation}: Personal user already present on parent for wireframe ${parent.id}.`, { wireframeId: parent.id, userId: parent.personalUser.id });
        return { ...parent.personalUser, __typename: 'User' };
      }

      // If not eager-loaded, but userId exists, fetch it.
      if (parent.userId) { // Assuming 'userId' is the field on Wireframe that links to the personal User
        log("info", `${operation}: Lazily fetching personal user for wireframe ${parent.id} (userId: ${parent.userId}).`, { wireframeId: parent.id, userId: parent.userId });
        try {
          const user = await context.prisma.user.findUnique({
            where: { id: parent.userId },
            select: { id: true, firstName: true, lastName: true },
          });
          if (!user) {
             log("warn", `${operation}: User ${parent.userId} not found for wireframe ${parent.id}. Returning null.`, { wireframeId: parent.id, userId: parent.userId });
             return null;
          }
          log("info", `${operation}: User ${user.id} fetched for wireframe ${parent.id}.`, { wireframeId: parent.id, userId: user.id });
          return { ...user, __typename: 'User' };
        } catch (error: any) {
          log("error", `${operation}: Database error fetching user ${parent.userId} for wireframe ${parent.id}.`, {
            wireframeId: parent.id, userId: parent.userId, errorName: error.name, errorMessage: error.message, stack: error.stack,
          });
          throw new GraphQLError(`Failed to resolve personal user for wireframe ${parent.id}: ${error.message}`, { extensions: { code: "DATABASE_ERROR" } });
        }
      }

      log("info", `${operation}: No personal user found for wireframe ${parent.id} (no userId present on parent). Returning null.`, { wireframeId: parent.id });
      return null;
    },
    comments: async (parent: PrismaWireframeWithRelations, _args: any, context: GraphQLContext) => {
        return [];
    },
    activities: async (parent: PrismaWireframeWithRelations, _args: any, context: GraphQLContext) => {
        return [];
    },
  },
};

export default wireframeResolvers;