// import { prisma } from "@/lib/prisma"
// import { TaskStatus, Priority, ActivityType } from "@prisma/client"
// import { GraphQLError } from "graphql"

// function log(prefix: string, message: string, data?: any) {
//   const timestamp = new Date().toISOString()
//   if (data !== undefined) {
//     console.log(`${timestamp} ${prefix} ${message}`, data)
//   } else {
//     console.log(`${timestamp} ${prefix} ${message}`)
//   }
// }

// interface GraphQLContext {
//   prisma: typeof prisma
//   user?: { id: string; email: string; role: string }
// }

// // Input types for personal task mutations
// interface CreatePersonalTaskInput {
//   personalSectionId: string
//   title: string
//   description?: string | null
//   status?: TaskStatus
//   priority?: Priority
//   dueDate?: string | null
//   startDate?: string | null
//   endDate?: string | null
//   points?: number | null
//   parentId?: string | null
// }

// interface UpdatePersonalTaskInput {
//   id: string
//   title?: string | null
//   description?: string | null
//   status?: TaskStatus
//   priority?: Priority
//   dueDate?: string | null
//   startDate?: string | null
//   endDate?: string | null
//   points?: number | null
//   parentId?: string | null
//   isCompleted?: boolean
//   personalSectionId?: string | null
// }

// // Helper to check if a user is authorized to access a task
// const checkTaskAuthorization = async (userId: string, taskId: string) => {
//   const task = await prisma.task.findUnique({
//     where: { id: taskId },
//     select: {
//       personalUserId: true,
//       project: {
//         select: {
//           members: {
//             where: { userId: userId },
//             select: { userId: true },
//           },
//         },
//       },
//     },
//   })

//   if (!task) {
//     throw new GraphQLError("Task not found.", { extensions: { code: "NOT_FOUND" } })
//   }

//   const isPersonalOwner = task.personalUserId === userId
//   const isProjectMember = task.project?.members.length > 0

//   if (!isPersonalOwner && !isProjectMember) {
//     throw new GraphQLError("Access Denied: You are not authorized to access this task.", {
//       extensions: { code: "FORBIDDEN" },
//     })
//   }
//   return task // Return task for context if needed
// }

// const toISODateString = (date: Date | null | undefined): string | null => {
//   return date ? date.toISOString().split("T")[0] : null
// }

// export const personalTaskResolver = {
//   Query: {
//     // The generic `task` query can live here or in the project task resolver.
//     // It's adapted to handle both personal and project tasks.
//     task: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
//       log("[Task Query]", `Fetching details for task ID: ${args.id}`)
//       if (!context.user?.id) {
//         throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
//       }
//       const userId = context.user.id

//       const task = await prisma.task.findUnique({
//         where: { id: args.id },
//         include: {
//           assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
//           creator: { select: { id: true, firstName: true, lastName: true, avatar: true } },
//           sprint: { select: { id: true, name: true } },
//           section: { select: { id: true, name: true } },
//           personalSection: { select: { id: true, name: true } },
//           comments: {
//             include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
//             orderBy: { createdAt: "asc" },
//           },
//           attachments: {
//             include: { uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
//             orderBy: { createdAt: "asc" },
//           },
//           activities: {
//             include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
//             orderBy: { createdAt: "desc" },
//           },
//         },
//       })

//       if (!task) {
//         throw new GraphQLError("Task not found", { extensions: { code: "NOT_FOUND" } })
//       }

//       // Authorization Check
//       await checkTaskAuthorization(userId, args.id)

//       return task
//     },
//   },

//   Mutation: {
//     createPersonalTask: async (
//       _parent: unknown,
//       { input }: { input: CreatePersonalTaskInput },
//       context: GraphQLContext
//     ) => {
//       log("[createPersonalTask Mutation]", "called with input:", input)
//       if (!context.user?.id)
//         throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
//       const userId = context.user.id

//       const newPersonalTask = await prisma.task.create({
//         data: {
//           ...input,
//           creatorId: userId,
//           personalUserId: userId, // Link to the user
//           dueDate: input.dueDate ? new Date(input.dueDate) : null,
//           startDate: input.startDate ? new Date(input.startDate) : null,
//           endDate: input.endDate ? new Date(input.endDate) : null,
//         },
//       })

