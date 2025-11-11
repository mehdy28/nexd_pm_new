// // graphql/resolvers/personalTaskResolver.ts
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

// interface CreatePersonalGanttTaskInput {
//   personalSectionId: string
//   name: string
//   description?: string | null
//   startDate: string
//   endDate: string
//   progress?: number | null
//   type: "task" // Personal Gantt only supports 'task'
// }

// interface UpdatePersonalGanttTaskInput {
//   id: string
//   type: "TASK" // Prisma model name
//   name?: string | null
//   description?: string | null
//   startDate?: string | null
//   endDate?: string | null
//   progress?: number | null
// }

// // Helper to check if a user is authorized to access a task
// const checkTaskAuthorization = async (userId: string, taskId: string) => {
//   const task = await prisma.task.findUnique({
//     where: { id: taskId },
//     select: { personalUserId: true },
//   })

//   if (!task) {
//     throw new GraphQLError("Task not found.", { extensions: { code: "NOT_FOUND" } })
//   }

//   if (task.personalUserId !== userId) {
//     throw new GraphQLError("Access Denied: You are not authorized to access this task.", {
//       extensions: { code: "FORBIDDEN" },
//     })
//   }
//   return task
// }

// const toISODateString = (date: Date | null | undefined): string | null => {
//   return date ? date.toISOString().split("T")[0] : null
// }

// export const personalTaskResolver = {
//   Query: {
//     getMyGanttData: async (_parent: unknown, _args: {}, context: GraphQLContext) => {
//       log("[getMyGanttData Query]", "called")
//       if (!context.user?.id) {
//         throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
//       }
//       const userId = context.user.id

//       try {
//         const personalSections = await prisma.personalSection.findMany({
//           where: { userId },
//           select: { id: true, name: true, order: true },
//           orderBy: { order: "asc" },
//         })

//         const personalTasks = await prisma.task.findMany({
//           where: {
//             personalUserId: userId,
//             OR: [{ startDate: { not: null } }, { endDate: { not: null } }, { dueDate: { not: null } }],
//           },
//         })

//         const ganttTasks: any[] = []
//         let displayOrder = 1

//         personalSections.forEach(section => {
//           ganttTasks.push({
//             id: section.id,
//             name: section.name,
//             start: new Date(), // Placeholder, will be adjusted
//             end: new Date(), // Placeholder, will be adjusted
//             progress: 100,
//             type: "project",
//             hideChildren: false,
//             displayOrder: displayOrder++,
//             originalTaskId: section.id,
//             originalType: "SECTION",
//           })
//         })

//         const sectionDateRanges: { [key: string]: { start: Date; end: Date } } = {}

//         personalTasks.forEach(task => {
//           const startDate = task.startDate || task.createdAt
//           const endDate = task.endDate || task.dueDate || new Date(new Date(startDate).setDate(startDate.getDate() + 1))

//           ganttTasks.push({
//             id: task.id,
//             name: task.title,
//             start: startDate.toISOString(),
//             end: endDate.toISOString(),
//             progress: task.completed ? 100 : task.completionPercentage ?? 0,
//             type: "task",
//             personalSectionId: task.personalSectionId,
//             displayOrder: displayOrder++,
//             description: task.description,
//             originalTaskId: task.id,
//             originalType: "TASK",
//           })

//           if (task.personalSectionId) {
//             if (!sectionDateRanges[task.personalSectionId]) {
//               sectionDateRanges[task.personalSectionId] = { start: startDate, end: endDate }
//             } else {
//               if (startDate < sectionDateRanges[task.personalSectionId].start) {
//                 sectionDateRanges[task.personalSectionId].start = startDate
//               }
//               if (endDate > sectionDateRanges[task.personalSectionId].end) {
//                 sectionDateRanges[task.personalSectionId].end = endDate
//               }
//             }
//           }
//         })

//         // Adjust section dates
//         ganttTasks.forEach(gt => {
//           if (gt.originalType === "SECTION" && sectionDateRanges[gt.id]) {
//             gt.start = sectionDateRanges[gt.id].start.toISOString()
//             gt.end = sectionDateRanges[gt.id].end.toISOString()
//           }
//         })

//         return {
//           sections: personalSections,
//           tasks: ganttTasks,
//         }
//       } catch (error) {
//         log("[getMyGanttData Query]", "Error fetching personal Gantt data:", error)
//         throw error
//       }
//     },


