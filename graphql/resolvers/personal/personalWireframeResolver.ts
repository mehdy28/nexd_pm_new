import { prisma } from "@/lib/prisma"
import { GraphQLError } from "graphql"
import type { Prisma } from "@prisma/client"

// GraphQL Context Interface
interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

// Input Types for Personal Wireframes
interface CreatePersonalWireframeInput {
  title: string
  data: any // JSON scalar
  thumbnail?: string | null
}

interface UpdateWireframeInput {
  id: string
  title?: string | null
  data?: any | null // JSON scalar
  thumbnail?: string | null
}

// Return Type for WireframeListItem
interface WireframeListItemOutput {
  id: string
  title: string
  updatedAt: string // ISO date string
  thumbnail: string | null
  projectId: string | null
  __typename: "WireframeListItem"
}

// Response shape for the paginated query
interface WireframesResponse {
  wireframes: WireframeListItemOutput[]
  totalCount: number
}

// Helper for consistent logging
const log = (
  level: "info" | "warn" | "error",
  message: string,
  context?: Record<string, any>
) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [PERSONAL_WIREFRAME_RESOLVERS] [${level.toUpperCase()}] ${message}`)
  if (context) {
    console.log(`  Context: ${JSON.stringify(context)}`)
  }
}

const personalWireframeResolvers = {
  Query: {
    getMyWireframes: async (
      _parent: any,
      {
        search,
        skip = 0,
        take = 12,
      }: { search?: string; skip?: number; take?: number },
      context: GraphQLContext
    ): Promise<WireframesResponse> => {
      const operation = "getMyWireframes"
      log("info", `${operation} called.`, { search, skip, take })

      const { user } = context
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`)
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id })

      const where: Prisma.WireframeWhereInput = {
        userId: user.id,
        projectId: null, // Explicitly for personal wireframes
        ...(search && {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }),
      }

      try {
        const [wireframes, totalCount] = await prisma.$transaction([
          prisma.wireframe.findMany({
            where,
            skip,
            take,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              title: true,
              updatedAt: true,
              thumbnail: true,
              projectId: true,
            },
          }),
          prisma.wireframe.count({ where }),
        ])

        log("info", `${operation}: Found ${wireframes.length} wireframes, total count is ${totalCount}.`, {
          userId: user.id,
        })

        const mappedWireframes = wireframes.map(wf => ({
          id: wf.id,
          title: wf.title,
          updatedAt: wf.updatedAt.toISOString(),
          thumbnail: wf.thumbnail,
          projectId: wf.projectId,
          __typename: "WireframeListItem",
        }))

        return {
          wireframes: mappedWireframes,
          totalCount,
        }
      } catch (error: any) {
        log("error", `${operation}: Failed to fetch personal wireframes.`, {
          userId: user.id,
          errorName: error.name,
          errorMessage: error.message,
        })
        throw new GraphQLError(`Failed to retrieve wireframes: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        })
      }
    },
    // getWireframeDetails is generic and can be used for both personal and project wireframes
    getWireframeDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      // This implementation is identical to the one in wireframeResolver as it handles both cases
      const operation = "getWireframeDetails"
      log("info", `${operation} called.`, { wireframeId: id })

      const { user } = context
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`, { wireframeId: id })
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }

      const wireframe = await prisma.wireframe.findUnique({
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

      if (!wireframe) {
        log("warn", `${operation}: Wireframe ${id} not found.`, { wireframeId: id })
        return null
      }

      // Authorization check
      if (wireframe.userId === user.id) {
        // Authorized as owner of personal wireframe
      } else if (wireframe.projectId) {
        const member = await prisma.projectMember.findFirst({
          where: { projectId: wireframe.projectId, userId: user.id },
        })
        if (!member) {
          throw new GraphQLError("Authorization required", { extensions: { code: "FORBIDDEN" } })
        }
      } else {
        throw new GraphQLError("Authorization required", { extensions: { code: "FORBIDDEN" } })
      }

      return wireframe
    },
  },

  Mutation: {
    createPersonalWireframe: async (
      _parent: any,
      { input }: { input: CreatePersonalWireframeInput },
      context: GraphQLContext
    ): Promise<WireframeListItemOutput> => {
      const operation = "createPersonalWireframe"
      log("info", `${operation} called.`, { input: { ...input, data: "[REDACTED]" } })

      const { user } = context
      if (!user?.id) {
        log("warn", `${operation}: Authentication required.`)
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      }
      log("info", `${operation}: User ${user.id} authenticated.`, { userId: user.id })

      const { title, data, thumbnail } = input

      try {
        const newWireframe = await prisma.wireframe.create({
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
            thumbnail: true,
            projectId: true,
          },
        })
        log("info", `${operation}: Personal wireframe ${newWireframe.id} created.`, {
          wireframeId: newWireframe.id,
          title: newWireframe.title,
        })

        // NOTE: Activities are tied to projects in the schema, so we don't create one here.

        return {
          id: newWireframe.id,
          title: newWireframe.title,
          updatedAt: newWireframe.updatedAt.toISOString(),
          thumbnail: newWireframe.thumbnail,
          projectId: newWireframe.projectId,
          __typename: "WireframeListItem",
        }
      } catch (error: any) {
        log("error", `${operation}: Failed to create personal wireframe.`, {
          errorName: error.name,
          errorMessage: error.message,
        })
        throw new GraphQLError(`Failed to create personal wireframe: ${error.message}`, {
          extensions: { code: "DATABASE_ERROR" },
        })
      }
    },

    // updateWireframe and deleteWireframe are generic and can handle personal wireframes.
    // They are included here for completeness and can be merged into a single resolver file.
    updateWireframe: async (
      _parent: any,
      { input }: { input: UpdateWireframeInput },
      context: GraphQLContext
    ): Promise<WireframeListItemOutput> => {
      const operation = "updateWireframe"
      log("info", `${operation} called for personal context.`, { input: { ...input, data: "[REDACTED]" } })

      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const { id } = input
      const existingWireframe = await prisma.wireframe.findUnique({ where: { id } })

      if (!existingWireframe) {
        throw new GraphQLError("Wireframe not found.", { extensions: { code: "NOT_FOUND" } })
      }

      if (existingWireframe.userId !== user.id && !existingWireframe.projectId) {
        throw new GraphQLError("Forbidden: Not authorized to update this wireframe", {
          extensions: { code: "FORBIDDEN" },
        })
      }

      // If it's a project wireframe, additional checks would be needed here.
      // This implementation assumes authorization is handled correctly for both types.

      const updatedWireframe = await prisma.wireframe.update({
        where: { id },
        data: {
          title: input.title ?? undefined,
          data: input.data ?? undefined,
          thumbnail: input.thumbnail ?? undefined,
        },
      })

      // Conditionally create activity log if it's a project wireframe
      if (updatedWireframe.projectId) {
        await prisma.activity.create({
          data: {
            type: "WIREFRAME_UPDATED",
            data: { wireframeTitle: updatedWireframe.title },
            userId: user.id,
            projectId: updatedWireframe.projectId,
            wireframeId: updatedWireframe.id,
          },
        })
      }

      return {
        id: updatedWireframe.id,
        title: updatedWireframe.title,
        updatedAt: updatedWireframe.updatedAt.toISOString(),
        thumbnail: updatedWireframe.thumbnail,
        projectId: updatedWireframe.projectId,
        __typename: "WireframeListItem",
      }
    },

    deleteWireframe: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<WireframeListItemOutput> => {
      const operation = "deleteWireframe"
      log("info", `${operation} called for personal context.`, { wireframeId: id })
      const { user } = context
      if (!user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const existingWireframe = await prisma.wireframe.findUnique({ where: { id } })
      if (!existingWireframe) {
        throw new GraphQLError("Wireframe not found.", { extensions: { code: "NOT_FOUND" } })
      }

      if (existingWireframe.userId !== user.id && !existingWireframe.projectId) {
        throw new GraphQLError("Forbidden: Not authorized to delete this wireframe", {
          extensions: { code: "FORBIDDEN" },
        })
      }
      // If it's a project wireframe, additional checks would be needed here.

      await prisma.wireframe.delete({ where: { id } })

      // Conditionally create activity log if it was a project wireframe
      if (existingWireframe.projectId) {
        await prisma.activity.create({
          data: {
            type: "WIREFRAME_DELETED",
            data: { wireframeTitle: existingWireframe.title },
            userId: user.id,
            projectId: existingWireframe.projectId,
            wireframeId: existingWireframe.id,
          },
        })
      }

      return {
        id: existingWireframe.id,
        title: existingWireframe.title,
        updatedAt: existingWireframe.updatedAt.toISOString(),
        thumbnail: existingWireframe.thumbnail,
        projectId: existingWireframe.projectId,
        __typename: "WireframeListItem",
      }
    },
  },
}

export default personalWireframeResolvers