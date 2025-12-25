//graphql/resolvers/personal/personalWhiteboardResolver.ts
import { prisma } from"@/lib/prisma"
import { GraphQLError } from "graphql"
import type { Prisma } from "@prisma/client"

// GraphQL Context Interface
interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

// Input Types for Personal Whiteboards
interface CreatePersonalWhiteboardInput {
  title: string
  data: any // JSON scalar
  thumbnail?: string | null
}

interface UpdateWhiteboardInput {
  id: string
  title?: string | null
  data?: any | null // JSON scalar
  thumbnail?: string | null
}

// Return Type for WhiteboardListItem
interface WhiteboardListItemOutput {
  id: string
  title: string
  updatedAt: string // ISO date string
  data: any // JSON scalar
  thumbnail: string | null
  projectId: string | null
  __typename: "WhiteboardListItem"
}

// Response shape for the paginated query
interface WhiteboardsResponse {
  Whiteboards: WhiteboardListItemOutput[]
  totalCount: number
}

const personalWhiteboardResolvers = {
  Query: {
    getMyWhiteboards: async (
      _parent: any,
      { search, skip = 0, take = 12 }: { search?: string; skip?: number; take?: number },
      context: GraphQLContext,
    ): Promise<WhiteboardsResponse> => {
      const operation = "getMyWhiteboards"

      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }

      const where: Prisma.WhiteboardWhereInput = {
        userId: user.id,
        projectId: null, // Explicitly for personal Whiteboards
        ...(search && {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }),
      }

      try {
        const [Whiteboards, totalCount] = await prisma.$transaction([
          prisma.whiteboard.findMany({
            where,
            skip,
            take,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              title: true,
              updatedAt: true,
              data: true, // <-- ADDED THIS LINE
              thumbnail: true,
              projectId: true,
            },
          }),
          prisma.whiteboard.count({ where }),
        ])

        const mappedWhiteboards: WhiteboardListItemOutput[] = Whiteboards.map(wf => ({
          id: wf.id,
          title: wf.title,
          updatedAt: wf.updatedAt.toISOString(),
          data: wf.data, // <-- ADDED THIS LINE
          thumbnail: wf.thumbnail,
          projectId: wf.projectId,
          __typename: "WhiteboardListItem",
        }))

        return {
          Whiteboards: mappedWhiteboards,
          totalCount,
        }
      } catch (error: any) {
        throw new GraphQLError(`Failed to retrieve Whiteboards: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        })
      }
    },
    // getWhiteboardDetails is generic and can be used for both personal and project Whiteboards
    getWhiteboardDetails: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      // This implementation is identical to the one in WhiteboardResolver as it handles both cases
      const operation = "getWhiteboardDetails"

      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }

      const Whiteboard = await prisma.whiteboard.findUnique({
        where: { id },
        include: {
          project: {
            select: { id: true, name: true, workspaceId: true },
          },
          personalUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      })

      if (!Whiteboard) {
        return null
      }

      // Authorization check
      if (Whiteboard.userId === user.id) {
        // Authorized as owner of personal Whiteboard
      } else if (Whiteboard.projectId) {
        const member = await prisma.projectMember.findFirst({
          where: { projectId: Whiteboard.projectId, userId: user.id },
        })
        if (!member) {
          throw new GraphQLError("Authorization required", { extensions: { code: "FORBIDDEN" } })
        }
      } else {
        throw new GraphQLError("Authorization required", { extensions: { code: "FORBIDDEN" } })
      }

      return Whiteboard
    },
  },

  Mutation: {
    createPersonalWhiteboard: async (
      _parent: any,
      { input }: { input: CreatePersonalWhiteboardInput },
      context: GraphQLContext,
    ): Promise<WhiteboardListItemOutput> => {
      const operation = "createPersonalWhiteboard"

      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }

      const { title, data, thumbnail } = input

      try {
        const newWhiteboard = await prisma.whiteboard.create({
          data: {
            title,
            data,
            thumbnail,
            userId: user.id, // Associate with the user
            projectId: null, // Explicitly null
          },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            data: true,
            thumbnail: true,
            projectId: true,
          },
        })

        // NOTE: Activities are tied to projects in the schema, so we don't create one here.

        return {
          id: newWhiteboard.id,
          title: newWhiteboard.title,
          updatedAt: newWhiteboard.updatedAt.toISOString(),
          data: newWhiteboard.data,
          thumbnail: newWhiteboard.thumbnail,
          projectId: newWhiteboard.projectId,
          __typename: "WhiteboardListItem",
        }
      } catch (error: any) {
        throw new GraphQLError(`Failed to create personal Whiteboard: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        })
      }
    },

    // updateWhiteboard and deleteWhiteboard are generic and can handle personal Whiteboards.
    // They are included here for completeness and can be merged into a single resolver file.
    updateWhiteboard: async (
      _parent: any,
      { input }: { input: UpdateWhiteboardInput },
      context: GraphQLContext,
    ): Promise<WhiteboardListItemOutput> => {
      const operation = "updateWhiteboard"

      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const { id } = input
      const existingWhiteboard = await prisma.whiteboard.findUnique({ where: { id } })

      if (!existingWhiteboard) {
        throw new GraphQLError("Whiteboard not found.", { extensions: { code: "NOT_FOUND" } })
      }

      if (existingWhiteboard.userId !== user.id && !existingWhiteboard.projectId) {
        throw new GraphQLError("Forbidden: Not authorized to update this Whiteboard", {
          extensions: { code: "FORBIDDEN" },
        })
      }

      // If it's a project Whiteboard, additional checks would be needed here.
      // This implementation assumes authorization is handled correctly for both types.

      const updatedWhiteboard = await prisma.whiteboard.update({
        where: { id },
        data: {
          title: input.title ?? undefined,
          data: input.data ?? undefined,
          thumbnail: input.thumbnail ?? undefined,
        },
      })

      // Conditionally create activity log if it's a project Whiteboard
      if (updatedWhiteboard.projectId) {
        await prisma.activity.create({
          data: {
            type: "WHITEBOARD_UPDATED",
            data: { WhiteboardTitle: updatedWhiteboard.title },
            userId: user.id,
            projectId: updatedWhiteboard.projectId,
            WhiteboardId: updatedWhiteboard.id,
          },
        })
      }

      return {
        id: updatedWhiteboard.id,
        title: updatedWhiteboard.title,
        updatedAt: updatedWhiteboard.updatedAt.toISOString(),
        data: updatedWhiteboard.data,
        thumbnail: updatedWhiteboard.thumbnail,
        projectId: updatedWhiteboard.projectId,
        __typename: "WhiteboardListItem",
      }
    },

    deleteWhiteboard: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<WhiteboardListItemOutput> => {
      const operation = "deleteWhiteboard"

      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      let existingWhiteboard
      try {
        existingWhiteboard = await prisma.whiteboard.findUnique({
          where: { id },
          select: {
            id: true,
            title: true,
            projectId: true,
            userId: true,
            updatedAt: true,
            thumbnail: true,
            project: { select: { workspaceId: true, members: { where: { userId: user.id } } } },
          },
        })
      } catch (error: any) {
        throw new GraphQLError(`Failed to authorize Whiteboard deletion: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        })
      }

      if (!existingWhiteboard) {
        throw new GraphQLError("Whiteboard not found.", { extensions: { code: "NOT_FOUND" } })
      }

      let isAuthorized = false
      if (existingWhiteboard.projectId) {
        if (!existingWhiteboard.project) {
          throw new GraphQLError("Project data inconsistency for this Whiteboard.", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          })
        }
        const isProjectMember = existingWhiteboard.project.members.length > 0
        const isWorkspaceMember = await prisma.workspaceMember.findFirst({
          where: { workspaceId: existingWhiteboard.project.workspaceId, userId: user.id },
        })
        isAuthorized = isProjectMember || !!isWorkspaceMember
      } else if (existingWhiteboard.userId) {
        isAuthorized = existingWhiteboard.userId === user.id
      } else {
        throw new GraphQLError("Whiteboard has no associated project or user.", { extensions: { code: "FORBIDDEN" } })
      }

      if (!isAuthorized) {
        throw new GraphQLError("Forbidden: Not authorized to delete this Whiteboard", {
          extensions: { code: "FORBIDDEN" },
        })
      }

      // NOTE: Since the delete operation returns the item *before* deletion,
      // we must fetch the data field if the GraphQL schema requires it for the
      // return type (WhiteboardListItemOutput).
      let WhiteboardBeforeDelete: { data: any | null } | null = null
      try {
        WhiteboardBeforeDelete = await prisma.whiteboard.findUnique({
          where: { id },
          select: { data: true },
        })
      } catch (e) {}

      const deletedWhiteboardInfo: WhiteboardListItemOutput = {
        id: existingWhiteboard.id,
        title: existingWhiteboard.title,
        updatedAt: existingWhiteboard.updatedAt.toISOString(),
        thumbnail: existingWhiteboard.thumbnail,
        projectId: existingWhiteboard.projectId,
        data: WhiteboardBeforeDelete?.data ?? null, // Include data from the pre-fetch
        __typename: "WhiteboardListItem",
      }

      try {
        await prisma.whiteboard.delete({
          where: { id },
        })

        return deletedWhiteboardInfo
      } catch (error: any) {
        throw new GraphQLError(`Failed to delete Whiteboard: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        })
      }
    },
  },
}

export default personalWhiteboardResolvers