//   personalTask: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
//     log("[Personal Task Query]", `Fetching details for personal task ID: ${args.id}`);
//     if (!context.user?.id) {
//       throw new Error("Authentication required.");
//     }
//     const userId = context.user.id;
    
//     const task = await prisma.task.findFirst({
//       where: {
//         id: args.id,
//         creatorId: userId, // The user must be the creator.
//         projectId: null,   // It must be a personal task (no project).
//       },
//       include: {
//         assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
//         creator: { select: { id: true, firstName: true, lastName: true, avatar: true } },
//         sprint: { select: { id: true, name: true } },
//         section: { select: { id: true, name: true } },
//         comments: {
//           include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
//           orderBy: { createdAt: 'asc' }
//         },
//         attachments: {
//           include: { uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
//           orderBy: { createdAt: 'asc' }
//         },
//         activities: {
//           include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
//           orderBy: { createdAt: 'desc' }
//         },
//       },
//     });

//     return task;
//   },
//   },

//   Mutation: {
//     createPersonalTask: async (
//       _parent: unknown,
//       { input }: { input: CreatePersonalTaskInput },
//       context: GraphQLContext
//     ) => {
//       if (!context.user?.id)
//         throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
//       const userId = context.user.id

//       const createdAt = new Date()
//       const startDate = input.startDate ? new Date(input.startDate) : createdAt
//       let endDate
//       if (input.endDate) {
//         endDate = new Date(input.endDate)
//       } else {
//         endDate = new Date(startDate)
//         endDate.setDate(endDate.getDate() + 1)
//       }

//       const newPersonalTask = await prisma.task.create({
//         data: {
//           ...input,
//           creatorId: userId,
//           personalUserId: userId,
//           dueDate: input.dueDate ? new Date(input.dueDate) : null,
//           startDate: startDate,
//           endDate: endDate,
//         },
//       })

//       await prisma.activity.create({
//         data: {
//           type: ActivityType.TASK_CREATED,
//           userId: userId,
//           taskId: newPersonalTask.id,
//           data: {
//             title: newPersonalTask.title,
//           },
//         },
//       })

//       return { ...newPersonalTask, assignee: null }
//     },

//         updatePersonalTask: async (
//           _parent: unknown,
//           args: { input: UpdatePersonalTaskInput },
//           context: GraphQLContext
//         ) => {
//           log("[updatePersonalTask Resolver]", `Mutation called for task ID: ${args.input.id}`, { input: args.input })
    
//           if (!context.user?.id)
//             throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
//           const userId = context.user.id
//           const { input } = args
    
//           log("[updatePersonalTask Resolver]", `Checking authorization for user ${userId} and task ${input.id}`)
//           await checkTaskAuthorization(userId, input.id)
//           log("[updatePersonalTask Resolver]", `Authorization successful.`)
    
//           log("[updatePersonalTask Resolver]", `Fetching existing task data for ID: ${input.id}`)
//           const existingTask = await prisma.task.findUnique({
//             where: { id: input.id },
//           })
//           if (!existingTask) {
//             throw new GraphQLError("Task not found.", { extensions: { code: "NOT_FOUND" } })
//           }
//           log("[updatePersonalTask Resolver]", `Found existing task data.`, {
//             title: existingTask.title,
//             status: existingTask.status,
//             assigneeId: existingTask.assigneeId,
//           })
    
//           const updatePayload = {
//             ...input,
//             dueDate: input.dueDate ? new Date(input.dueDate) : input.dueDate === null ? null : undefined,
//             startDate: input.startDate ? new Date(input.startDate) : input.startDate === null ? null : undefined,
//             endDate: input.endDate ? new Date(input.endDate) : input.endDate === null ? null : undefined,
//             completed: input.isCompleted !== undefined ? input.isCompleted : input.status === "DONE",
//           }
//           log("[updatePersonalTask Resolver]", `Constructed Prisma update payload.`, { updatePayload })
    
