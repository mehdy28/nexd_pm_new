// graphql/resolvers/taskResolver.ts

import { prisma } from "@/lib/prisma";
import { TaskStatus, Priority, ActivityType } from "@prisma/client";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

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

// Input types for mutations
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

interface ConfirmAttachmentInput {
    publicId: string;
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    taskId: string;
}

interface CreateGanttTaskInput {
  projectId: string;
  sprintId: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  assigneeId?: string | null;
  progress?: number | null;
  type: "task" | "milestone";
}

interface UpdateGanttTaskInput {
  id: string;
  type: "TASK" | "MILESTONE";
  name?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  assigneeId?: string | null;
  progress?: number | null;
}

// Helper function to check if a user is a member of a project
const checkProjectMembership = async (userId: string, projectId: string) => {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) {
    throw new Error("Access Denied: You are not a member of this project.");
  }
};

const toISODateString = (date: Date | null | undefined): string | null => {
    return date ? date.toISOString().split('T')[0] : null;
};

export const taskResolver = {
  Query: {
    task: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      log("[Task Query]", `Fetching details for task ID: ${args.id}`);
      if (!context.user?.id) {
        throw new Error("Authentication required.");
      }
      const userId = context.user.id;
      
      const task = await prisma.task.findFirst({
        where: {
          id: args.id,
          project: {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          creator: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          sprint: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          comments: {
            include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
            orderBy: { createdAt: 'asc' }
          },
          attachments: {
            include: { uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
            orderBy: { createdAt: 'asc' }
          },
          activities: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
            orderBy: { createdAt: 'desc' }
          },
        },
      });

      return task;
    }
  },

  Mutation: {
    createProjectTask: async (_parent: unknown, { input }: { input: CreateProjectTaskInput }, context: GraphQLContext) => {
      log("[createProjectTask Mutation]", "called with input:", input);
      if (!context.user?.id) throw new Error("Authentication required.");
      const userId = context.user.id;
      const { projectId, ...taskData } = input;
  
      await checkProjectMembership(userId, projectId);
  
      const newTask = await prisma.task.create({
        data: {
          ...taskData,
          creatorId: userId,
          projectId,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          startDate: taskData.startDate ? new Date(taskData.startDate) : null,
          endDate: taskData.endDate ? new Date(taskData.endDate) : null,
        },
        include: { assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      });
  
      await prisma.activity.create({
        data: {
          type: 'TASK_CREATED',
          data: { title: newTask.title },
          userId: userId,
          taskId: newTask.id,
          projectId: projectId,
        },
      });
  
      log("[createProjectTask Mutation]", "Task created successfully:", { id: newTask.id });
      return {
        ...newTask,
        dueDate: toISODateString(newTask.dueDate),
        startDate: toISODateString(newTask.startDate),
        endDate: toISODateString(newTask.endDate),
      };
    },

    updateProjectTask: async (_parent: unknown, args: { input: UpdateProjectTaskInput }, context: GraphQLContext) => {
      log("[updateProjectTask Mutation]", "called with input:", args.input);

      if (!context.user?.id) throw new Error("Authentication required.");
      const userId = context.user.id;
      const { id: taskId, ...updates } = args.input;

      const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: { assignee: true, sprint: true, section: true },
      });

      if (!existingTask || !existingTask.projectId) throw new Error("Task not found.");
      await checkProjectMembership(userId, existingTask.projectId);

      const activitiesToCreate: { type: ActivityType; data: any; userId: string; taskId: string, projectId: string }[] = [];
      const commonActivityData = { userId, taskId, projectId: existingTask.projectId };

      if (updates.title && updates.title !== existingTask.title) {
        activitiesToCreate.push({ type: 'TASK_UPDATED', data: { change: 'title', old: existingTask.title, new: updates.title }, ...commonActivityData });
      }
      if (updates.priority && updates.priority !== existingTask.priority) {
        activitiesToCreate.push({ type: 'PRIORITY_UPDATED', data: { old: existingTask.priority, new: updates.priority }, ...commonActivityData });
      }
      if (updates.status && updates.status !== existingTask.status) {
        activitiesToCreate.push({ type: 'STATUS_UPDATED', data: { old: existingTask.status, new: updates.status }, ...commonActivityData });
      }
      if (updates.points !== undefined && updates.points !== existingTask.points) {
        activitiesToCreate.push({ type: 'POINTS_UPDATED', data: { old: existingTask.points, new: updates.points }, ...commonActivityData });
      }
      if (updates.dueDate !== undefined && toISODateString(updates.dueDate ? new Date(updates.dueDate) : null) !== toISODateString(existingTask.dueDate)) {
        activitiesToCreate.push({ type: 'DUE_DATE_UPDATED', data: { old: toISODateString(existingTask.dueDate), new: toISODateString(updates.dueDate ? new Date(updates.dueDate) : null) }, ...commonActivityData });
      }
      if (updates.startDate !== undefined && toISODateString(updates.startDate ? new Date(updates.startDate) : null) !== toISODateString(existingTask.startDate)) {
        activitiesToCreate.push({ type: 'TASK_UPDATED', data: { change: 'start date', old: toISODateString(existingTask.startDate), new: toISODateString(updates.startDate ? new Date(updates.startDate) : null) }, ...commonActivityData });
      }
      if (updates.endDate !== undefined && toISODateString(updates.endDate ? new Date(updates.endDate) : null) !== toISODateString(existingTask.endDate)) {
        activitiesToCreate.push({ type: 'TASK_UPDATED', data: { change: 'end date', old: toISODateString(existingTask.endDate), new: toISODateString(updates.endDate ? new Date(updates.endDate) : null) }, ...commonActivityData });
      }
      if (updates.description !== undefined && updates.description !== existingTask.description) {
        activitiesToCreate.push({ type: 'DESCRIPTION_UPDATED', data: { change: 'description' }, ...commonActivityData });
      }
      if (updates.assigneeId !== undefined && updates.assigneeId !== existingTask.assigneeId) {
        const newAssignee = updates.assigneeId ? await prisma.user.findUnique({ where: { id: updates.assigneeId } }) : null;
        activitiesToCreate.push({
          type: 'TASK_ASSIGNED',
          data: {
            old: existingTask.assignee ? `${existingTask.assignee.firstName} ${existingTask.assignee.lastName}` : 'Unassigned',
            new: newAssignee ? `${newAssignee.firstName} ${newAssignee.lastName}` : 'Unassigned'
          },
          ...commonActivityData
        });
      }
      if (updates.sprintId !== undefined && updates.sprintId !== existingTask.sprintId) {
        const newSprint = updates.sprintId ? await prisma.sprint.findUnique({ where: { id: updates.sprintId } }) : null;
        activitiesToCreate.push({ type: 'TASK_UPDATED', data: { change: 'sprint', old: existingTask.sprint?.name || 'None', new: newSprint?.name || 'None' }, ...commonActivityData });
      }
      if (updates.sectionId !== undefined && updates.sectionId !== existingTask.sectionId) {
        const newSection = updates.sectionId ? await prisma.section.findUnique({ where: { id: updates.sectionId } }) : null;
        activitiesToCreate.push({ type: 'TASK_UPDATED', data: { change: 'section', old: existingTask.section?.name || 'None', new: newSection?.name || 'None' }, ...commonActivityData });
      }

      const [, updatedTask] = await prisma.$transaction([
        prisma.activity.createMany({ data: activitiesToCreate }),
        prisma.task.update({
          where: { id: taskId },
          data: {
            title: updates.title,
            description: updates.description,
            status: updates.status,
            priority: updates.priority,
            dueDate: updates.dueDate ? new Date(updates.dueDate) : (updates.dueDate === null ? null : undefined),
            startDate: updates.startDate ? new Date(updates.startDate) : (updates.startDate === null ? null : undefined),
            endDate: updates.endDate ? new Date(updates.endDate) : (updates.endDate === null ? null : undefined),
            points: updates.points,
            assigneeId: updates.assigneeId,
            sectionId: updates.sectionId,
            sprintId: updates.sprintId,
            completed: updates.isCompleted !== undefined ? updates.isCompleted : (updates.status === 'DONE'),
          },
          include: { assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        })
      ]);

      log("[updateProjectTask Mutation]", "Task updated and activities logged successfully:", { id: updatedTask.id });
      return {
        ...updatedTask,
        dueDate: toISODateString(updatedTask.dueDate),
        startDate: toISODateString(updatedTask.startDate),
        endDate: toISODateString(updatedTask.endDate),
      };
    },

    deleteProjectTask: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
        log("[deleteProjectTask Mutation]", `called for task ID: ${args.id}`);
        if (!context.user?.id) throw new Error("Authentication required.");
        const userId = context.user.id;
    
        const task = await prisma.task.findUnique({ where: { id: args.id } });
        if (!task || !task.projectId) throw new Error("Task not found.");
        
        await checkProjectMembership(userId, task.projectId);
    
        // NOTE: No specific 'TASK_DELETED' ActivityType exists in the schema.
        // A 'TASK_UPDATED' activity could be created here before deletion if required,
        // but it would be semantically incorrect.
    
        const deletedTask = await prisma.task.delete({ where: { id: args.id } });
    
        log("[deleteProjectTask Mutation]", "Task deleted successfully:", deletedTask);
        return {
          ...deletedTask,
          dueDate: toISODateString(deletedTask.dueDate),
          startDate: toISODateString(deletedTask.startDate),
          endDate: toISODateString(deletedTask.endDate),
        };
    },

    createTaskComment: async (_parent: unknown, args: { taskId: string; content: string }, context: GraphQLContext) => {
      log("[createTaskComment Mutation]", "called with input:", args);
      if (!context.user?.id) throw new Error("Authentication required.");
      const { taskId, content } = args;
      const authorId = context.user.id;

      const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
      if (!task || !task.projectId) throw new Error("Task not found.");
      await checkProjectMembership(authorId, task.projectId);

      const [newComment] = await prisma.$transaction([
          prisma.comment.create({
              data: { content, taskId, authorId },
              include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
          }),
          prisma.activity.create({
              data: { type: 'COMMENT_ADDED', data: { content: content.substring(0, 50) + '...' }, userId: authorId, taskId, projectId: task.projectId }
          })
      ]);
      
      log("[createTaskComment Mutation]", "Comment created successfully:", newComment);
      return newComment;
    },

    deleteTaskComment: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      log("[deleteTaskComment Mutation]", `called for comment ID: ${args.id}`);
      if (!context.user?.id) throw new Error("Authentication required.");
      const userId = context.user.id;

      const comment = await prisma.comment.findUnique({ where: { id: args.id } });
      if (!comment) throw new Error("Comment not found.");
      if (comment.authorId !== userId) throw new Error("You can only delete your own comments.");

      const deletedComment = await prisma.comment.delete({ where: { id: args.id } });
      log("[deleteTaskComment Mutation]", "Comment deleted successfully:", deletedComment);
      return deletedComment;
    },

    getAttachmentUploadSignature: async (_parent: unknown, args: { taskId: string }, context: GraphQLContext) => {
        log("[getAttachmentUploadSignature Mutation]", "called with input:", args);
        if (!context.user?.id) throw new Error("Authentication required.");
  
        const task = await prisma.task.findUnique({ where: { id: args.taskId }, select: { projectId: true } });
        if (!task || !task.projectId) throw new Error("Task not found.");
        await checkProjectMembership(context.user.id, task.projectId);
  
        const timestamp = Math.round((new Date).getTime()/1000);
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            folder: `attachments/${args.taskId}`
        }, process.env.CLOUDINARY_API_SECRET!);
  
        return {
            signature,
            timestamp,
            apiKey: process.env.CLOUDINARY_API_KEY!,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
        };
    },
  
    confirmAttachmentUpload: async (_parent: unknown, { input }: { input: ConfirmAttachmentInput }, context: GraphQLContext) => {
        log("[confirmAttachmentUpload Mutation]", "called with input:", input);
        if (!context.user?.id) throw new Error("Authentication required.");
        const uploaderId = context.user.id;
        const { taskId, publicId, url, fileName, fileType, fileSize } = input;

        const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
        if (!task || !task.projectId) throw new Error("Task not found.");
        await checkProjectMembership(uploaderId, task.projectId);

        const [newAttachment] = await prisma.$transaction([
            prisma.attachment.create({
                data: { 
                  url: url,
                  publicId: publicId,
                  fileName, fileType, fileSize, taskId, uploaderId 
                },
                include: { uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
            }),
            prisma.activity.create({
                data: { type: 'ATTACHMENT_ADDED', data: { fileName }, userId: uploaderId, taskId, projectId: task.projectId }
            })
        ]);

        log("[confirmAttachmentUpload Mutation]", "Attachment confirmed and created:", newAttachment);
        return newAttachment;
    },

    deleteAttachment: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
        log("[deleteAttachment Mutation]", `called for attachment ID: ${args.id}`);
        if (!context.user?.id) throw new Error("Authentication required.");
        const userId = context.user.id;

        const attachment = await prisma.attachment.findUnique({
            where: { id: args.id },
            include: { task: { select: { projectId: true } } },
        });

        if (!attachment || !attachment.task.projectId) throw new Error("Attachment not found.");
        await checkProjectMembership(userId, attachment.task.projectId);
        if (!attachment.publicId) throw new Error("Attachment metadata is invalid (missing publicId).");
        
        await cloudinary.uploader.destroy(attachment.publicId);

        const [deletedAttachment] = await prisma.$transaction([
            prisma.attachment.delete({ where: { id: args.id } }),
            prisma.activity.create({
                data: { type: 'ATTACHMENT_REMOVED', data: { fileName: attachment.fileName }, userId: userId, taskId: attachment.taskId, projectId: attachment.task.projectId }
            })
        ]);
        
        log("[deleteAttachment Mutation]", "Attachment deleted from Cloudinary and DB:", deletedAttachment);
        return deletedAttachment;
    },
    
    createGanttTask: async (_parent: unknown, { input }: { input: CreateGanttTaskInput }, context: GraphQLContext) => { 
        // This is a specialized task creation. It maps to the main task model.
        if (!context.user?.id) throw new Error("Authentication required.");
        await checkProjectMembership(context.user.id, input.projectId);
        
        const newGanttTask = await prisma.task.create({
            data: {
                title: input.name,
                description: input.description,
                startDate: new Date(input.startDate),
                endDate: new Date(input.endDate),
                assigneeId: input.assigneeId,
                completionPercentage: input.progress,
                projectId: input.projectId,
                sprintId: input.sprintId,
                creatorId: context.user.id,
                // Gantt tasks often don't belong to a board section initially
                sectionId: null, 
            }
        });

        return {
            ...newGanttTask,
            name: newGanttTask.title,
            start: newGanttTask.startDate?.toISOString(),
            end: newGanttTask.endDate?.toISOString(),
            progress: newGanttTask.completionPercentage,
        }
    },
    updateGanttTask: async (_parent: unknown, { input }: { input: UpdateGanttTaskInput }, context: GraphQLContext) => { 
        // This is a specialized task update. It maps to the main task model.
        if (!context.user?.id) throw new Error("Authentication required.");
        const { id, type, name, ...updates } = input;

        const task = await prisma.task.findUnique({ where: { id: id } });
        if (!task || !task.projectId) throw new Error("Task not found.");
        await checkProjectMembership(context.user.id, task.projectId);

        const updatedGanttTask = await prisma.task.update({
            where: { id },
            data: {
                title: name,
                description: updates.description,
                startDate: updates.startDate ? new Date(updates.startDate) : undefined,
                endDate: updates.endDate ? new Date(updates.endDate) : undefined,
                assigneeId: updates.assigneeId,
                completionPercentage: updates.progress,
            }
        });

        return {
            ...updatedGanttTask,
            name: updatedGanttTask.title,
            start: updatedGanttTask.startDate?.toISOString(),
            end: updatedGanttTask.endDate?.toISOString(),
            progress: updatedGanttTask.completionPercentage,
        };
    },
  },
  
  Task: {
    commentCount: (parent: { id: string }) => {
      return prisma.comment.count({ where: { taskId: parent.id } });
    },
    attachmentCount: (parent: { id: string }) => {
      return prisma.attachment.count({ where: { taskId: parent.id } });
    },
  },

  TaskListView: {
    completed: (parent: { status: TaskStatus }) => parent.status === 'DONE',
    dueDate: (parent: { dueDate: Date | string | null }) => {
      if (!parent.dueDate) return null;
      const date = new Date(parent.dueDate);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    },
    assignee: async (parent: { assigneeId: string | null; assignee?: any }, _args: unknown, context: GraphQLContext) => {
        if (parent.assignee) return parent.assignee;
        if (!parent.assigneeId) return null;
        return context.prisma.user.findUnique({
          where: { id: parent.assigneeId },
          select: { id: true, firstName: true, lastName: true, avatar: true },
        });
      },
  },
};

export default taskResolver;