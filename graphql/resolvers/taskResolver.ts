// // graphql/resolvers/taskResolver.ts

// import { prisma } from "@/lib/prisma";
// import { TaskStatus, Priority } from "@prisma/client";

// function log(prefix: string, message: string, data?: any) {
//   const timestamp = new Date().toISOString();
//   if (data !== undefined) {
//     console.log(`${timestamp} ${prefix} ${message}`, data);
//   } else {
//     console.log(`${timestamp} ${prefix} ${message}`);
//   }
// }

// interface GraphQLContext {
//   prisma: typeof prisma;
//   user?: { id: string; email: string; role: string };
// }

// // ... (existing CreateProjectTaskInput and UpdateProjectTaskInput interfaces) ...

// // **REVISED UpdateProjectTaskInput interface** for clarity with optional vs. nullable
// interface UpdateProjectTaskInput {
//   id: string;
//   title?: string | null;       // optional, can be set to null
//   description?: string | null;  // optional, can be set to null
//   status?: TaskStatus;         // optional
//   priority?: Priority;         // optional
//   dueDate?: string | null;     // optional, can be set to null (for "clear date")
//   startDate?: string | null;   // optional, can be set to null
//   endDate?: string | null;     // optional, can be set to null
//   assigneeId?: string | null;  // optional, can be set to null (for "unassign")
//   sprintId?: string | null;    // optional, can be set to null (for "remove from sprint")
//   points?: number | null;      // optional, can be set to null (for "clear points")
//   parentId?: string | null;    // optional, can be set to null
// }

// // REMOVE: export const taskResolver: IResolvers<any, GraphQLContext> = {
// export const taskResolver = { // Define as a plain object
//   Mutation: {
//     // ... (existing createProjectTask mutation) ...

//     updateProjectTask: async (_parent: unknown, args: { input: UpdateProjectTaskInput }, context: GraphQLContext) => {
//       log("[updateProjectTask Mutation]", "called with input:", args.input);

//       if (!context.user?.id) {
//         log("[updateProjectTask Mutation]", "No authenticated user found in context.");
//         throw new Error("Authentication required: No user ID found in context.");
//       }

//       const userId = context.user.id;
//       const { id: taskId, ...updates } = args.input;

//       try {
//         // 1. Fetch existing task and verify user access
//         const existingTask = await prisma.task.findUnique({
//           where: { id: taskId },
//           select: {
//             id: true,
//             projectId: true,
//             project: { select: { members: { where: { userId: userId }, select: { userId: true } } } },
//             // Include existing relationships if needed for validation of new values
//             assigneeId: true,
//             sprintId: true,
//             sectionId: true,
//           },
//         });

//         if (!existingTask) {
//           log("[updateProjectTask Mutation]", `Task with ID ${taskId} not found.`);
//           throw new Error(`Task with ID ${taskId} not found.`);
//         }
//         if (!existingTask.project || existingTask.project.members.length === 0) {
//           log("[updateProjectTask Mutation]", `User ${userId} is not a member of the project owning task ${taskId}. Access denied.`);
//           throw new Error("Access Denied: You are not authorized to update this task.");
//         }
//         log("[updateProjectTask Mutation]", `Access granted for user ${userId} to update task ${taskId}.`);