//       log("[createPersonalTask Mutation]", "Personal task created successfully:", { id: newPersonalTask.id })
//       return {
//         ...newPersonalTask,
//         dueDate: toISODateString(newPersonalTask.dueDate),
//         startDate: toISODateString(newPersonalTask.startDate),
//         endDate: toISODateString(newPersonalTask.endDate),
//         assignee: null, // Personal tasks are self-assigned
//       }
//     },

//     updatePersonalTask: async (
//       _parent: unknown,
//       args: { input: UpdatePersonalTaskInput },
//       context: GraphQLContext
//     ) => {
//       log("[updatePersonalTask Mutation]", "called with input:", args.input)

//       if (!context.user?.id)
//         throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
//       const userId = context.user.id
//       const { id: taskId, ...updates } = args.input

//       const existingTask = await prisma.task.findUnique({
//         where: { id: taskId },
//       })

//       if (!existingTask)
//         throw new GraphQLError("Task not found.", { extensions: { code: "NOT_FOUND" } })
//       if (existingTask.personalUserId !== userId)
//         throw new GraphQLError("You can only update your own personal tasks.", {
//           extensions: { code: "FORBIDDEN" },
//         })

//       const updatedTask = await prisma.task.update({
//         where: { id: taskId },
//         data: {
//           ...updates,
//           dueDate: updates.dueDate ? new Date(updates.dueDate) : updates.dueDate === null ? null : undefined,
//           startDate:
//             updates.startDate ? new Date(updates.startDate) : updates.startDate === null ? null : undefined,
//           endDate: updates.endDate ? new Date(updates.endDate) : updates.endDate === null ? null : undefined,
//           completed: updates.isCompleted !== undefined ? updates.isCompleted : updates.status === "DONE",
//         },
//       })

//       log("[updatePersonalTask Mutation]", "Personal task updated successfully:", { id: updatedTask.id })
//       return {
//         ...updatedTask,
//         dueDate: toISODateString(updatedTask.dueDate),
//         startDate: toISODateString(updatedTask.startDate),
//         endDate: toISODateString(updatedTask.endDate),
//         assignee: null,
//       }
//     },

//     deletePersonalTask: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
//       log("[deletePersonalTask Mutation]", `called for task ID: ${args.id}`)
//       if (!context.user?.id)
//         throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
//       const userId = context.user.id

//       const task = await prisma.task.findUnique({ where: { id: args.id } })
//       if (!task) throw new GraphQLError("Task not found.", { extensions: { code: "NOT_FOUND" } })
//       if (task.personalUserId !== userId)
//         throw new GraphQLError("You can only delete your own personal tasks.", {
//           extensions: { code: "FORBIDDEN" },
//         })

//       const deletedTask = await prisma.task.delete({ where: { id: args.id } })

//       log("[deletePersonalTask Mutation]", "Personal task deleted successfully:", deletedTask)
//       return {
//         ...deletedTask,
//         dueDate: toISODateString(deletedTask.dueDate),
//         startDate: toISODateString(deletedTask.startDate),
//         endDate: toISODateString(deletedTask.endDate),
//       }
//     },
//   },

//   Task: {
//     // These resolvers work for both personal and project tasks
//     commentCount: (parent: { id: string }) => {
//       return prisma.comment.count({ where: { taskId: parent.id } })
//     },
//     attachmentCount: (parent: { id: string }) => {
//       return prisma.attachment.count({ where: { taskId: parent.id } })
//     },
//   },

//   TaskListView: {
//     // These resolvers work for both personal and project tasks
//     completed: (parent: { status: TaskStatus }) => parent.status === "DONE",
//     dueDate: (parent: { dueDate: Date | string | null }) => {
//       if (!parent.dueDate) return null
//       const date = new Date(parent.dueDate)
//       if (isNaN(date.getTime())) return null
//       return date.toISOString().split("T")[0]
//     },
//     assignee: async (
//       parent: { assigneeId: string | null; assignee?: any },
//       _args: unknown,
//       context: GraphQLContext
//     ) => {
//       // For personal tasks, assignee will be null. This correctly handles project tasks.
//       if (parent.assignee) return parent.assignee
//       if (!parent.assigneeId) return null
//       return context.prisma.user.findUnique({
//         where: { id: parent.assigneeId },
//         select: { id: true, firstName: true, lastName: true, avatar: true },
//       })
//     },
//   },
// }

