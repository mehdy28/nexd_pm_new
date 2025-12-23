import { prisma } from "@/lib/prisma"
import { GraphQLError } from "graphql"





interface ReorderPersonalSectionInput {
  id: string;
  order: number;
}


interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

interface CreatePersonalSectionArgs {
  name: string
  order?: number
}

interface UpdatePersonalSectionArgs {
  id: string
  name?: string
  order?: number
}

interface DeleteSectionOptions {
  deleteTasks: boolean
  reassignToSectionId?: string | null
}

interface DeletePersonalSectionArgs {
  id: string
  options: DeleteSectionOptions
}

export const personalSectionResolver = {
  Mutation: {
    createPersonalSection: async (
      _parent: unknown,
      args: CreatePersonalSectionArgs,
      context: GraphQLContext
    ) => {

      if (!context.user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const userId = context.user.id
      const { name, order } = args

      try {
        let sectionOrder = order
        if (sectionOrder === undefined || sectionOrder === null) {
          const lastSection = await prisma.personalSection.findFirst({
            where: { userId: userId },
            orderBy: { order: "desc" },
          })
          sectionOrder = (lastSection?.order ?? -1) + 1
        }

        const newSection = await prisma.personalSection.create({
          data: {
            name,
            order: sectionOrder,
            user: { connect: { id: userId } },
          },
        })

        // Return with empty tasks array for type consistency
        return { ...newSection, tasks: [] }
      } catch (error: any) {

        throw new GraphQLError("Could not create personal section.")
      }
    },

    updatePersonalSection: async (
      _parent: unknown,
      args: UpdatePersonalSectionArgs,
      context: GraphQLContext
    ) => {

      if (!context.user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const userId = context.user.id
      const { id, name, order } = args

      try {
        const sectionToUpdate = await prisma.personalSection.findFirst({
          where: { id: id, userId: userId },
        })

        if (!sectionToUpdate) {
          throw new GraphQLError("Section not found or you do not have permission to update it.", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        const updatedSection = await prisma.personalSection.update({
          where: { id: id },
          data: {
            name: name ?? undefined,
            order: order ?? undefined,
          },
        })

        return updatedSection
      } catch (error) {
        throw new GraphQLError("Could not update personal section.")
      }
    },

    deletePersonalSection: async (
      _parent: unknown,
      args: DeletePersonalSectionArgs,
      context: GraphQLContext
    ) => {

      if (!context.user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const userId = context.user.id
      const { id: sectionIdToDelete, options } = args
      const { deleteTasks, reassignToSectionId } = options

      try {
        const section = await prisma.personalSection.findFirst({
          where: { id: sectionIdToDelete, userId: userId },
          include: {
            tasks: { select: { id: true } },
          },
        })

        if (!section) {

          throw new GraphQLError("Section not found or you do not have permission to delete it.", {
            extensions: { code: "FORBIDDEN" },
          })
        }

        const taskIds = section.tasks.map(task => task.id)
        const hasTasks = taskIds.length > 0

        await prisma.$transaction(async tx => {
          if (hasTasks) {
            if (deleteTasks) {
              await tx.task.deleteMany({
                where: { id: { in: taskIds } },
              })
            } else if (reassignToSectionId) {
              const targetSection = await tx.personalSection.findFirst({
                where: { id: reassignToSectionId, userId: userId },
              })

              if (!targetSection) {
                throw new GraphQLError("Target section for reassigning tasks not found or not owned by user.", {
                  extensions: { code: "BAD_USER_INPUT" },
                })
              }


              await tx.task.updateMany({
                where: { id: { in: taskIds } },
                data: { personalSectionId: reassignToSectionId },
              })
            } else {
              await tx.task.updateMany({
                where: { id: { in: taskIds } },
                data: { personalSectionId: null },
              })
            }
          }

          await tx.personalSection.delete({
            where: { id: sectionIdToDelete },
          })
        })

        const returnedSection = { id: sectionIdToDelete, name: section.name, order: section.order }
        return returnedSection
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error
        }
        throw new GraphQLError("Could not delete personal section.")
      }
    },


    reorderPersonalSections: async (
      _: any,
      { sections }: { sections: ReorderPersonalSectionInput[] },
      context: any
    ) => {

      const userId = context.user.id


      try {
        // Use a transaction to update all sections at once.
        // This ensures that if one update fails, all are rolled back.
        await prisma.$transaction(
          sections.map((section) =>
            prisma.personalSection.updateMany({
              where: {
                id: section.id,
                userId: userId, // Security: ensure user owns the section
              },
              data: {
                order: section.order,
              },
            })
          )
        );

        // Fetch the updated sections to return them in the new order
        const updatedSections = await prisma.personalSection.findMany({
          where: {
            userId: userId,
          },
          orderBy: {
            order: 'asc',
          },
        });

        return updatedSections;
      } catch (error) {
        console.error("Failed to reorder personal sections:", error);
        throw new Error("An error occurred while reordering sections.");
      }
    },
  },
}

export default personalSectionResolver