//         // 2. Validate relationships if they are being updated (and not being set to null)
//         if (updates.sectionId !== undefined && updates.sectionId !== null) { // Only validate if changing and not nulling
//           const section = await prisma.section.findUnique({ where: { id: updates.sectionId } });
//           if (!section || section.projectId !== existingTask.projectId) {
//             log("[updateProjectTask Mutation]", `Updated section ${updates.sectionId} not found or doesn't belong to project ${existingTask.projectId}.`);
//             throw new Error("Invalid section provided for update.");
//           }
//         }
//         if (updates.sprintId !== undefined && updates.sprintId !== null) {
//           const sprint = await prisma.sprint.findUnique({ where: { id: updates.sprintId } });
//           if (!sprint || sprint.projectId !== existingTask.projectId) {
//             log("[updateProjectTask Mutation]", `Updated sprint ${updates.sprintId} not found or doesn't belong to project ${existingTask.projectId}.`);
//             throw new Error("Invalid sprint provided for update.");
//           }
//         }
//         if (updates.assigneeId !== undefined && updates.assigneeId !== null) {
//           const assigneeMember = await prisma.projectMember.findUnique({
//             where: {
//               projectId_userId: { projectId: existingTask.projectId, userId: updates.assigneeId }
//             },
//           });
//           if (!assigneeMember) {
//             log("[updateProjectTask Mutation]", `Updated assignee ${updates.assigneeId} is not a member of project ${existingTask.projectId}.`);
//             throw new Error("Assignee is not a member of this project.");
//           }
//         }

//         // 3. Prepare data for update, mapping date strings to Date objects or null
//         const dataToUpdate: any = {};
//         for (const key in updates) {
//           if (Object.prototype.hasOwnProperty.call(updates, key)) {
//             const value = (updates as any)[key];

//             // If the value is undefined, it means the field was not provided in the input, so we skip it.
//             // If the value is explicitly null, it means we want to set it to null in the DB.
//             // If the value is defined and not null, we use it.
//             if (value !== undefined) {
//               if (key === 'dueDate' || key === 'startDate' || key === 'endDate') {
//                 dataToUpdate[key] = value ? new Date(value) : null;
//               } else {
//                 dataToUpdate[key] = value;
//               }
//             }
//           }
//         }

//         // 4. Perform the update
//         const updatedTask = await prisma.task.update({
//           where: { id: taskId },
//           data: dataToUpdate,
//           include: {
//             assignee: {
//               select: { id: true, firstName: true, lastName: true, avatar: true },
//             },
//           },
//         });
//         log("[updateProjectTask Mutation]", "Task updated successfully:", { id: updatedTask.id, title: updatedTask.title, updates: dataToUpdate });

//         // Transform and return the task
//         return {
//           id: updatedTask.id,
//           title: updatedTask.title,
//           description: updatedTask.description,
//           status: updatedTask.status,
//           priority: updatedTask.priority,
//           dueDate: updatedTask.dueDate?.toISOString().split('T')[0] || null,
//           points: updatedTask.points,
//           completed: updatedTask.status === 'DONE',
//           assignee: updatedTask.assignee ? {
//             id: updatedTask.assignee.id,
//             firstName: updatedTask.assignee.firstName,
//             lastName: updatedTask.assignee.lastName,
//             avatar: updatedTask.assignee.avatar,
//           } : null,
//         };

//       } catch (error) {
//         log("[updateProjectTask Mutation]", "Error updating project task:", error);
//         throw error;
//       }
//     },

//     // ... (existing deleteProjectTask mutation) ...
//   },
//   // ... (existing TaskListView resolver, if you had one. Make sure its fields are typed correctly) ...
// };

// export default taskResolver;








import { prisma } from "@/lib/prisma";
// REMOVE THIS LINE: import { IResolvers } from 'graphql-tools';
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
}

