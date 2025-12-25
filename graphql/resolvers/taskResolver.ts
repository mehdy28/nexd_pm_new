import { TaskStatus, Priority, ActivityType, $Enums } from "@prisma/client"
import { v2 as cloudinary } from "cloudinary"
import { GraphQLError } from "graphql"
import { prisma } from "@/lib/prisma"

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

// Input types for mutations
interface CreateProjectTaskInput {
  projectId: string
  sectionId: string
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: Priority
  dueDate?: string | null
  startDate?: string | null
  endDate?: string | null
  assigneeId?: string | null
  sprintId?: string | null
  points?: number | null
  parentId?: string | null
}

interface UpdateProjectTaskInput {
  id: string
  title?: string | null
  description?: string | null
  status?: TaskStatus
  priority?: Priority
  dueDate?: string | null
  startDate?: string | null
  endDate?: string | null
  assigneeId?: string | null
  sprintId?: string | null
  points?: number | null
  parentId?: string | null
  isCompleted?: boolean
  sectionId?: string | null
}

interface ConfirmAttachmentInput {
  publicId: string
  url: string
  fileName: string
  fileType: string
  fileSize: number
  taskId: string
}

interface CreateGanttTaskInput {
  projectId: string
  sprintId: string
  name: string
  description?: string | null
  startDate: string
  endDate: string
  assigneeId?: string | null
  progress?: number | null
  type: "task" | "milestone"
}

interface UpdateGanttTaskInput {
  id: string
  type: "TASK" | "MILESTONE"
  name?: string | null
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  assigneeId?: string | null
  progress?: number | null
  displayOrder?: number | null
}

// Helper function to check if a user is a member of a project

const toISODateString = (date: Date | null | undefined): string | null => {
  return date ? date.toISOString().split("T")[0] : null
}

