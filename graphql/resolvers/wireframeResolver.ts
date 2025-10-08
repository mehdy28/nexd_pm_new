// src/graphql/resolvers/wireframe.ts (or wherever your resolvers are located)

import { prisma } from "@/lib/prisma";
import { GraphQLError } from "graphql";

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

// Ensure JSON scalar type is handled by your GraphQL server setup
// If you're using Apollo Server, you might have something like:
// const resolvers = {
//   JSON: GraphQLJSON, // import GraphQLJSON from 'graphql-type-json';
//   // ... your other resolvers
// };
// For these types, we'll use 'any' as discussed.

const wireframeResolvers = {
  Query: {
    // Resolver for fetching a list of wireframes for a project
    getProjectWireframes: async (
      _parent: any,
      { projectId }: { projectId: string },
      context: GraphQLContext,
    ) => {
      console.log(`[Query] getProjectWireframes called for projectId: ${projectId}`);
      const { user } = context;

      if (!user) {
        console.warn("[Query] getProjectWireframes: Unauthorized - User not logged in.");
        throw new GraphQLError("Unauthorized: Must be logged in.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log(`[Query] getProjectWireframes: User ${user.id} is logged in.`);

      // Check if the user is a member of the project's workspace or the project itself
      const project = await context.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          workspace: {
            select: {
              members: {
                where: { userId: user.id },
              },
            },
          },
          members: {
            where: { userId: user.id },
          },
        },
      });

      const isWorkspaceMember = project?.workspace?.members?.length > 0;
      const isProjectMember = project?.members?.length > 0;

      if (!isWorkspaceMember && !isProjectMember) {
        console.warn(
          `[Query] getProjectWireframes: Forbidden - User ${user.id} not a member of project ${projectId} or its workspace.`,
        );
        throw new GraphQLError("Forbidden: Not a member of this project or its workspace.", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      console.log(
        `[Query] getProjectWireframes: User ${user.id} authorized for project ${projectId}.`,
      );

      const wireframes = await context.prisma.wireframe.findMany({
        where: {
          projectId: projectId,
        },
        orderBy: {
          updatedAt: "desc", // Default sort for list view
        },
        // Select specific fields for WireframeListItem
        select: {
          id: true,
          title: true,
          updatedAt: true,
          thumbnail: true,
          projectId: true, // Included for consistency with WireframeListItem
        },
      });

      console.log(
        `[Query] getProjectWireframes: Found ${wireframes.length} wireframes for project ${projectId}.`,
      );
      return wireframes;
    },

    // Resolver for fetching full details of a single wireframe
    getWireframeDetails: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      console.log(`[Query] getWireframeDetails called for wireframeId: ${id}`);
      const { user } = context;

      if (!user) {
        console.warn("[Query] getWireframeDetails: Unauthorized - User not logged in.");
        throw new GraphQLError("Unauthorized: Must be logged in.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log(`[Query] getWireframeDetails: User ${user.id} is logged in.`);

      const wireframe = await context.prisma.wireframe.findUnique({
        where: { id },
        include: {
          project: {
            select: { id: true, name: true, workspaceId: true }, // Select workspaceId to check membership
          },
          personalUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      if (!wireframe) {
        console.warn(`[Query] getWireframeDetails: Wireframe ${id} not found.`);
        throw new GraphQLError("Wireframe not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      console.log(
        `[Query] getWireframeDetails: Wireframe ${id} found. Project ID: ${wireframe.projectId}, User ID: ${wireframe.userId}.`,
      );

      // Authorization check:
      // 1. If it's a project wireframe, check project/workspace membership
      if (wireframe.projectId) {
        const project = wireframe.project;
        if (!project) {
          console.error(
            `[Query] getWireframeDetails: Project not found for wireframe ${id} despite having projectId set.`,
          );
          throw new GraphQLError("Project not found for this wireframe.", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }

        const isProjectMember = await context.prisma.projectMember.findFirst({
          where: {
            projectId: project.id,
            userId: user.id,
          },
        });

        const isWorkspaceMember = await context.prisma.workspaceMember.findFirst({
          where: {
            workspaceId: project.workspaceId,
            userId: user.id,
          },
        });

        if (!isProjectMember && !isWorkspaceMember) {
          console.warn(
            `[Query] getWireframeDetails: Forbidden - User ${user.id} not authorized for project wireframe ${id} (project: ${project.id}).`,
          );
          throw new GraphQLError("Forbidden: Not authorized to view this project wireframe.", {
            extensions: { code: "FORBIDDEN" },
          });
        }
        console.log(
          `[Query] getWireframeDetails: User ${user.id} authorized for project wireframe ${id}.`,
        );
      }
      // 2. If it's a personal wireframe, check if the user is the owner
      else if (wireframe.userId) {
        if (wireframe.userId !== user.id) {
          console.warn(
            `[Query] getWireframeDetails: Forbidden - User ${user.id} tried to access personal wireframe ${id} owned by ${wireframe.userId}.`,
          );
          throw new GraphQLError("Forbidden: Not authorized to view this personal wireframe.", {
            extensions: { code: "FORBIDDEN" },
          });
        }
        console.log(
          `[Query] getWireframeDetails: User ${user.id} authorized for personal wireframe ${id}.`,
        );
      }
      // 3. If neither projectId nor userId is set (should ideally not happen per schema), deny access
      else {
        console.error(
          `[Query] getWireframeDetails: Forbidden - Wireframe ${id} has no associated project or user.`,
        );
        throw new GraphQLError("Forbidden: Wireframe has no associated project or user.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      console.log(`[Query] getWireframeDetails: Successfully retrieved details for ${id}.`);
      return wireframe;
    },
  },

  Mutation: {
    // Resolver for creating a new wireframe
    createWireframe: async (
      _parent: any,
      { input }: { input: { projectId: string; title: string; data: any; thumbnail?: string } },
      context: GraphQLContext,
    ) => {
      console.log(`[Mutation] createWireframe called for projectId: ${input.projectId}`);
      const { user } = context;

      if (!user) {
        console.warn("[Mutation] createWireframe: Unauthorized - User not logged in.");
        throw new GraphQLError("Unauthorized: Must be logged in.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log(`[Mutation] createWireframe: User ${user.id} is logged in.`);

      const { projectId, title, data, thumbnail } = input;

      // Authorization: Check if user is a member of the project's workspace or the project itself
      const project = await context.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          workspace: {
            select: {
              members: {
                where: { userId: user.id },
              },
            },
          },
          members: {
            where: { userId: user.id },
          },
        },
      });


      const newWireframe = await context.prisma.wireframe.create({
        data: {
          title,
          data,
          thumbnail,
          projectId,
          userId: user.id, // Associate creator for activity/tracking, even if it's a project wireframe
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          thumbnail: true,
          projectId: true,
        },
      });

      console.log(
        `[Mutation] createWireframe: Wireframe ${newWireframe.id} '${newWireframe.title}' created in project ${projectId}.`,
      );

      // Optional: Create an activity entry
      await context.prisma.activity.create({
        data: {
          type: "WIREFRAME_CREATED",
          data: { wireframeTitle: newWireframe.title },
          userId: user.id,
          projectId: newWireframe.projectId,
          wireframeId: newWireframe.id,
        },
      });
      console.log(
        `[Mutation] createWireframe: Activity log for wireframe ${newWireframe.id} created.`,
      );

      return newWireframe;
    },

    // Resolver for updating an existing wireframe
    updateWireframe: async (
      _parent: any,
      { input }: { input: { id: string; title?: string; data?: any; thumbnail?: string } },
      context: GraphQLContext,
    ) => {
      console.log(`[Mutation] updateWireframe called for wireframeId: ${input.id}`);
      const { user } = context;

      if (!user) {
        console.warn("[Mutation] updateWireframe: Unauthorized - User not logged in.");
        throw new GraphQLError("Unauthorized: Must be logged in.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log(`[Mutation] updateWireframe: User ${user.id} is logged in.`);

      const { id, title, data, thumbnail } = input;

      const existingWireframe = await context.prisma.wireframe.findUnique({
        where: { id },
        select: {
          projectId: true,
          userId: true,
          project: {
            select: {
              workspace: {
                select: {
                  members: {
                    where: { userId: user.id },
                  },
                },
              },
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!existingWireframe) {
        console.warn(`[Mutation] updateWireframe: Wireframe ${id} not found.`);
        throw new GraphQLError("Wireframe not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      console.log(
        `[Mutation] updateWireframe: Wireframe ${id} found. Project ID: ${existingWireframe.projectId}, User ID: ${existingWireframe.userId}.`,
      );



      const updatedWireframe = await context.prisma.wireframe.update({
        where: { id },
        data: {
          title: title ?? undefined, // Only update if provided
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

      console.log(
        `[Mutation] updateWireframe: Wireframe ${updatedWireframe.id} updated. New title: ${updatedWireframe.title}.`,
      );

      // Optional: Create an activity entry
      await context.prisma.activity.create({
        data: {
          type: "WIREFRAME_UPDATED",
          data: { wireframeTitle: updatedWireframe.title },
          userId: user.id,
          projectId: updatedWireframe.projectId,
          wireframeId: updatedWireframe.id,
        },
      });
      console.log(
        `[Mutation] updateWireframe: Activity log for wireframe ${updatedWireframe.id} created.`,
      );

      return updatedWireframe;
    },

    // Resolver for deleting a wireframe
    deleteWireframe: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      console.log(`[Mutation] deleteWireframe called for wireframeId: ${id}`);
      const { user } = context;

      if (!user) {
        console.warn("[Mutation] deleteWireframe: Unauthorized - User not logged in.");
        throw new GraphQLError("Unauthorized: Must be logged in.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      console.log(`[Mutation] deleteWireframe: User ${user.id} is logged in.`);

      const existingWireframe = await context.prisma.wireframe.findUnique({
        where: { id },
        select: {
          projectId: true,
          userId: true,
          project: {
            select: {
              workspace: {
                select: {
                  members: {
                    where: { userId: user.id },
                  },
                },
              },
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!existingWireframe) {
        console.warn(`[Mutation] deleteWireframe: Wireframe ${id} not found.`);
        throw new GraphQLError("Wireframe not found.", {
          extensions: { code: "NOT_FOUND" },
        });
      }
      console.log(
        `[Mutation] deleteWireframe: Wireframe ${id} found. Project ID: ${existingWireframe.projectId}, User ID: ${existingWireframe.userId}.`,
      );


      // Delete the wireframe
      const deletedWireframe = await context.prisma.wireframe.delete({
        where: { id },
        select: {
          id: true,
          title: true,
          projectId: true,
          // Only return fields needed for WireframeListItem
        },
      });

      console.log(
        `[Mutation] deleteWireframe: Wireframe ${deletedWireframe.id} '${deletedWireframe.title}' successfully deleted.`,
      );

      // Optional: Create an activity entry
      await context.prisma.activity.create({
        data: {
          type: "WIREFRAME_DELETED", // Assuming you'll add this ActivityType
          data: { wireframeTitle: deletedWireframe.title },
          userId: user.id,
          projectId: deletedWireframe.projectId,
          wireframeId: deletedWireframe.id, // Store ID for historical reference
        },
      });
      console.log(
        `[Mutation] deleteWireframe: Activity log for deleted wireframe ${deletedWireframe.id} created.`,
      );

      return deletedWireframe;
    },
  },
  // You might also need a Wireframe Type Resolver if you have custom fields
  // Wireframe: {
  //   // Example: if you had a `createdBy` field on Wireframe type
  //   // createdBy: (parent, _args, context) => context.prisma.user.findUnique({ where: { id: parent.userId } }),
  // }
};

export default wireframeResolvers;