//           log("[updatePersonalTask Resolver]", `Calling prisma.task.update with included assignee...`)
//           const updatedTask = await prisma.task.update({
//             where: { id: input.id },
//             data: updatePayload,
//             // ADJUSTMENT 1: Include the assignee data in the response from Prisma.
//             include: {
//               assignee: {
//                 select: {
//                   id: true,
//                   firstName: true,
//                   lastName: true,
//                   avatar: true,
//                 },
//               },
//             },
//           })
//           log("[updatePersonalTask Resolver]", `Prisma update successful. Task data returned from DB:`, { updatedTask })
    
//           const activitiesToCreate: any[] = []
    
//           if (input.title !== undefined && input.title !== existingTask.title) {
//             activitiesToCreate.push({
//               type: ActivityType.TASK_UPDATED,
//               userId,
//               taskId: updatedTask.id,
//               data: { field: "title", oldValue: existingTask.title, newValue: input.title },
//             })
//           }
    
//           if (input.description !== undefined && input.description !== existingTask.description) {
//             activitiesToCreate.push({
//               type: ActivityType.DESCRIPTION_UPDATED,
//               userId,
//               taskId: updatedTask.id,
//               data: { oldValue: existingTask.description, newValue: input.description },
//             })
//           }
    
//           if (input.status !== undefined && input.status !== existingTask.status) {
//             activitiesToCreate.push({
//               type: ActivityType.STATUS_UPDATED,
//               userId,
//               taskId: updatedTask.id,
//               data: { oldValue: existingTask.status, newValue: input.status },
//             })
//           }
    
//           if (input.priority !== undefined && input.priority !== existingTask.priority) {
//             activitiesToCreate.push({
//               type: ActivityType.PRIORITY_UPDATED,
//               userId,
//               taskId: updatedTask.id,
//               data: { oldValue: existingTask.priority, newValue: input.priority },
//             })
//           }
    
//           if (input.dueDate !== undefined) {
//             const newDueDate = input.dueDate ? new Date(input.dueDate) : null
//             if ((newDueDate?.getTime() || null) !== (existingTask.dueDate?.getTime() || null)) {
//               activitiesToCreate.push({
//                 type: ActivityType.DUE_DATE_UPDATED,
//                 userId,
//                 taskId: updatedTask.id,
//                 data: {
//                   oldValue: existingTask.dueDate?.toISOString() || null,
//                   newValue: newDueDate?.toISOString() || null,
//                 },
//               })
//             }
//           }
    
//           if (input.points !== undefined && input.points !== existingTask.points) {
//             activitiesToCreate.push({
//               type: ActivityType.POINTS_UPDATED,
//               userId,
//               taskId: updatedTask.id,
//               data: { oldValue: existingTask.points, newValue: input.points },
//             })
//           }
    
//           if (updatedTask.completed && !existingTask.completed) {
//             activitiesToCreate.push({
//               type: ActivityType.TASK_COMPLETED,
//               userId,
//               taskId: updatedTask.id,
//               data: { title: updatedTask.title },
//             })
//           }
    
//           log("[updatePersonalTask Resolver]", `Found ${activitiesToCreate.length} activities to create.`)
//           if (activitiesToCreate.length > 0) {
//             log("[updatePersonalTask Resolver]", `Calling prisma.activity.createMany...`)
//             await prisma.activity.createMany({
//               data: activitiesToCreate,
//             })
//             log("[updatePersonalTask Resolver]", `Activity creation successful.`)
//           }
    
//           // ADJUSTMENT 2: Return the complete task object directly.
//           log("[updatePersonalTask Resolver]", `Returning final task object to GraphQL client.`, { updatedTask })
//           return updatedTask
//         },

//     deletePersonalTask: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
//       if (!context.user?.id)
//         throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
//       await checkTaskAuthorization(context.user.id, args.id)

//       return await prisma.task.delete({ where: { id: args.id } })
//     },

//     createPersonalGanttTask: async (
//       _parent: unknown,
//       { input }: { input: CreatePersonalGanttTaskInput },
//       context: GraphQLContext
//     ) => {
//       if (!context.user?.id) throw new GraphQLError("Authentication required.")
//       const userId = context.user.id

//       const createdAt = new Date()
//       const startDate = input.startDate ? new Date(input.startDate) : createdAt
//       let endDate
//       if (input.endDate) {
//         endDate = new Date(input.endDate)
//       } else {
//         endDate = new Date(startDate)
//         endDate.setDate(endDate.getDate() + 1)
//       }