export const taskResolver = {
  Query: {
    task: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user?.id) {
        throw new Error("Authentication required.")
      }

      const task = await prisma.task.findFirst({
        where: {
          id: args.id,
          // project: {
          //   members: {
          //     some: {
          //       userId: userId,
          //     },
          //   },
          // },
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } },
          creator: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } },
          sprint: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          comments: {
            include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
            orderBy: { createdAt: "asc" },
          },
          attachments: {
            include: { uploader: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
            orderBy: { createdAt: "asc" },
          },
          activities: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      })

      return task
    },
  },

  Mutation: {
    createProjectTask: async (
      _parent: unknown,
      { input }: { input: CreateProjectTaskInput },
      context: GraphQLContext,
    ) => {
      if (!context.user?.id) throw new Error("Authentication required.")
      const userId = context.user.id
      const { projectId, ...taskData } = input

      const createdAt = new Date()
      const startDate = taskData.startDate ? new Date(taskData.startDate) : createdAt
      let endDate
      if (taskData.endDate) {
        endDate = new Date(taskData.endDate)
      } else {
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 1)
      }

      const newTask = await prisma.task.create({
        data: {
          ...taskData,
          creatorId: userId,
          projectId,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          startDate: startDate,
          endDate: endDate,
        },
        include: { assignee: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
      })

      await prisma.activity.create({
        data: {
          type: "TASK_CREATED",
          data: { title: newTask.title },
          userId: userId,
          taskId: newTask.id,
          projectId: projectId,
        },
      })

      return {
        ...newTask,
        dueDate: toISODateString(newTask.dueDate),
        startDate: toISODateString(newTask.startDate),
        endDate: toISODateString(newTask.endDate),
      }
    },

    updateProjectTask: async (_parent: unknown, args: { input: UpdateProjectTaskInput }, context: GraphQLContext) => {
      const LOG_PREFIX = "[updateProjectTask Mutation]"

      if (!context.user?.id) {
        throw new Error("Authentication required.")
      }
      const userId = context.user.id

      const { id: taskId, ...updates } = args.input

      const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          title: true,
          priority: true,
          status: true,
          points: true,
          dueDate: true,
          startDate: true,
          endDate: true,
          description: true,
          assigneeId: true,
          sprintId: true,
          sectionId: true,
          projectId: true,
          assignee: { select: { firstName: true, lastName: true } },
          sprint: { select: { name: true } },
          section: { select: { name: true } },
        },
      })

      if (!existingTask) {
        throw new GraphQLError("Task not found", { extensions: { code: "NOT_FOUND" } })
      }

      if (!existingTask.projectId) {
        throw new GraphQLError("This task is not associated with a project.", {
          extensions: { code: "BAD_REQUEST" },
        })
      }

      const activitiesToCreate: { type: ActivityType; data: any; userId: string; taskId: string; projectId: string }[] =
        []
      const commonActivityData = { userId, taskId, projectId: existingTask.projectId }

      if (updates.title !== undefined && updates.title !== existingTask.title) {
        activitiesToCreate.push({
          type: "TASK_UPDATED",
          data: { change: "title", old: existingTask.title, new: updates.title },
          ...commonActivityData,
        })
      }
      if (updates.priority !== undefined && updates.priority !== existingTask.priority) {
        activitiesToCreate.push({
          type: "PRIORITY_UPDATED",
          data: { old: existingTask.priority, new: updates.priority },
          ...commonActivityData,
        })
      }
      if (updates.status !== undefined && updates.status !== existingTask.status) {
        activitiesToCreate.push({
          type: "STATUS_UPDATED",
          data: { old: existingTask.status, new: updates.status },
          ...commonActivityData,
        })
      }
      if (updates.points !== undefined && (updates.points ?? null) !== (existingTask.points ?? null)) {
        activitiesToCreate.push({
          type: "POINTS_UPDATED",
          data: { old: existingTask.points ?? null, new: updates.points ?? null },
          ...commonActivityData,
        })
      }
      if (
        updates.dueDate !== undefined &&
        toISODateString(updates.dueDate ? new Date(updates.dueDate) : null) !== toISODateString(existingTask.dueDate)
      ) {
        const oldDate = toISODateString(existingTask.dueDate)
        const newDate = toISODateString(updates.dueDate ? new Date(updates.dueDate) : null)
        activitiesToCreate.push({
          type: "DUE_DATE_UPDATED",
          data: { old: oldDate, new: newDate },
          ...commonActivityData,
        })
      }
      if (
        updates.startDate !== undefined &&
        toISODateString(updates.startDate ? new Date(updates.startDate) : null) !==
          toISODateString(existingTask.startDate)
      ) {
        const oldDate = toISODateString(existingTask.startDate)
        const newDate = toISODateString(updates.startDate ? new Date(updates.startDate) : null)
        activitiesToCreate.push({
          type: "TASK_UPDATED",
          data: { change: "start date", old: oldDate, new: newDate },
          ...commonActivityData,
        })
      }
      if (
        updates.endDate !== undefined &&
        toISODateString(updates.endDate ? new Date(updates.endDate) : null) !== toISODateString(existingTask.endDate)
      ) {
        const oldDate = toISODateString(existingTask.endDate)
        const newDate = toISODateString(updates.endDate ? new Date(updates.endDate) : null)
        activitiesToCreate.push({
          type: "TASK_UPDATED",
          data: { change: "end date", old: oldDate, new: newDate },
          ...commonActivityData,
        })
      }
      if (updates.description !== undefined && updates.description !== existingTask.description) {
        activitiesToCreate.push({ type: "DESCRIPTION_UPDATED", data: {}, ...commonActivityData })
      }
      if (updates.assigneeId !== undefined && updates.assigneeId !== existingTask.assigneeId) {
        const newAssignee = updates.assigneeId ? await prisma.user.findUnique({ where: { id: updates.assigneeId } }) : null
        activitiesToCreate.push({
          type: "TASK_ASSIGNED",
          data: {
            old: existingTask.assignee ? `${existingTask.assignee.firstName} ${existingTask.assignee.lastName}` : null,
            new: newAssignee ? `${newAssignee.firstName} ${newAssignee.lastName}` : null,
          },
          ...commonActivityData,
        })
      }
      if (updates.sprintId !== undefined && updates.sprintId !== existingTask.sprintId) {
        const newSprint = updates.sprintId ? await prisma.sprint.findUnique({ where: { id: updates.sprintId } }) : null
        activitiesToCreate.push({
          type: "TASK_UPDATED",
          data: { change: "sprint", old: existingTask.sprint?.name ?? null, new: newSprint?.name ?? null },
          ...commonActivityData,
        })
      }
      if (updates.sectionId !== undefined && updates.sectionId !== existingTask.sectionId) {
        const newSection = updates.sectionId ? await prisma.section.findUnique({ where: { id: updates.sectionId } }) : null
        activitiesToCreate.push({
          type: "TASK_UPDATED",
          data: { change: "section", old: existingTask.section?.name ?? null, new: newSection?.name ?? null },
          ...commonActivityData,
        })
      }

      if (activitiesToCreate.length === 0 && Object.keys(updates).every(k => k === "id")) {
        const taskForReturn = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
        })
        if (!taskForReturn) {
          throw new GraphQLError("Task not found after update.", { extensions: { code: "INTERNAL_SERVER_ERROR" } })
        }
        return {
          ...taskForReturn,
          dueDate: toISODateString(taskForReturn.dueDate),
          startDate: toISODateString(taskForReturn.startDate),
          endDate: toISODateString(taskForReturn.endDate),
        }
      }

      const [, updatedTask] = await prisma.$transaction([
        prisma.activity.createMany({ data: activitiesToCreate }),
        prisma.task.update({
          where: { id: taskId },
          data: {
            title: updates.title === null ? undefined : updates.title,
            description: updates.description,
            status: updates.status,
            priority: updates.priority,
            dueDate: updates.dueDate ? new Date(updates.dueDate) : updates.dueDate === null ? null : undefined,
            startDate: updates.startDate ? new Date(updates.startDate) : updates.startDate === null ? null : undefined,
            endDate: updates.endDate ? new Date(updates.endDate) : updates.endDate === null ? null : undefined,
            points: updates.points,
            assigneeId: updates.assigneeId,
            sectionId: updates.sectionId,
            sprintId: updates.sprintId,
            completed: updates.isCompleted !== undefined ? updates.isCompleted : updates.status === "DONE",
          },
          include: { assignee: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
        }),
      ])

      const finalResponse = {
        ...updatedTask,
        dueDate: toISODateString(updatedTask.dueDate),
        startDate: toISODateString(updatedTask.startDate),
        endDate: toISODateString(updatedTask.endDate),
      }
      return finalResponse
    },

    deleteProjectTask: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user?.id) throw new Error("Authentication required.")
      const userId = context.user.id

      const task = await prisma.task.findUnique({ where: { id: args.id } })

      const deletedTask = await prisma.task.delete({ where: { id: args.id } })

      return {
        ...deletedTask,
        dueDate: toISODateString(deletedTask.dueDate),
        startDate: toISODateString(deletedTask.startDate),
        endDate: toISODateString(deletedTask.endDate),
      }
    },

    deleteManyProjectTasks: async (_parent: unknown, { ids }: { ids: string[] }, context: GraphQLContext) => {
      if (!context.user?.id) {
        throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
      }
      const userId = context.user.id

      const tasksToDelete = await prisma.task.findMany({
        where: { id: { in: ids } },
      })

      if (tasksToDelete.length !== ids.length) {
        const foundIds = new Set(tasksToDelete.map(t => t.id))
        const notFound = ids.filter(id => !foundIds.has(id))
        throw new GraphQLError(`One or more tasks not found: ${notFound.join(", ")}`, {
          extensions: { code: "NOT_FOUND" },
        })
      }

      // Check membership for all unique projects involved
      const projectIds = [...new Set(tasksToDelete.map(t => t.projectId).filter(Boolean))]

      await prisma.task.deleteMany({
        where: { id: { in: ids } },
      })

      return tasksToDelete
    },

    createTaskComment: async (_parent: unknown, args: { taskId: string; content: string }, context: GraphQLContext) => {
      if (!context.user?.id) throw new Error("Authentication required.")
      const { taskId, content } = args
      const authorId = context.user.id

      const [newComment] = await prisma.$transaction([
        prisma.comment.create({
          data: { content, taskId, authorId },
          include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
        }),
        prisma.activity.create({
          data: {
            type: "COMMENT_ADDED",
            data: { content: content.substring(0, 50) + "..." },
            userId: authorId,
            taskId,
          },
        }),
      ])

      return newComment
    },

    deleteTaskComment: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user?.id) throw new Error("Authentication required.")
      const userId = context.user.id

      const comment = await prisma.comment.findUnique({ where: { id: args.id } })
      if (!comment) throw new Error("Comment not found.")
      if (comment.authorId !== userId) throw new Error("You can only delete your own comments.")

      const deletedComment = await prisma.comment.delete({ where: { id: args.id } })
      return deletedComment
    },

    getAttachmentUploadSignature: async (_parent: unknown, args: { taskId: string }, context: GraphQLContext) => {
      if (!context.user?.id) throw new Error("Authentication required.")

      const timestamp = Math.round(new Date().getTime() / 1000)
      const signature = cloudinary.utils.api_sign_request(
        {
          timestamp: timestamp,
          folder: `attachments/${args.taskId}`,
        },
        process.env.CLOUDINARY_API_SECRET!,
      )

      return {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY!,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      }
    },

    confirmAttachmentUpload: async (
      _parent: unknown,
      { input }: { input: ConfirmAttachmentInput },
      context: GraphQLContext,
    ) => {
      if (!context.user?.id) throw new Error("Authentication required.")
      const uploaderId = context.user.id
      const { taskId, publicId, url, fileName, fileType, fileSize } = input
      const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } })
      if (!task) {
        throw new GraphQLError(`Task with ID ${taskId} not found.`, { extensions: { code: "NOT_FOUND" } })
      }
      if (!task.projectId) {
        throw new GraphQLError(`Task with ID ${taskId} is not associated with a project.`, {
          extensions: { code: "BAD_REQUEST" },
        })
      }

      const [newAttachment] = await prisma.$transaction([
        prisma.attachment.create({
          data: {
            url: url,
            publicId: publicId,
            fileName,
            fileType,
            fileSize,
            taskId,
            uploaderId,
          },
          include: { uploader: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
        }),
        prisma.activity.create({
          data: { type: "ATTACHMENT_ADDED", data: { fileName }, userId: uploaderId, taskId, projectId: task.projectId },
        }),
      ])

      return newAttachment
    },

    deleteAttachment: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user?.id) throw new Error("Authentication required.")
      const userId = context.user.id

      const attachment = await prisma.attachment.findUnique({
        where: { id: args.id },
        include: { task: { select: { projectId: true } } },
      })

      if (!attachment) {
        throw new Error("Attachment not found.")
      }
      if (!attachment.task.projectId) {
        throw new GraphQLError(`Task with ID ${attachment.taskId} is not associated with a project.`, {
          extensions: { code: "BAD_REQUEST" },
        })
      }

      // Determine resource_type from the URL which is the most reliable indicator of how Cloudinary stored it
      let resourceType = "image"
      if (attachment.url.includes("/raw/")) {
        resourceType = "raw"
      } else if (attachment.url.includes("/video/")) {
        resourceType = "video"
      }

      await cloudinary.uploader.destroy(attachment.publicId, { resource_type: resourceType })

      const [deletedAttachment] = await prisma.$transaction([
        prisma.attachment.delete({ where: { id: args.id } }),
        prisma.activity.create({
          data: {
            type: "ATTACHMENT_REMOVED",
            data: { fileName: attachment.fileName },
            userId: userId,
            taskId: attachment.taskId,
            projectId: attachment.task.projectId,
          },
        }),
      ])

      return deletedAttachment
    },

    createGanttTask: async (_parent: unknown, { input }: { input: CreateGanttTaskInput }, context: GraphQLContext) => {
      // This is a specialized task creation. It maps to the main task model.
      if (!context.user?.id) throw new Error("Authentication required.")

      // SENIOR ENGINEER CHANGE: Retrieve the first section for the project to auto-assign
      // We order by 'order' ascending to ensure it lands in the first visible column (e.g., "To Do")
      const firstSection = await prisma.section.findFirst({
        where: {
          projectId: input.projectId,
        },
        orderBy: {
          order: "asc",
        },
        select: {
          id: true,
        },
      })

      const createdAt = new Date()
      const startDate = input.startDate ? new Date(input.startDate) : createdAt
      let endDate
      if (input.endDate) {
        endDate = new Date(input.endDate)
      } else {
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 1)
      }

      const newGanttTask = await prisma.task.create({
        data: {
          title: input.name,
          description: input.description,
          startDate: startDate,
          endDate: endDate,
          assigneeId: input.assigneeId,
          completionPercentage: input.progress,
          projectId: input.projectId,
          sprintId: input.sprintId,
          creatorId: context.user.id,
          // SENIOR ENGINEER CHANGE: Use the found section ID, fallback to null if no sections exist
          sectionId: firstSection?.id ?? null,
        },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true },
          },
        },
      })

      return {
        ...newGanttTask,
        name: newGanttTask.title,
        start: newGanttTask.startDate?.toISOString(),
        end: newGanttTask.endDate?.toISOString(),
        progress: newGanttTask.completionPercentage ?? 0,
        sprint: newGanttTask.sprintId,
        assignee: newGanttTask.assignee || null,

        // --- FIX ---
        // Manually add the missing fields that the client is requesting
        // to satisfy the schema and ensure cache consistency.
        type: input.type, // Pass the type from the input to the response
        originalTaskId: newGanttTask.id,
        originalType: input.type.toUpperCase(), // e.g., 'TASK' or 'MILESTONE' for consistency
      }
    },

    updateGanttTask: async (_parent: unknown, { input }: { input: UpdateGanttTaskInput }, context: GraphQLContext) => {
      if (!context.user?.id) throw new Error("Authentication required.")
      const { id, type, name, ...updates } = input

      const updatedGanttTask = await prisma.task.update({
        where: { id },
        data: {
          title: name === null ? undefined : name,
          description: updates.description,
          startDate: updates.startDate ? new Date(updates.startDate) : undefined,
          endDate: updates.endDate ? new Date(updates.endDate) : undefined,
          assigneeId: updates.assigneeId,
          completionPercentage: updates.progress,
        },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true },
          },
        },
      })

      return {
        ...updatedGanttTask,
        name: updatedGanttTask.title,
        start: updatedGanttTask.startDate!.toISOString(),
        end: updatedGanttTask.endDate!.toISOString(),
        progress: updatedGanttTask.completionPercentage ?? 0,
        type: type,
        sprint: updatedGanttTask.sprintId,
        assignee: (updatedGanttTask as any).assignee || null,
        originalTaskId: updatedGanttTask.id,
        originalType: type,
        displayOrder: input.displayOrder,
      }
    },
  },

  Task: {
    commentCount: (parent: { id: string }) => {
      return prisma.comment.count({ where: { taskId: parent.id } })
    },
    attachmentCount: (parent: { id: string }) => {
      return prisma.attachment.count({ where: { taskId: parent.id } })
    },
  },

  TaskListView: {
    completed: (parent: { status: TaskStatus }) => parent.status === "DONE",
    dueDate: (parent: { dueDate: Date | string | null }) => {
      if (!parent.dueDate) return null
      const date = new Date(parent.dueDate)
      if (isNaN(date.getTime())) return null
      return date.toISOString().split("T")[0]
    },
    assignee: async (parent: { assigneeId: string | null; assignee?: any }, _args: unknown, context: GraphQLContext) => {
      if (parent.assignee) return parent.assignee
      if (!parent.assigneeId) return null
      return context.prisma.user.findUnique({
        where: { id: parent.assigneeId },
        select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true },
      })
    },
  },
}

export default taskResolver