// REMOVED IResolvers type assertion
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

        if (sprintId !== null) { // Only validate if sprintId is provided and not explicitly null
          const sprint = await prisma.sprint.findUnique({ where: { id: sprintId as string } }); // Cast as string if not null
          if (!sprint || sprint.projectId !== projectId) {
            log("[createProjectTask Mutation]", `Sprint ${sprintId} not found or doesn't belong to project ${projectId}.`);
            throw new Error("Invalid sprint provided.");
          }
        }

        if (assigneeId !== null) { // Only validate if assigneeId is provided and not explicitly null
          const assigneeMember = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: { projectId: projectId, userId: assigneeId as string }
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
            description: description ?? null, // Use ?? null to convert undefined to null
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
            points: points ?? 0, // Default to 0 if null/undefined
            parentId: parentId ?? null,
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
          completed: newTask.status === 'DONE',
          assignee: newTask.assignee ? {
            id: newTask.assignee.id,
            firstName: newTask.assignee.firstName,
            lastName: newTask.assignee.lastName,
            avatar: newTask.assignee.avatar,
          } : null,
          sectionId: newTask.sectionId, // Include for cache update logic in frontend
          sprintId: newTask.sprintId,   // Include for cache update logic in frontend
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
      const { id: taskId, ...updates } = args.input;

      try {
        // 1. Fetch existing task and verify user access
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

        // 2. Validate relationships if they are being updated (and not being set to null)
        if (updates.sectionId !== undefined && updates.sectionId !== null) {
          const section = await prisma.section.findUnique({ where: { id: updates.sectionId } });
          if (!section || section.projectId !== existingTask.projectId) {
            log("[updateProjectTask Mutation]", `Updated section ${updates.sectionId} not found or doesn't belong to project ${existingTask.projectId}.`);
            throw new Error("Invalid section provided for update.");
          }
        }
        if (updates.sprintId !== undefined && updates.sprintId !== null) {
          const sprint = await prisma.sprint.findUnique({ where: { id: updates.sprintId as string } });
          if (!sprint || sprint.projectId !== existingTask.projectId) {
            log("[updateProjectTask Mutation]", `Updated sprint ${updates.sprintId} not found or doesn't belong to project ${existingTask.projectId}.`);
            throw new Error("Invalid sprint provided for update.");
          }
        }
        if (updates.assigneeId !== undefined && updates.assigneeId !== null) {
          const assigneeMember = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: { projectId: existingTask.projectId, userId: updates.assigneeId as string }
            },
          });
          if (!assigneeMember) {
            log("[updateProjectTask Mutation]", `Updated assignee ${updates.assigneeId} is not a member of project ${existingTask.projectId}.`);
            throw new Error("Assignee is not a member of this project.");
          }
        }

        // 3. Prepare data for update, only including fields that are explicitly present in the input
        const dataToUpdate: any = {};
        for (const key in updates) {
          if (Object.prototype.hasOwnProperty.call(updates, key)) {
            const value = (updates as any)[key];

            // This logic ensures `undefined` values (fields not passed in input) are skipped,
            // while `null` values (explicitly setting to null) are applied.
            if (value !== undefined) {
              if (key === 'dueDate' || key === 'startDate' || key === 'endDate') {
                dataToUpdate[key] = value ? new Date(value) : null;
              } else {
                dataToUpdate[key] = value;
              }
            }
          }
        }

        // 4. Perform the update
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

        // Transform and return the task
        return {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          priority: updatedTask.priority,
          dueDate: updatedTask.dueDate?.toISOString().split('T')[0] || null,
          points: updatedTask.points,
          completed: updatedTask.status === 'DONE',
          assignee: updatedTask.assignee ? {
            id: updatedTask.assignee.id,
            firstName: updatedTask.assignee.firstName,
            lastName: updatedTask.assignee.lastName,
            avatar: updatedTask.assignee.avatar,
          } : null,
          sectionId: updatedTask.sectionId, // Include for cache update logic in frontend
          sprintId: updatedTask.sprintId,   // Include for cache update logic in frontend
        };

      } catch (error) {
        log("[updateProjectTask Mutation]", "Error updating project task:", error);
        throw error;
      }
    },


  },
  TaskListView: {
    completed: (parent: { status: TaskStatus }) => parent.status === 'DONE',
    dueDate: (parent: { dueDate: Date | null }) => parent.dueDate ? parent.dueDate.toISOString().split('T')[0] : null,
    assignee: async (parent: { assigneeId: string | null }, _args: unknown, context: GraphQLContext) => {
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