//       const newTask = await prisma.task.create({
//         data: {
//           title: input.name,
//           description: input.description,
//           startDate: startDate,
//           endDate: endDate,
//           completionPercentage: input.progress,
//           creatorId: userId,
//           personalUserId: userId,
//           personalSectionId: input.personalSectionId,
//         },
//       })

//       return {
//         ...newTask,
//         name: newTask.title,
//         start: newTask.startDate?.toISOString(),
//         end: newTask.endDate?.toISOString(),
//         progress: newTask.completionPercentage,
//         type: "task",
//         originalTaskId: newTask.id,
//         originalType: "TASK",
//       }
//     },

//     updatePersonalGanttTask: async (
//       _parent: unknown,
//       { input }: { input: UpdatePersonalGanttTaskInput },
//       context: GraphQLContext
//     ) => {
//       if (!context.user?.id) throw new GraphQLError("Authentication required.")
//       await checkTaskAuthorization(context.user.id, input.id)

//       const updatedTask = await prisma.task.update({
//         where: { id: input.id },
//         data: {
//           title: input.name,
//           description: input.description,
//           startDate: input.startDate ? new Date(input.startDate) : undefined,
//           endDate: input.endDate ? new Date(input.endDate) : undefined,
//           completionPercentage: input.progress,
//         },
//       })


//       return {
//         ...updatedTask,
//         name: updatedTask.title,
//         start: updatedTask.startDate!.toISOString(),
//         end: updatedTask.endDate!.toISOString(),
//         progress: updatedTask.completionPercentage ?? 0,
//         type: "task",
//         personalSectionId: updatedTask.personalSectionId,
//         originalTaskId: updatedTask.id,
//         originalType: "TASK",
//       }
//     },
//   },
// }

// export default personalTaskResolver