// export default personalTaskResolver


import { prisma } from "@/lib/prisma"
import { TaskStatus, Priority } from "@prisma/client"
import { GraphQLError } from "graphql"

function log(prefix: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  if (data !== undefined) {
    console.log(`${timestamp} ${prefix} ${message}`, data)
  } else {
    console.log(`${timestamp} ${prefix} ${message}`)
  }
}

interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

// Input types for personal task mutations
interface CreatePersonalTaskInput {
  personalSectionId: string
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: Priority
  dueDate?: string | null
  startDate?: string | null
  endDate?: string | null
  points?: number | null
  parentId?: string | null
}

interface UpdatePersonalTaskInput {
  id: string
  title?: string | null
  description?: string | null
  status?: TaskStatus
  priority?: Priority
  dueDate?: string | null
  startDate?: string | null
  endDate?: string | null
  points?: number | null
  parentId?: string | null
  isCompleted?: boolean
  personalSectionId?: string | null
}

interface CreatePersonalGanttTaskInput {
  personalSectionId: string
  name: string
  description?: string | null
  startDate: string
  endDate: string
  progress?: number | null
  type: "task" // Personal Gantt only supports 'task'
}

interface UpdatePersonalGanttTaskInput {
  id: string
  type: "TASK" // Prisma model name
  name?: string | null
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  progress?: number | null
}

// Helper to check if a user is authorized to access a task
const checkTaskAuthorization = async (userId: string, taskId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { personalUserId: true },
  })

  if (!task) {
    throw new GraphQLError("Task not found.", { extensions: { code: "NOT_FOUND" } })
  }

  if (task.personalUserId !== userId) {
    throw new GraphQLError("Access Denied: You are not authorized to access this task.", {
      extensions: { code: "FORBIDDEN" },
    })
  }
  return task
}

const toISODateString = (date: Date | null | undefined): string | null => {
  return date ? date.toISOString().split("T")[0] : null
}

