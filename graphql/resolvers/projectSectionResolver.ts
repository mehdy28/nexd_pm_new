// graphql/resolvers/projectSectionResolver.ts

import { prisma } from "@/lib/prisma";

function log(prefix: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`${timestamp} ${prefix} ${message}`, data);
  } else {
    console.log(`${timestamp} ${prefix} ${message}`);
  }
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
      log("[createProjectSection Mutation]", "called with args:", args);

      if (!context.user?.id) {
        log("[createProjectSection Mutation]", "No authenticated user found in context.");
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
          log("[createProjectSection Mutation]", `User ${userId} is not a member of project ${projectId}. Access denied.`);
          throw new Error("Access Denied: You are not a member of this project.");
        }
        log("[createProjectSection Mutation]", `User ${userId} is a member of project ${projectId}. Creating section.`);

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
        log("[createProjectSection Mutation]", "Project Section created successfully:", { id: newSection.id, name: newSection.name });
        return newSection;

      } catch (error) {
        log("[createProjectSection Mutation]", "Error creating project section:", error);
        throw error;
      }
    },

    updateProjectSection: async (_parent: unknown, args: UpdateProjectSectionArgs, context: GraphQLContext) => {
      log("[updateProjectSection Mutation]", "called with args:", args);

      if (!context.user?.id) {
        log("[updateProjectSection Mutation]", "No authenticated user found in context.");
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
          log("[updateProjectSection Mutation]", `Project Section with ID ${id} not found.`);
          throw new Error(`Project Section with ID ${id} not found.`);
        }

        // Verify user is a member of the project that owns this section
        const isMember = sectionToUpdate.project?.members.length > 0;
        if (!isMember) {
          log("[updateProjectSection Mutation]", `User ${userId} is not a member of the project owning section ${id}. Access denied.`);
          throw new Error("Access Denied: You are not authorized to update this project section.");
        }
        log("[updateProjectSection Mutation]", `Access granted for user ${userId} to update project section ${id}.`);

        const updatedSection = await prisma.section.update({
          where: { id: id },
          data: {
            name: name ?? undefined,
            order: order ?? undefined,
          },
        });
        log("[updateProjectSection Mutation]", "Project Section updated successfully:", { id: updatedSection.id, name: updatedSection.name });
        return updatedSection;

      } catch (error) {
        log("[updateProjectSection Mutation]", "Error updating project section:", error);
        throw error;
      }
    },


    deleteProjectSection: async (_parent: unknown, args: DeleteProjectSectionArgs, context: GraphQLContext) => {
      log("[deleteProjectSection Mutation]", "called with args:", args);
    
      if (!context.user?.id) {
        log("[deleteProjectSection Mutation]", "No authenticated user found in context.");
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
          log("[deleteProjectSection Mutation]", `Project Section with ID ${sectionIdToDelete} not found.`);
          throw new Error(`Project Section with ID ${sectionIdToDelete} not found.`);
        }
        if (!section.project || section.project.members.length === 0) {
          log("[deleteProjectSection Mutation]", `User ${userId} is not a member of the project owning section ${sectionIdToDelete}. Access denied.`);
          throw new Error("Access Denied: You are not authorized to delete this section.");
        }
        log("[deleteProjectSection Mutation]", `Access granted for user ${userId} to delete section ${sectionIdToDelete}.`);
    
        const projectId = section.project.id;
        const hasTasks = section.tasks.length > 0;
        let returnedSection: any = section; // The section to return (either deleted one or new default)
    
    
        // 2. Handle tasks based on options
        if (hasTasks) {
          if (deleteTasks) {
            log("[deleteProjectSection Mutation]", `Deleting all ${section.tasks.length} tasks in section ${sectionIdToDelete}.`);
            // Delete all tasks associated with this section
            await prisma.task.deleteMany({
              where: { sectionId: sectionIdToDelete },
            });
            // Connections to sprints/projects (for project tasks) are automatically handled via onDelete: Cascade on Task
            // Connections to personalUser/workspace (for personal tasks) are untouched if they exist
          } else { // Reassign tasks
            if (!reassignToSectionId) {
              log("[deleteProjectSection Mutation]", `No reassignToSectionId provided for reassigning tasks in section ${sectionIdToDelete}.`);
              throw new Error("reassignToSectionId is required when not deleting tasks.");
            }
            // Validate that reassignToSectionId belongs to the same project
            const targetSection = await prisma.section.findUnique({
              where: { id: reassignToSectionId },
              select: { projectId: true }
            });
    
            if (!targetSection || targetSection.projectId !== projectId) {
              log("[deleteProjectSection Mutation]", `Reassign target section ${reassignToSectionId} not found or does not belong to project ${projectId}.`);
              throw new Error("Invalid reassignToSectionId: target section not found or in a different project.");
            }
    
            log("[deleteProjectSection Mutation]", `Reassigning tasks from section ${sectionIdToDelete} to section ${reassignToSectionId}.`);
            // Update tasks to new section
            await prisma.task.updateMany({
              where: { sectionId: sectionIdToDelete },
              data: { sectionId: reassignToSectionId },
            });
          }
        }
    
        // 3. Delete the section itself
        log("[deleteProjectSection Mutation]", `Deleting section ${sectionIdToDelete}.`);
        await prisma.section.delete({
          where: { id: sectionIdToDelete },
        });
    
        // 4. Check if any sections are left for the project
        const remainingSectionsCount = await prisma.section.count({
          where: { projectId: projectId },
        });
    
        // 5. If no sections left, create a default one
        if (remainingSectionsCount === 0) {
          log("[deleteProjectSection Mutation]", `No sections left for project ${projectId}. Creating a new default section.`);
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
          log("[deleteProjectSection Mutation]", `Created new default section: ${newDefaultSection.name} (ID: ${newDefaultSection.id}).`);
          returnedSection = newDefaultSection; // Return the new default section
        } else {
            // If sections remain and we need to return something, return the deleted section's ID/name.
            // GraphQL spec doesn't require us to return the *deleted* object itself after deletion,
            // but for consistency we'll return a representation of what was targeted, or the new default.
            returnedSection = { id: sectionIdToDelete, name: section.name, order: section.order, tasks: [] };
        }
    
        log("[deleteProjectSection Mutation]", "Project section deletion complete. Returning:", returnedSection);
        return returnedSection;
    
      } catch (error) {
        log("[deleteProjectSection Mutation]", "Error deleting project section:", error);
        throw error;
      }
    },
  },
};

export default projectSectionResolver;











