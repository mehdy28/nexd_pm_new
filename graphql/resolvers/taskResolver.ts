// graphql/resolvers/taskResolver.ts

import { prisma } from "@/lib/prisma";
import { TaskStatus, Priority } from "@prisma/client"; // Import Prisma enums

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

// Input types for mutations (matching GraphQL SDL and allowing null for optional fields)
interface CreateProjectTaskInput {
  projectId: string;
  sectionId: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  assigneeId?: string | null;
  sprintId?: string | null;
  points?: number | null;
  parentId?: string | null;
}

interface UpdateProjectTaskInput {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  assigneeId?: string | null;
  sprintId?: string | null;
  points?: number | null;
  parentId?: string | null;
  isCompleted?: boolean; // <--- ADD THIS
  sectionId?: string | null; // <--- ADD THIS
}


export const taskResolver = {
  Mutation: {
    createProjectTask: async (_parent: unknown, args: { input: CreateProjectTaskInput }, context: GraphQLContext) => {
      log("[createProjectTask Mutation]", "called with input:", args.input);

      if (!context.user?.id) {
        log("[createProjectTask Mutation]", "No authenticated user found in context.");
        throw new Error("Authentication required: No user ID found in context.");
      }

      const userId = context.user.id;
      const {
        projectId,
        sectionId,
        title,
        description,
        status,
        priority,
        dueDate,
        startDate,
        endDate,
        assigneeId,
        sprintId,
        points,
        parentId
      } = args.input;

      try {
        // 1. Basic Project/Section/Sprint/Assignee Validation
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, members: { where: { userId: userId }, select: { userId: true } } },
        });
        if (!project || project.members.length === 0) {
          log("[createProjectTask Mutation]", `User ${userId} is not a member of project ${projectId}. Access denied.`);
          throw new Error("Access Denied: You are not a member of this project.");
        }

        const section = await prisma.section.findUnique({ where: { id: sectionId } });
        if (!section || section.projectId !== projectId) {
          log("[createProjectTask Mutation]", `Section ${sectionId} not found or doesn't belong to project ${projectId}.`);
          throw new Error("Invalid section provided.");
        }

        if (sprintId !== null && sprintId !== undefined) { // Check for undefined also
          const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
          if (!sprint || sprint.projectId !== projectId) {
            log("[createProjectTask Mutation]", `Sprint ${sprintId} not found or doesn't belong to project ${projectId}.`);
            throw new Error("Invalid sprint provided.");
          }
        }

        if (assigneeId !== null && assigneeId !== undefined) { // Check for undefined also
          const assigneeMember = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: { projectId: projectId, userId: assigneeId }
            },
          });
          if (!assigneeMember) {
            log("[createProjectTask Mutation]", `Assignee ${assigneeId} is not a member of project ${projectId}.`);
            throw new Error("Assignee is not a member of this project.");
          }
        }
        log("[createProjectTask Mutation]", `Validation passed for task creation in project ${projectId}.`);

        // 2. Create the Task
        const newTask = await prisma.task.create({
          data: {
            title,
            description: description ?? null,
            status: status || 'TODO',
            priority: priority || 'MEDIUM',
            dueDate: dueDate ? new Date(dueDate) : null,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            projectId: projectId,
            sectionId: sectionId,
            sprintId: sprintId ?? null,
            assigneeId: assigneeId ?? null,
            creatorId: userId,
            points: points ?? 0,
            parentId: parentId ?? null,
            completed: (status || 'TODO') === 'DONE', // Set completed based on initial status
          },
          include: {
            assignee: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
        });
        log("[createProjectTask Mutation]", "Task created successfully:", { id: newTask.id, title: newTask.title });

        // Transform and return the task
        return {
          id: newTask.id,
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          dueDate: newTask.dueDate?.toISOString().split('T')[0] || null,
          points: newTask.points,
          completed: newTask.completed, // <--- Use the actual completed field
          assignee: newTask.assignee ? {
            id: newTask.assignee.id,
            firstName: newTask.assignee.firstName,
            lastName: newTask.assignee.lastName,
            avatar: newTask.assignee.avatar,
          } : null,
          sectionId: newTask.sectionId, // <--- Include this
          sprintId: newTask.sprintId,   // <--- Include this
        };

      } catch (error) {
        log("[createProjectTask Mutation]", "Error creating project task:", error);
        throw error;
      }
    },

    updateProjectTask: async (_parent: unknown, args: { input: UpdateProjectTaskInput }, context: GraphQLContext) => {
      log("[updateProjectTask Mutation]", "called with input:", args.input);

      if (!context.user?.id) {
        log("[updateProjectTask Mutation]", "No authenticated user found in context.");
        throw new Error("Authentication required: No user ID found in context.");
      }

      const userId = context.user.id;
      const { id: taskId, isCompleted, ...updates } = args.input; // Destructure isCompleted here

      try {
        const existingTask = await prisma.task.findUnique({
          where: { id: taskId },
          select: {
            id: true,
            projectId: true,
            project: { select: { members: { where: { userId: userId }, select: { userId: true } } } },
          },
        });

        if (!existingTask) {
          log("[updateProjectTask Mutation]", `Task with ID ${taskId} not found.`);
          throw new Error(`Task with ID ${taskId} not found.`);
        }
        if (!existingTask.project || existingTask.project.members.length === 0) {
          log("[updateProjectTask Mutation]", `User ${userId} is not a member of the project owning task ${taskId}. Access denied.`);
          throw new Error("Access Denied: You are not authorized to update this task.");
        }
        log("[updateProjectTask Mutation]", `Access granted for user ${userId} to update task ${taskId}.`);

        if (updates.sectionId !== undefined && updates.sectionId !== null) {
          const section = await prisma.section.findUnique({ where: { id: updates.sectionId } });
          if (!section || section.projectId !== existingTask.projectId) {
            log("[updateProjectTask Mutation]", `Updated section ${updates.sectionId} not found or doesn't belong to project ${existingTask.projectId}.`);
            throw new Error("Invalid section provided for update.");
          }
        }
        if (updates.sprintId !== undefined && updates.sprintId !== null) {
          const sprint = await prisma.sprint.findUnique({ where: { id: updates.sprintId } });
          if (!sprint || sprint.projectId !== existingTask.projectId) {
            log("[updateProjectTask Mutation]", `Updated sprint ${updates.sprintId} not found or doesn't belong to project ${existingTask.projectId}.`);
            throw new Error("Invalid sprint provided for update.");
          }
        }
        if (updates.assigneeId !== undefined && updates.assigneeId !== null) {
          const assigneeMember = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: { projectId: existingTask.projectId, userId: updates.assigneeId }
            },
          });
          if (!assigneeMember) {
            log("[updateProjectTask Mutation]", `Updated assignee ${updates.assigneeId} is not a member of project ${existingTask.projectId}.`);
            throw new Error("Assignee is not a member of this project.");
          }
        }

        const dataToUpdate: any = {};
        for (const key in updates) {
          if (Object.prototype.hasOwnProperty.call(updates, key)) {
            const value = (updates as any)[key];
            if (value !== undefined) {
              if (key === 'dueDate' || key === 'startDate' || key === 'endDate') {
                dataToUpdate[key] = value ? new Date(value) : null;
              } else {
                dataToUpdate[key] = value;
              }
            }
          }
        }

        // Handle `isCompleted` separately, mapping it to `status`
        if (isCompleted !== undefined) {
          dataToUpdate.completed = isCompleted;
          dataToUpdate.status = isCompleted ? 'DONE' : 'TODO';
        }

        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: dataToUpdate,
          include: {
            assignee: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
        });
        log("[updateProjectTask Mutation]", "Task updated successfully:", { id: updatedTask.id, title: updatedTask.title, updates: dataToUpdate });

        return {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          priority: updatedTask.priority,
          dueDate: updatedTask.dueDate?.toISOString().split('T')[0] || null,
          points: updatedTask.points,
          completed: updatedTask.completed, // <--- Use the actual completed field
          assignee: updatedTask.assignee ? {
            id: updatedTask.assignee.id,
            firstName: updatedTask.assignee.firstName,
            lastName: updatedTask.assignee.lastName,
            avatar: updatedTask.assignee.avatar,
          } : null,
          sectionId: updatedTask.sectionId, // <--- Include this
          sprintId: updatedTask.sprintId,   // <--- Include this
        };

      } catch (error) {
        log("[updateProjectTask Mutation]", "Error updating project task:", error);
        throw error;
      }
    },

    deleteProjectTask: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      log("[deleteProjectTask Mutation]", "called with ID:", args.id);

      if (!context.user?.id) {
        log("[deleteProjectTask Mutation]", "No authenticated user found in context.");
        throw new Error("Authentication required: No user ID found in context.");
      }

      const userId = context.user.id;
      const taskId = args.id;

      try {
        const existingTask = await prisma.task.findUnique({
          where: { id: taskId },
          select: {
            id: true,
            projectId: true,
            project: { select: { members: { where: { userId: userId }, select: { userId: true } } } },
          },
        });

        if (!existingTask) {
          log("[deleteProjectTask Mutation]", `Task with ID ${taskId} not found.`);
          throw new Error(`Task with ID ${taskId} not found.`);
        }
        if (!existingTask.project || existingTask.project.members.length === 0) {
          log("[deleteProjectTask Mutation]", `User ${userId} is not a member of the project owning task ${taskId}. Access denied.`);
          throw new Error("Access Denied: You are not authorized to delete this task.");
        }
        log("[deleteProjectTask Mutation]", `Access granted for user ${userId} to delete task ${taskId}.`);

        const deletedTask = await prisma.task.delete({
          where: { id: taskId },
          select: { // Select enough fields to satisfy the TaskListView return type
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            points: true,
            completed: true, // <--- ADD THIS
            assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            sectionId: true,
            sprintId: true,
          }
        });
        log("[deleteProjectTask Mutation]", "Task deleted successfully:", { id: deletedTask.id, title: deletedTask.title });

        return {
          id: deletedTask.id,
          title: deletedTask.title,
          description: deletedTask.description,
          status: deletedTask.status,
          priority: deletedTask.priority,
          dueDate: deletedTask.dueDate?.toISOString().split('T')[0] || null,
          points: deletedTask.points,
          completed: deletedTask.completed,
          assignee: deletedTask.assignee ? {
            id: deletedTask.assignee.id,
            firstName: deletedTask.assignee.firstName,
            lastName: deletedTask.assignee.lastName,
            avatar: deletedTask.assignee.avatar,
          } : null,
          sectionId: deletedTask.sectionId,
          sprintId: deletedTask.sprintId,
        };

      } catch (error) {
        log("[deleteProjectTask Mutation]", "Error deleting project task:", error);
        throw error;
      }
    },


  },
  TaskListView: {
    // These custom resolvers are good, but ensure the parent object provided to them
    // already has the basic fields selected in the main query/mutation.
    // The main issue was typically missing fields in the *root* query/mutation selection.
    completed: (parent: { status: TaskStatus }) => parent.status === 'DONE',
    dueDate: (parent: { dueDate: Date | null }) => parent.dueDate ? parent.dueDate.toISOString().split('T')[0] : null,
    // Assignee is already included in the mutation/query, so this resolver might be redundant if
    // `assignee` is always directly fetched. If `assigneeId` is fetched and `assignee` is not,
    // then this is needed. Let's keep it for safety.
    assignee: async (parent: { assigneeId: string | null; assignee?: UserAvatarPartial | null }, _args: unknown, context: GraphQLContext) => {
      // If assignee is already included in the parent object (e.g., from direct include), return it.
      if (parent.assignee) return parent.assignee;
      if (!parent.assigneeId) return null;
      const user = await context.prisma.user.findUnique({
        where: { id: parent.assigneeId },
        select: { id: true, firstName: true, lastName: true, avatar: true },
      });
      return user;
    },
  },
};

export default taskResolver;