export const personalTaskResolver = {
  Query: {
    getMyGanttData: async (_parent: unknown, _args: {}, context: GraphQLContext) => {
      log("[getMyGanttData Query]", "called")
      if (!context.user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }
      const userId = context.user.id

      try {
        const personalSections = await prisma.personalSection.findMany({
          where: { userId },
          select: { id: true, name: true, order: true },
          orderBy: { order: "asc" },
        })

        const personalTasks = await prisma.task.findMany({
          where: {
            personalUserId: userId,
            OR: [{ startDate: { not: null } }, { endDate: { not: null } }, { dueDate: { not: null } }],
          },
        })

        const ganttTasks: any[] = []
        let displayOrder = 1

        personalSections.forEach(section => {
          ganttTasks.push({
            id: section.id,
            name: section.name,
            start: new Date(), // Placeholder, will be adjusted
            end: new Date(), // Placeholder, will be adjusted
            progress: 100,
            type: "project",
            hideChildren: false,
            displayOrder: displayOrder++,
            originalTaskId: section.id,
            originalType: "SECTION",
          })
        })

        const sectionDateRanges: { [key: string]: { start: Date; end: Date } } = {}

        personalTasks.forEach(task => {
          const startDate = task.startDate || task.createdAt
          const endDate = task.endDate || task.dueDate || new Date(new Date(startDate).setDate(startDate.getDate() + 1))

          ganttTasks.push({
            id: task.id,
            name: task.title,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            progress: task.completed ? 100 : task.completionPercentage ?? 0,
            type: "task",
            personalSectionId: task.personalSectionId,
            displayOrder: displayOrder++,
            description: task.description,
            originalTaskId: task.id,
            originalType: "TASK",
          })

          if (task.personalSectionId) {
            if (!sectionDateRanges[task.personalSectionId]) {
              sectionDateRanges[task.personalSectionId] = { start: startDate, end: endDate }
            } else {
              if (startDate < sectionDateRanges[task.personalSectionId].start) {
                sectionDateRanges[task.personalSectionId].start = startDate
              }
              if (endDate > sectionDateRanges[task.personalSectionId].end) {
                sectionDateRanges[task.personalSectionId].end = endDate
              }
            }
          }
        })

        // Adjust section dates
        ganttTasks.forEach(gt => {
          if (gt.originalType === "SECTION" && sectionDateRanges[gt.id]) {
            gt.start = sectionDateRanges[gt.id].start.toISOString()
            gt.end = sectionDateRanges[gt.id].end.toISOString()
          }
        })

        return {
          sections: personalSections,
          tasks: ganttTasks,
        }
      } catch (error) {
        log("[getMyGanttData Query]", "Error fetching personal Gantt data:", error)
        throw error
      }
    },


  personalTask: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
    log("[Personal Task Query]", `Fetching details for personal task ID: ${args.id}`);
    if (!context.user?.id) {
      throw new Error("Authentication required.");
    }
    const userId = context.user.id;
    
    const task = await prisma.task.findFirst({
      where: {
        id: args.id,
        creatorId: userId, // The user must be the creator.
        projectId: null,   // It must be a personal task (no project).
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
  },
  },

  Mutation: {
    createPersonalTask: async (
      _parent: unknown,
      { input }: { input: CreatePersonalTaskInput },
      context: GraphQLContext
    ) => {
      if (!context.user?.id)
        throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
      const userId = context.user.id

      const newPersonalTask = await prisma.task.create({
        data: {
          ...input,
          creatorId: userId,
          personalUserId: userId,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
        },
      })
      return { ...newPersonalTask, assignee: null }
    },

    updatePersonalTask: async (
      _parent: unknown,
      args: { input: UpdatePersonalTaskInput },
      context: GraphQLContext
    ) => {
      if (!context.user?.id)
        throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
      await checkTaskAuthorization(context.user.id, args.input.id)

      const updatedTask = await prisma.task.update({
        where: { id: args.input.id },
        data: {
          ...args.input,
          dueDate:
            args.input.dueDate ? new Date(args.input.dueDate) : args.input.dueDate === null ? null : undefined,
          startDate:
            args.input.startDate
              ? new Date(args.input.startDate)
              : args.input.startDate === null
              ? null
              : undefined,
          endDate:
            args.input.endDate ? new Date(args.input.endDate) : args.input.endDate === null ? null : undefined,
          completed:
            args.input.isCompleted !== undefined
              ? args.input.isCompleted
              : args.input.status === "DONE",
        },
      })
      return { ...updatedTask, assignee: null }
    },

    deletePersonalTask: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      if (!context.user?.id)
        throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
      await checkTaskAuthorization(context.user.id, args.id)

      return await prisma.task.delete({ where: { id: args.id } })
    },

    createPersonalGanttTask: async (
      _parent: unknown,
      { input }: { input: CreatePersonalGanttTaskInput },
      context: GraphQLContext
    ) => {
      if (!context.user?.id) throw new GraphQLError("Authentication required.")
      const userId = context.user.id

      const newTask = await prisma.task.create({
        data: {
          title: input.name,
          description: input.description,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          completionPercentage: input.progress,
          creatorId: userId,
          personalUserId: userId,
          personalSectionId: input.personalSectionId,
        },
      })

      return {
        ...newTask,
        name: newTask.title,
        start: newTask.startDate?.toISOString(),
        end: newTask.endDate?.toISOString(),
        progress: newTask.completionPercentage,
        type: "task",
        originalTaskId: newTask.id,
        originalType: "TASK",
      }
    },

    updatePersonalGanttTask: async (
      _parent: unknown,
      { input }: { input: UpdatePersonalGanttTaskInput },
      context: GraphQLContext
    ) => {
      if (!context.user?.id) throw new GraphQLError("Authentication required.")
      await checkTaskAuthorization(context.user.id, input.id)

      const updatedTask = await prisma.task.update({
        where: { id: input.id },
        data: {
          title: input.name,
          description: input.description,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          completionPercentage: input.progress,
        },
      })

      if (!updatedTask.startDate || !updatedTask.endDate) {
        throw new Error("Invalid state: Gantt tasks must have a start and end date.")
      }

      return {
        ...updatedTask,
        name: updatedTask.title,
        start: updatedTask.startDate.toISOString(),
        end: updatedTask.endDate.toISOString(),
        progress: updatedTask.completionPercentage ?? 0,
        type: "task",
        personalSectionId: updatedTask.personalSectionId,
        originalTaskId: updatedTask.id,
        originalType: "TASK",
      }
    },
  },
}

export default personalTaskResolver