import { prisma } from "@/lib/prisma"
import { TaskStatus, Priority, ActivityType } from "@prisma/client"
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
  displayOrder?: number | null // <-- ADD THIS
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
        // Step 1: Fetch sections and tasks concurrently
        const [personalSections, personalTasks] = await Promise.all([
          prisma.personalSection.findMany({
            where: { userId },
            select: { id: true, name: true }, // Only fetch what's needed for the response
            orderBy: { order: "asc" },
          }),
          prisma.task.findMany({
            where: {
              personalUserId: userId,
              OR: [{ startDate: { not: null } }, { endDate: { not: null } }, { dueDate: { not: null } }],
            },
            orderBy: { startDate: "asc" }, // Sort tasks within a section by start date
          }),
        ])

        // Step 2: Group tasks by section and calculate date ranges for sections
        const tasksBySectionId = new Map<string, typeof personalTasks>()
        const sectionDateRanges = new Map<string, { start: Date; end: Date }>()
        const orphanedTasks: typeof personalTasks = []

        for (const task of personalTasks) {
          const sectionId = task.personalSectionId
          if (sectionId) {
            // Group tasks
            if (!tasksBySectionId.has(sectionId)) {
              tasksBySectionId.set(sectionId, [])
            }
            tasksBySectionId.get(sectionId)!.push(task)

            // Calculate date ranges
            const startDate = task.startDate || task.createdAt
            const endDate =
              task.endDate || task.dueDate || new Date(new Date(startDate).setDate(startDate.getDate() + 1))

            const currentRange = sectionDateRanges.get(sectionId)
            if (!currentRange) {
              sectionDateRanges.set(sectionId, { start: startDate, end: endDate })
            } else {
              if (startDate < currentRange.start) currentRange.start = startDate
              if (endDate > currentRange.end) currentRange.end = endDate
            }
          } else {
            orphanedTasks.push(task)
          }
        }

        // Step 3: Build the final hierarchical list with calculated displayOrder
        const finalGanttTasks: any[] = []
        let displayOrder = 1

        for (const section of personalSections) {
          const range = sectionDateRanges.get(section.id)
          // Add section as a "project"
          finalGanttTasks.push({
            id: section.id,
            name: section.name,
            start: (range?.start || new Date()).toISOString(),
            end: (range?.end || new Date()).toISOString(),
            progress: 100,
            type: "project",
            project: null,
            personalSectionId: null,
            hideChildren: false,
            displayOrder: displayOrder++,
            description: null,
            originalTaskId: section.id,
            originalType: "SECTION",
          })

          // Add tasks for this section
          const childrenTasks = tasksBySectionId.get(section.id) || []
          for (const task of childrenTasks) {
            const startDate = task.startDate || task.createdAt
            const endDate =
              task.endDate || task.dueDate || new Date(new Date(startDate).setDate(startDate.getDate() + 1))
            finalGanttTasks.push({
              id: task.id,
              name: task.title,
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              progress: task.completed ? 100 : task.completionPercentage ?? 0,
              type: "task",
              project: task.personalSectionId, // Link task to its parent section
              personalSectionId: task.personalSectionId,
              hideChildren: false, // Tasks don't have children in this model
              displayOrder: displayOrder++,
              description: task.description,
              originalTaskId: task.id,
              originalType: "TASK",
            })
          }
        }

        // Add orphaned tasks at the end
        for (const task of orphanedTasks) {
          const startDate = task.startDate || task.createdAt
          const endDate =
            task.endDate || task.dueDate || new Date(new Date(startDate).setDate(startDate.getDate() + 1))
          finalGanttTasks.push({
            id: task.id,
            name: task.title,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            progress: task.completed ? 100 : task.completionPercentage ?? 0,
            type: "task",
            project: task.personalSectionId,
            personalSectionId: task.personalSectionId,
            hideChildren: false,
            displayOrder: displayOrder++,
            description: task.description,
            originalTaskId: task.id,
            originalType: "TASK",
          })
        }

        return {
          sections: personalSections,
          tasks: finalGanttTasks,
        }
      } catch (error) {
        log("[getMyGanttData Query]", "Error fetching personal Gantt data:", error)
        throw error
      }
    },

    personalTask: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      log("[Personal Task Query]", `Fetching details for personal task ID: ${args.id}`)
      if (!context.user?.id) {
        throw new Error("Authentication required.")
      }
      const userId = context.user.id

      const task = await prisma.task.findFirst({
        where: {
          id: args.id,
          creatorId: userId, // The user must be the creator.
          projectId: null, // It must be a personal task (no project).
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          creator: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          sprint: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          comments: {
            include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
            orderBy: { createdAt: "asc" },
          },
          attachments: {
            include: { uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
            orderBy: { createdAt: "asc" },
          },
          activities: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      })

      return task
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

      const createdAt = new Date()
      const startDate = input.startDate ? new Date(input.startDate) : createdAt
      let endDate
      if (input.endDate) {
        endDate = new Date(input.endDate)
      } else {
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 1)
      }

      const newPersonalTask = await prisma.task.create({
        data: {
          ...input,
          creatorId: userId,
          personalUserId: userId,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          startDate: startDate,
          endDate: endDate,
        },
      })

      await prisma.activity.create({
        data: {
          type: ActivityType.TASK_CREATED,
          userId: userId,
          taskId: newPersonalTask.id,
          data: {
            title: newPersonalTask.title,
          },
        },
      })

      return { ...newPersonalTask, assignee: null }
    },

    updatePersonalTask: async (
      _parent: unknown,
      args: { input: UpdatePersonalTaskInput },
      context: GraphQLContext
    ) => {
      log("[updatePersonalTask Resolver]", `Mutation called for task ID: ${args.input.id}`, { input: args.input })

      if (!context.user?.id)
        throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } })
      const userId = context.user.id
      const { input } = args

      log("[updatePersonalTask Resolver]", `Checking authorization for user ${userId} and task ${input.id}`)
      await checkTaskAuthorization(userId, input.id)
      log("[updatePersonalTask Resolver]", `Authorization successful.`)

      log("[updatePersonalTask Resolver]", `Fetching existing task data for ID: ${input.id}`)
      const existingTask = await prisma.task.findUnique({
        where: { id: input.id },
      })
      if (!existingTask) {
        throw new GraphQLError("Task not found.", { extensions: { code: "NOT_FOUND" } })
      }
      log("[updatePersonalTask Resolver]", `Found existing task data.`, {
        title: existingTask.title,
        status: existingTask.status,
        assigneeId: existingTask.assigneeId,
      })

      const updatePayload = {
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : input.dueDate === null ? null : undefined,
        startDate: input.startDate ? new Date(input.startDate) : input.startDate === null ? null : undefined,
        endDate: input.endDate ? new Date(input.endDate) : input.endDate === null ? null : undefined,
        completed: input.isCompleted !== undefined ? input.isCompleted : input.status === "DONE",
      }
      log("[updatePersonalTask Resolver]", `Constructed Prisma update payload.`, { updatePayload })

      log("[updatePersonalTask Resolver]", `Calling prisma.task.update with included assignee...`)
      const updatedTask = await prisma.task.update({
        where: { id: input.id },
        data: updatePayload,
        // ADJUSTMENT 1: Include the assignee data in the response from Prisma.
        include: {
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      })
      log("[updatePersonalTask Resolver]", `Prisma update successful. Task data returned from DB:`, { updatedTask })

      const activitiesToCreate: any[] = []

      if (input.title !== undefined && input.title !== existingTask.title) {
        activitiesToCreate.push({
          type: ActivityType.TASK_UPDATED,
          userId,
          taskId: updatedTask.id,
          data: { field: "title", oldValue: existingTask.title, newValue: input.title },
        })
      }

      if (input.description !== undefined && input.description !== existingTask.description) {
        activitiesToCreate.push({
          type: ActivityType.DESCRIPTION_UPDATED,
          userId,
          taskId: updatedTask.id,
          data: { oldValue: existingTask.description, newValue: input.description },
        })
      }

      if (input.status !== undefined && input.status !== existingTask.status) {
        activitiesToCreate.push({
          type: ActivityType.STATUS_UPDATED,
          userId,
          taskId: updatedTask.id,
          data: { oldValue: existingTask.status, newValue: input.status },
        })
      }

      if (input.priority !== undefined && input.priority !== existingTask.priority) {
        activitiesToCreate.push({
          type: ActivityType.PRIORITY_UPDATED,
          userId,
          taskId: updatedTask.id,
          data: { oldValue: existingTask.priority, newValue: input.priority },
        })
      }

      if (input.dueDate !== undefined) {
        const newDueDate = input.dueDate ? new Date(input.dueDate) : null
        if ((newDueDate?.getTime() || null) !== (existingTask.dueDate?.getTime() || null)) {
          activitiesToCreate.push({
            type: ActivityType.DUE_DATE_UPDATED,
            userId,
            taskId: updatedTask.id,
            data: {
              oldValue: existingTask.dueDate?.toISOString() || null,
              newValue: newDueDate?.toISOString() || null,
            },
          })
        }
      }

      if (input.points !== undefined && input.points !== existingTask.points) {
        activitiesToCreate.push({
          type: ActivityType.POINTS_UPDATED,
          userId,
          taskId: updatedTask.id,
          data: { oldValue: existingTask.points, newValue: input.points },
        })
      }

      if (updatedTask.completed && !existingTask.completed) {
        activitiesToCreate.push({
          type: ActivityType.TASK_COMPLETED,
          userId,
          taskId: updatedTask.id,
          data: { title: updatedTask.title },
        })
      }

      log("[updatePersonalTask Resolver]", `Found ${activitiesToCreate.length} activities to create.`)
      if (activitiesToCreate.length > 0) {
        log("[updatePersonalTask Resolver]", `Calling prisma.activity.createMany...`)
        await prisma.activity.createMany({
          data: activitiesToCreate,
        })
        log("[updatePersonalTask Resolver]", `Activity creation successful.`)
      }

      // ADJUSTMENT 2: Return the complete task object directly.
      log("[updatePersonalTask Resolver]", `Returning final task object to GraphQL client.`, { updatedTask })
      return updatedTask
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

      const createdAt = new Date()
      const startDate = input.startDate ? new Date(input.startDate) : createdAt
      let endDate
      if (input.endDate) {
        endDate = new Date(input.endDate)
      } else {
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 1)
      }

      const newTask = await prisma.task.create({
        data: {
          title: input.name,
          description: input.description,
          startDate: startDate,
          endDate: endDate,
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

      return {
        ...updatedTask,
        name: updatedTask.title,
        start: updatedTask.startDate!.toISOString(),
        end: updatedTask.endDate!.toISOString(),
        progress: updatedTask.completionPercentage ?? 0,
        type: "task",
        personalSectionId: updatedTask.personalSectionId,
        originalTaskId: updatedTask.id,
        originalType: "TASK",
        displayOrder: input.displayOrder ?? null, // <-- ECHO THE displayOrder BACK
      }
    },
  },
}

export default personalTaskResolver