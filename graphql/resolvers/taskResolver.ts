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
  isCompleted?: boolean;
  sectionId?: string | null;
}

// NEW: Input for creating a task or milestone from Gantt
interface CreateGanttTaskInput {
  projectId: string;
  sprintId: string;
  name: string;
  description?: string | null;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  assigneeId?: string | null; // Only for tasks
  progress?: number | null; // Only for tasks
  type: "task" | "milestone"; // Differentiates what to create
}

// NEW: Input for updating a task or milestone from Gantt
interface UpdateGanttTaskInput {
  id: string; // ID of the original Task or Milestone
  type: "TASK" | "MILESTONE"; // Differentiates which model to update (Prisma model name)
  name?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null; // For task (maps to Task.endDate) or milestone (maps to Milestone.dueDate)
  assigneeId?: string | null; // For task only
  progress?: number | null; // For task only
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

        if (sprintId !== null && sprintId !== undefined) {
          const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
          if (!sprint || sprint.projectId !== projectId) {
            log("[createProjectTask Mutation]", `Sprint ${sprintId} not found or doesn't belong to project ${projectId}.`);
            throw new Error("Invalid sprint provided.");
          }
        }

        if (assigneeId !== null && assigneeId !== undefined) {
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
            completed: (status || 'TODO') === 'DONE',
          },
          include: {
            assignee: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
        });
        log("[createProjectTask Mutation]", "Task created successfully:", { id: newTask.id, title: newTask.title });

        return {
          id: newTask.id,
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          dueDate: newTask.dueDate?.toISOString().split('T')[0] || null,
          points: newTask.points,
          completed: newTask.completed,
          assignee: newTask.assignee ? {
            id: newTask.assignee.id,
            firstName: newTask.assignee.firstName,
            lastName: newTask.assignee.lastName,
            avatar: newTask.assignee.avatar,
          } : null,
          sectionId: newTask.sectionId,
          sprintId: newTask.sprintId,
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
      const { id: taskId, isCompleted, ...updates } = args.input;

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
          completed: updatedTask.completed,
          assignee: updatedTask.assignee ? {
            id: updatedTask.assignee.id,
            firstName: updatedTask.assignee.firstName,
            lastName: updatedTask.assignee.lastName,
            avatar: newTask.assignee.avatar, // Fixed: use newTask.assignee.avatar
          } : null,
          sectionId: updatedTask.sectionId,
          sprintId: updatedTask.sprintId,
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
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            points: true,
            completed: true,
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

    // NEW: createGanttTask Mutation
    createGanttTask: async (_parent: unknown, args: { input: CreateGanttTaskInput }, context: GraphQLContext) => {
      log("[createGanttTask Mutation]", "called with input:", args.input);

      if (!context.user?.id) {
        log("[createGanttTask Mutation]", "No authenticated user found in context.");
        throw new Error("Authentication required: No user ID found in context.");
      }

      const userId = context.user.id;
      const { projectId, sprintId, name, description, startDate, endDate, assigneeId, progress, type } = args.input;

      try {
        // 1. Validate Project/Sprint/Assignee
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, members: { where: { userId: userId }, select: { userId: true } } },
        });
        if (!project || project.members.length === 0) {
          log("[createGanttTask Mutation]", `User ${userId} is not a member of project ${projectId}. Access denied.`);
          throw new Error("Access Denied: You are not a member of this project.");
        }

        const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
        if (!sprint || sprint.projectId !== projectId) {
          log("[createGanttTask Mutation]", `Sprint ${sprintId} not found or doesn't belong to project ${projectId}.`);
          throw new Error("Invalid sprint provided.");
        }

        if (assigneeId !== null && assigneeId !== undefined) {
          const assigneeMember = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: { projectId: projectId, userId: assigneeId }
            },
          });
          if (!assigneeMember) {
            log("[createGanttTask Mutation]", `Assignee ${assigneeId} is not a member of project ${projectId}.`);
            throw new Error("Assignee is not a member of this project.");
          }
        }
        log("[createGanttTask Mutation]", `Validation passed for creating Gantt item in project ${projectId}.`);

        let createdItem: any; // Will hold either Task or Milestone
        let originalType: "TASK" | "MILESTONE"; // Changed "SPRINT" to "MILESTONE" as per enum

        if (type === "task") {
          createdItem = await prisma.task.create({
            data: {
              title: name,
              description: description ?? null,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              dueDate: new Date(endDate), // Often dueDate is same as endDate for Gantt tasks
              projectId: projectId,
              sprintId: sprintId,
              assigneeId: assigneeId ?? null,
              creatorId: userId,
              status: TaskStatus.TODO, // Default status for new task
              priority: Priority.MEDIUM, // Default priority for new task
              points: 0,
              completed: false,
              completionPercentage: progress ?? 0,
            },
            include: {
              assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
          });
          originalType = "TASK";
          log("[createGanttTask Mutation]", "Gantt Task created successfully:", { id: createdItem.id, title: createdItem.title });
        } else if (type === "milestone") {
          createdItem = await prisma.milestone.create({
            data: {
              name: name,
              description: description ?? null,
              dueDate: new Date(endDate), // Milestone is a point in time, use endDate
              sprintId: sprintId,
              isCompleted: false,
            },
          });
          originalType = "MILESTONE";
          log("[createGanttTask Mutation]", "Gantt Milestone created successfully:", { id: createdItem.id, name: createdItem.name });
        } else {
          throw new Error("Invalid type for Gantt task creation. Must be 'task' or 'milestone'.");
        }

        // Return a GanttTaskData compatible object
        return {
          id: createdItem.id, // Use the ID of the created Task or Milestone
          name: createdItem.title || createdItem.name,
          start: (createdItem.startDate || createdItem.dueDate).toISOString(),
          end: (createdItem.endDate || createdItem.dueDate).toISOString(),
          progress: createdItem.completionPercentage ?? (createdItem.isCompleted ? 100 : 0),
          type: type,
          sprint: sprintId,
          hideChildren: false,
          displayOrder: 1, // Default, will be recalculated by Gantt library
          description: createdItem.description,
          assignee: createdItem.assignee ? {
            id: createdItem.assignee.id, firstName: createdItem.assignee.firstName,
            lastName: createdItem.assignee.lastName, avatar: createdItem.assignee.avatar,
          } : null,
          originalTaskId: createdItem.id,
          originalType: originalType,
        };

      } catch (error) {
        log("[createGanttTask Mutation]", "Error creating Gantt task/milestone:", error);
        throw error;
      }
    },

    // NEW: updateGanttTask Mutation
    updateGanttTask: async (_parent: unknown, args: { input: UpdateGanttTaskInput }, context: GraphQLContext) => {
      log("[updateGanttTask Mutation]", "called with input:", args.input);

      if (!context.user?.id) {
        log("[updateGanttTask Mutation]", "No authenticated user found in context.");
        throw new Error("Authentication required: No user ID found in context.");
      }

      const userId = context.user.id;
      const { id: originalId, type: originalType, ...updates } = args.input;

      try {
        let updatedItem: any;
        let project: any; // To hold project details for access validation

        if (originalType === "TASK") {
          // Fetch existing task to get its current dates before applying partial updates
          const existingTask = await prisma.task.findUnique({
            where: { id: originalId },
            select: {
                id: true, projectId: true, assigneeId: true, creatorId: true, sprintId: true,
                startDate: true, endDate: true, dueDate: true, completionPercentage: true,
                project: { select: { members: { where: { userId: userId }, select: { userId: true } } } }
            },
          });

          if (!existingTask) {
            log("[updateGanttTask Mutation]", `Task with ID ${originalId} not found.`);
            throw new Error(`Task with ID ${originalId} not found.`);
          }
          if (!existingTask.project || existingTask.project.members.length === 0) {
            log("[updateGanttTask Mutation]", `User ${userId} is not a member of the project owning task ${originalId}. Access denied.`);
            throw new Error("Access Denied: You are not authorized to update this task.");
          }
          project = existingTask.project;
          log("[updateGanttTask Mutation]", `Access granted for user ${userId} to update task ${originalId}.`);

          const dataToUpdate: any = {};
          if (updates.name !== undefined) dataToUpdate.title = updates.name; // Map 'name' to 'title' for Task
          if (updates.description !== undefined) dataToUpdate.description = updates.description;
          if (updates.startDate !== undefined) dataToUpdate.startDate = updates.startDate ? new Date(updates.startDate) : null;
          if (updates.endDate !== undefined) dataToUpdate.endDate = updates.endDate ? new Date(updates.endDate) : null;
          if (updates.endDate !== undefined) dataToUpdate.dueDate = updates.endDate ? new Date(updates.endDate) : null; // Update dueDate when endDate changes
          if (updates.assigneeId !== undefined) dataToUpdate.assigneeId = updates.assigneeId;
          if (updates.progress !== undefined) {
              dataToUpdate.completionPercentage = updates.progress;
              dataToUpdate.completed = updates.progress === 100; // Auto-complete if 100% progress
              dataToUpdate.status = updates.progress === 100 ? TaskStatus.DONE : TaskStatus.TODO;
          }

          updatedItem = await prisma.task.update({
            where: { id: originalId },
            data: dataToUpdate,
            include: {
              assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
          });
          log("[updateGanttTask Mutation]", "Task updated successfully:", { id: updatedItem.id, updates: dataToUpdate });

        } else if (originalType === "MILESTONE") {
          // Fetch existing milestone to get its current dates before applying partial updates
          const existingMilestone = await prisma.milestone.findUnique({
            where: { id: originalId },
            select: {
                id: true, dueDate: true, isCompleted: true,
                sprint: { select: { projectId: true, project: { select: { members: { where: { userId: userId }, select: { userId: true } } } } } }
            },
          });

          if (!existingMilestone || !existingMilestone.sprint?.project) {
            log("[updateGanttTask Mutation]", `Milestone with ID ${originalId} not found or project access denied.`);
            throw new Error(`Milestone with ID ${originalId} not found or access denied.`);
          }
          if (!existingMilestone.sprint.project.members.length) {
            log("[updateGanttTask Mutation]", `User ${userId} is not a member of the project owning milestone ${originalId}. Access denied.`);
            throw new Error("Access Denied: You are not authorized to update this milestone.");
          }
          project = existingMilestone.sprint.project;
          log("[updateGanttTask Mutation]", `Access granted for user ${userId} to update milestone ${originalId}.`);

          const dataToUpdate: any = {};
          if (updates.name !== undefined) dataToUpdate.name = updates.name;
          if (updates.description !== undefined) dataToUpdate.description = updates.description;
          if (updates.endDate !== undefined) dataToUpdate.dueDate = updates.endDate ? new Date(updates.endDate) : null; // Map endDate to dueDate for Milestones

          updatedItem = await prisma.milestone.update({
            where: { id: originalId },
            data: dataToUpdate,
          });
          log("[updateGanttTask Mutation]", "Milestone updated successfully:", { id: updatedItem.id, updates: dataToUpdate });

        } else {
          throw new Error("Invalid type for Gantt task update. Must be 'TASK' or 'MILESTONE'.");
        }

        // --- ENSURE NON-NULLABLE DATES FOR GANTTTASKDATA RETURN ---
        // For tasks:
        const taskStartDate = (originalType === "TASK" && updatedItem.startDate) ? updatedItem.startDate :
                              (originalType === "TASK" && updatedItem.dueDate) ? updatedItem.dueDate :
                              (originalType === "MILESTONE" && updatedItem.dueDate) ? updatedItem.dueDate : new Date(); // Fallback
        const taskEndDate = (originalType === "TASK" && updatedItem.endDate) ? updatedItem.endDate :
                            (originalType === "TASK" && updatedItem.dueDate) ? updatedItem.dueDate :
                            (originalType === "MILESTONE" && updatedItem.dueDate) ? updatedItem.dueDate : new Date(); // Fallback

        const ganttStart = taskStartDate.toISOString();
        const ganttEnd = taskEndDate.toISOString();
        // --- END NON-NULLABLE DATES ---

        return {
          id: updatedItem.id, // ID of the original Task or Milestone
          name: updatedItem.title || updatedItem.name,
          start: ganttStart,
          end: ganttEnd,
          progress: updatedItem.completionPercentage ?? (updatedItem.isCompleted ? 100 : 0),
          type: originalType === "TASK" ? "task" : "milestone", // Return Gantt chart type
          sprint: updatedItem.sprintId,
          hideChildren: false,
          displayOrder: 1, // Default
          description: updatedItem.description,
          assignee: updatedItem.assignee ? {
            id: updatedItem.assignee.id, firstName: updatedItem.assignee.firstName,
            lastName: updatedItem.assignee.lastName, avatar: updatedItem.assignee.avatar,
          } : null,
          originalTaskId: updatedItem.id,
          originalType: originalType,
        };

      } catch (error) {
        log("[updateGanttTask Mutation]", "Error updating Gantt task/milestone:", error);
        throw error;
      }
    },
  },
  TaskListView: {
    completed: (parent: { status: TaskStatus }) => parent.status === 'DONE',
    dueDate: (parent: { dueDate: Date | null }) => parent.dueDate ? parent.dueDate.toISOString().split('T')[0] : null,
    assignee: async (parent: { assigneeId: string | null; assignee?: UserAvatarPartial | null }, _args: unknown, context: GraphQLContext) => {
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