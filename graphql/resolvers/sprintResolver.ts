// graphql/resolvers/sprintResolver.ts
import { prisma } from "../../lib/prisma.js" // Using your specified import path
import { SprintStatus, SprintUi } from "../../types/sprint.js" // Ensure this is present in your file
import { GraphQLError } from "graphql"

// No longer need GraphQLContext as prisma is directly imported
// interface GraphQLContext {
//   prisma: PrismaClient;
//   // userId: string;
// }

export const sprintResolvers = {
  Mutation: {
    createSprint: async (
      _parent: any,
      {
        input,
      }: { input: { projectId: string; name: string; description?: string; startDate: string; endDate: string; status?: SprintStatus } },
      // context: GraphQLContext // Remove context argument
    ): Promise<any> => {
      // In a real application, you'd add authentication and authorization checks here.
      // e.g., Check if the user is a member/admin of the project's workspace.
      // const userId = context.userId;
      // if (!userId) {
      //   throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
      // }

      const { projectId, name, description, startDate, endDate, status } = input

      const project = await prisma.project.findUnique({
        // Use imported prisma
        where: { id: projectId },
      })

      if (!project) {
        throw new GraphQLError(`Project with ID ${projectId} not found.`, {
          extensions: { code: "NOT_FOUND" },
        })
      }

      const newSprint = await prisma.sprint.create({
        // Use imported prisma
        data: {
          projectId,
          name,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: status || SprintStatus.PLANNING, // Default to PLANNING if not provided
          isCompleted: status === SprintStatus.COMPLETED, // Derive isCompleted from status
        },
      })

      // You might want to return SprintDetails, which includes tasks and milestones.
      // For simplicity here, we return the base Sprint, but you might need to adjust.
      // The GraphQL schema expects SprintDetails!, so we need to fetch related data.
      const sprintDetails = await prisma.sprint.findUnique({
        // Use imported prisma
        where: { id: newSprint.id },
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueDate: true,
              points: true,
              completionPercentage: true,
              completed: true,
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          milestones: true,
        },
      })

      if (!sprintDetails) {
        throw new GraphQLError("Failed to retrieve sprint details after creation.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        })
      }

      // Map Prisma status to GraphQL enum
      const mappedTasks = sprintDetails.tasks.map(task => ({
        ...task,
        status: task.status, // Prisma TaskStatus enum maps directly to GraphQL TaskStatus
        priority: task.priority, // Prisma Priority enum maps directly to GraphQL Priority
        dueDate: task.dueDate?.toISOString() || null,
        assignee: task.assignee
          ? {
              id: task.assignee.id,
              firstName: task.assignee.firstName,
              lastName: task.assignee.lastName,
              avatar: task.assignee.avatar,
            }
          : null,
      }))

      return {
        ...sprintDetails,
        startDate: sprintDetails.startDate.toISOString(),
        endDate: sprintDetails.endDate.toISOString(),
        status: sprintDetails.status as SprintStatus, // Directly use Prisma's SprintStatus
        tasks: mappedTasks,
      }
    },

    updateSprint: async (
      _parent: any,
      {
        input,
      }: {
        input: {
          id: string
          name?: string
          description?: string
          startDate?: string
          endDate?: string
          isCompleted?: boolean
          status?: SprintStatus
        }
      },
      // context: GraphQLContext // Remove context argument
    ): Promise<any> => {
      // Authentication and authorization checks
      // const userId = context.userId;
      // if (!userId) {
      //   throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
      // }

      const { id, name, description, startDate, endDate, isCompleted, status } = input

      const existingSprint = await prisma.sprint.findUnique({
        // Use imported prisma
        where: { id },
      })

      if (!existingSprint) {
        throw new GraphQLError(`Sprint with ID ${id} not found.`, {
          extensions: { code: "NOT_FOUND" },
        })
      }

      // Prepare update data
      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (startDate !== undefined) updateData.startDate = new Date(startDate)
      if (endDate !== undefined) updateData.endDate = new Date(endDate)
      if (isCompleted !== undefined) updateData.isCompleted = isCompleted
      if (status !== undefined) {
        updateData.status = status
        // Optionally update isCompleted based on status if they are tied
        if (status === SprintStatus.COMPLETED) {
          updateData.isCompleted = true
        } else if (status === SprintStatus.ACTIVE || status === SprintStatus.PLANNING) {
          updateData.isCompleted = false
        }
      }

      const updatedSprint = await prisma.sprint.update({
        // Use imported prisma
        where: { id },
        data: updateData,
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueDate: true,
              points: true,
              completionPercentage: true,
              completed: true,
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          milestones: true,
        },
      })

      // Map Prisma status to GraphQL enum
      const mappedTasks = updatedSprint.tasks.map(task => ({
        ...task,
        status: task.status, // Prisma TaskStatus enum maps directly to GraphQL TaskStatus
        priority: task.priority, // Prisma Priority enum maps directly to GraphQL Priority
        dueDate: task.dueDate?.toISOString() || null,
        assignee: task.assignee
          ? {
              id: task.assignee.id,
              firstName: task.assignee.firstName,
              lastName: task.assignee.lastName,
              avatar: task.assignee.avatar,
            }
          : null,
      }))

      return {
        ...updatedSprint,
        startDate: updatedSprint.startDate.toISOString(),
        endDate: updatedSprint.endDate.toISOString(),
        status: updatedSprint.status as SprintStatus,
        tasks: mappedTasks,
      }
    },

    deleteSprint: async (
      _parent: any,
      { id }: { id: string },
      // context: GraphQLContext // Remove context argument
    ): Promise<any> => {
      // Authentication and authorization checks
      // const userId = context.userId;
      // if (!userId) {
      //   throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
      // }

      const existingSprint = await prisma.sprint.findUnique({
        // Use imported prisma
        where: { id },
      })

      if (!existingSprint) {
        throw new GraphQLError(`Sprint with ID ${id} not found.`, {
          extensions: { code: "NOT_FOUND" },
        })
      }

      // Before deleting the sprint, decide what to do with its associated tasks.
      // Based on the Prisma schema, `onDelete: SetNull` for `Task.sprintId` means tasks will remain but lose their sprint association.
      // If you wanted to delete tasks as well, you would do it explicitly here:
      // await prisma.task.deleteMany({ where: { sprintId: id } }); // Use imported prisma

      const deletedSprint = await prisma.sprint.delete({
        // Use imported prisma
        where: { id },
        include: {
          tasks: {
            // Include tasks to return the full SprintDetails as per GraphQL schema
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueDate: true,
              points: true,
              completionPercentage: true,
              completed: true,
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          milestones: true,
        },
      })

      const mappedTasks = deletedSprint.tasks.map(task => ({
        ...task,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString() || null,
        assignee: task.assignee
          ? {
              id: task.assignee.id,
              firstName: task.assignee.firstName,
              lastName: task.assignee.lastName,
              avatar: task.assignee.avatar,
            }
          : null,
      }))

      return {
        ...deletedSprint,
        startDate: deletedSprint.startDate.toISOString(),
        endDate: deletedSprint.endDate.toISOString(),
        status: deletedSprint.status as SprintStatus,
        tasks: mappedTasks,
      }
    },
  },
}