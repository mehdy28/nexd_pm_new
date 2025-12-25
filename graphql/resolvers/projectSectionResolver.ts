// graphql/resolvers/projectSectionResolver.ts

import { prisma } from "@/lib/prisma";
import { GraphQLError } from "graphql"



interface ReorderSectionInput {
  id: string
  order: number
}

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

// Interfaces for section mutations
interface CreateProjectSectionArgs {
  projectId: string;
  name: string;
  order?: number;
}

interface UpdateProjectSectionArgs {
  id: string;
  name?: string;
  order?: number;
}


interface DeleteSectionOptions {
  deleteTasks: boolean;
  reassignToSectionId?: string | null; // Optional, required if deleteTasks is false
}

interface DeleteProjectSectionArgs {
  id: string;
  options: DeleteSectionOptions;
}

export const projectSectionResolver = {
  Mutation: {
    createProjectSection: async (_parent: unknown, args: CreateProjectSectionArgs, context: GraphQLContext) => {

      if (!context.user?.id) {
        throw new Error("Authentication required: No user ID found in context.");
      }

      const userId = context.user.id;
      const { projectId, name, order } = args;

      try {
        // Basic project membership check
        const projectMember = await prisma.projectMember.findFirst({
          where: { projectId: projectId, userId: userId },
        });

        if (!projectMember) {
          throw new Error("Access Denied: You are not a member of this project.");
        }

        // Determine the next order if not provided
        let sectionOrder = order;
        if (sectionOrder === undefined || sectionOrder === null) {
          const lastSection = await prisma.section.findFirst({
            where: { projectId: projectId },
            orderBy: { order: 'desc' },
          });
          sectionOrder = (lastSection?.order || 0) + 1;
        }

        const newSection = await prisma.section.create({
          data: {
            name,
            order: sectionOrder,
            project: { connect: { id: projectId } },
          },
          // Include tasks for consistency with ListView's SectionUI type
          include: {
            tasks: {
              include: {
                assignee: {
                  select: { id: true, firstName: true, lastName: true, avatar: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        });
        return newSection;

      } catch (error) {
        throw error;
      }
    },

    updateProjectSection: async (_parent: unknown, args: UpdateProjectSectionArgs, context: GraphQLContext) => {

      if (!context.user?.id) {
        throw new Error("Authentication required: No user ID found in context.");
      }

      const userId = context.user.id;
      const { id, name, order } = args;

      try {
        // Fetch the section to check ownership/membership and current project
        const sectionToUpdate = await prisma.section.findUnique({
          where: { id: id },
          include: {
            project: {
              include: {
                members: { where: { userId: userId } }, // Check if user is a member of this project
              },
            },
          },
        });

        if (!sectionToUpdate) {
          throw new Error(`Project Section with ID ${id} not found.`);
        }

        // Verify user is a member of the project that owns this section
        const isMember = sectionToUpdate.project?.members.length > 0;
        if (!isMember) {
          throw new Error("Access Denied: You are not authorized to update this project section.");
        }

        const updatedSection = await prisma.section.update({
          where: { id: id },
          data: {
            name: name ?? undefined,
            order: order ?? undefined,
          },
        });
        return updatedSection;

      } catch (error) {
        throw error;
      }
    },


    deleteProjectSection: async (_parent: unknown, args: DeleteProjectSectionArgs, context: GraphQLContext) => {
    
      if (!context.user?.id) {
        throw new Error("Authentication required: No user ID found in context.");
      }
    
      const userId = context.user.id;
      const { id: sectionIdToDelete, options } = args;
      const { deleteTasks, reassignToSectionId } = options;
    
      try {
        // 1. Fetch the section and its project to verify access
        const section = await prisma.section.findUnique({
          where: { id: sectionIdToDelete },
          include: {
            project: {
              select: {
                id: true,
                members: { where: { userId: userId } },
              },
            },
            tasks: { select: { id: true } }, // Just need to know if it has tasks
          },
        });
    
        if (!section) {
          throw new Error(`Project Section with ID ${sectionIdToDelete} not found.`);
        }
        if (!section.project || section.project.members.length === 0) {
          throw new Error("Access Denied: You are not authorized to delete this section.");
        }
    
        const projectId = section.project.id;
        const hasTasks = section.tasks.length > 0;
        let returnedSection: any = section; // The section to return (either deleted one or new default)
    
    
        // 2. Handle tasks based on options
        if (hasTasks) {
          if (deleteTasks) {
            // Delete all tasks associated with this section
            await prisma.task.deleteMany({
              where: { sectionId: sectionIdToDelete },
            });
            // Connections to sprints/projects (for project tasks) are automatically handled via onDelete: Cascade on Task
            // Connections to personalUser/workspace (for personal tasks) are untouched if they exist
          } else { // Reassign tasks
            if (!reassignToSectionId) {
              throw new Error("reassignToSectionId is required when not deleting tasks.");
            }
            // Validate that reassignToSectionId belongs to the same project
            const targetSection = await prisma.section.findUnique({
              where: { id: reassignToSectionId },
              select: { projectId: true }
            });
    
            if (!targetSection || targetSection.projectId !== projectId) {
              throw new Error("Invalid reassignToSectionId: target section not found or in a different project.");
            }
    
            // Update tasks to new section
            await prisma.task.updateMany({
              where: { sectionId: sectionIdToDelete },
              data: { sectionId: reassignToSectionId },
            });
          }
        }
    
        // 3. Delete the section itself
        await prisma.section.delete({
          where: { id: sectionIdToDelete },
        });
    
        // 4. Check if any sections are left for the project
        const remainingSectionsCount = await prisma.section.count({
          where: { projectId: projectId },
        });
    
        // 5. If no sections left, create a default one
        if (remainingSectionsCount === 0) {
          const newDefaultSection = await prisma.section.create({
            data: {
              name: "Backlog", // Default name
              order: 0,
              project: { connect: { id: projectId } },
            },
            include: { // Include tasks to match return type
              tasks: { // The relation to include
                orderBy: { createdAt: 'desc' }, // <--- FIXED: orderBy moved here
                include: {
                  assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                },
              },
              // Optionally include the project itself if needed in the return
              // project: true,
            },
          });
          returnedSection = newDefaultSection; // Return the new default section
        } else {
            // If sections remain and we need to return something, return the deleted section's ID/name.
            // GraphQL spec doesn't require us to return the *deleted* object itself after deletion,
            // but for consistency we'll return a representation of what was targeted, or the new default.
            returnedSection = { id: sectionIdToDelete, name: section.name, order: section.order, tasks: [] };
        }
    
        return returnedSection;
    
      } catch (error) {
        throw error;
      }
    },

    reorderProjectSections: async (
      _: any,
      { projectId, sections }: { projectId: string; sections: ReorderSectionInput[] },
      context: any
    ) => {
      const userId = context.user.id;

      if (!projectId || !sections || sections.length === 0) {
        throw new GraphQLError("Project ID and sections are required.", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      }

      try {
        // --- ADDED SECURITY CHECK ---
        // Ensure the user is actually a member of the project they are modifying.
        const projectMember = await prisma.projectMember.findFirst({
          where: {
            projectId: projectId,
            userId: userId,
          },
        })

        if (!projectMember) {
          throw new GraphQLError("You are not authorized to perform this action.", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        // Use a transaction to update all sections at once.
        // This ensures that if one update fails, all are rolled back.
        await prisma.$transaction(
          sections.map(section =>
            prisma.section.updateMany({
              where: {
                id: section.id,
                projectId: projectId, // Ensure we only update sections within this project
              },
              data: {
                order: section.order,
              },
            })
          )
        )

        // On success, fetch the updated sections to return them in the new order
        const updatedSections = await prisma.section.findMany({
          where: {
            projectId: projectId,
          },
          orderBy: {
            order: "asc",
          },
        })

        return updatedSections
      } catch (error: any) {
        // If the error is one we already threw (like GraphQLError), re-throw it.
        if (error instanceof GraphQLError) {
          throw error
        }

        throw new GraphQLError("An internal error occurred while reordering sections.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        })
      }
    },


  },
};

export default projectSectionResolver;



