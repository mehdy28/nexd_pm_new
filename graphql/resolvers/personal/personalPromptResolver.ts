import { prisma } from "@/lib/prisma"
import { GraphQLError } from "graphql"
import type {
  Prompt,
  PromptVariable,
  Version,
  PromptVariableSource,
} from "@/components/prompt-lab/store"

interface GraphQLContext {
  prisma: typeof prisma
  user?: { id: string; email: string; role: string }
}

function generateUniqueId(): string {
  return `svr_${Math.random().toString(36).slice(2)}${Date.now()}`
}

const personalPromptResolvers = {
  Query: {
    getMyPrompts: async (
      _parent: any,
      { skip = 0, take = 10, q }: { skip?: number; take?: number; q?: string },
      context: GraphQLContext
    ): Promise<{ prompts: Prompt[]; totalCount: number }> => {
      if (!context.user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const whereClause: any = {
        userId: context.user.id,
        projectId: null,
      }

      if (q && q.trim() !== "") {
        whereClause.title = {
          contains: q,
          mode: "insensitive",
        }
      }

      const [prompts, totalCount] = await prisma.$transaction([
        prisma.prompt.findMany({
          where: whereClause,
          orderBy: { updatedAt: "desc" },
          skip,
          take,
          select: {
            id: true,
            title: true,
            description: true,
            tags: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
            model: true,
            projectId: true,
          },
        }),
        prisma.prompt.count({ where: whereClause }),
      ])

      const mappedPrompts = prompts.map(p => ({
        ...p,
        content: [],
        context: "",
        variables: [],
        versions: [],
      })) as unknown as Prompt[]

      return { prompts: mappedPrompts, totalCount }
    },

    getPromptDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<Prompt> => {
      // This resolver is generic and can fetch any prompt by ID.
      // Authorization should be handled at a higher level or within the component logic.
      const prompt = await prisma.prompt.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          project: {
            select: { id: true, name: true, workspaceId: true },
          },
        },
      })
      if (!prompt) {
        throw new GraphQLError("Prompt not found", { extensions: { code: "NOT_FOUND" } })
      }

      // Ensure JSON fields are not null
      prompt.content = prompt.content || []
      prompt.context = prompt.context || ""
      prompt.variables = prompt.variables || []
      prompt.versions = (prompt.versions as Version[] || []).map(v => ({
        id: v.id,
        createdAt: v.createdAt,
        notes: v.notes,
        description: v.description || "",
        content: v.content || [],
        context: v.context || "",
        variables: v.variables || [],
      }))

      return prompt as unknown as Prompt
    },

    getPromptVersionContent: async (
      _parent: any,
      { promptId, versionId }: { promptId: string; versionId: string }
    ): Promise<Version> => {
      // This resolver is generic.
      const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        select: { versions: true },
      })

      if (!prompt) {
        throw new GraphQLError("Prompt not found", { extensions: { code: "NOT_FOUND" } })
      }

      const versions = (prompt.versions as Version[]) || []
      const version = versions.find(v => v.id === versionId)

      if (!version) {
        throw new GraphQLError("Version not found within this prompt", { extensions: { code: "NOT_FOUND" } })
      }
      return {
        id: version.id,
        content: version.content || [],
        context: version.context || "",
        variables: version.variables || [],
        createdAt: version.createdAt,
        notes: version.notes,
        description: version.description || "",
      } as Version
    },

    // Note: `resolvePromptVariable` is a single resolver in the schema. This represents
    // how it would behave when called in a purely personal context (without a projectId).
    // The actual implementation should handle both project and personal contexts.
    resolvePromptVariable: async (
      _parent: any,
      {
        workspaceId,
        variableSource,
      }: { workspaceId?: string; variableSource: any; promptVariableId?: string },
      context: GraphQLContext
    ): Promise<string> => {
      const source = variableSource as PromptVariableSource
      const currentUserId = context.user?.id

      if (!currentUserId) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      if (source.entityType === "DATE_FUNCTION" && source.field === "today") {
        return new Date().toISOString().split("T")[0]
      }

      if (source.entityType === "USER") {
        const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } })
        if (!currentUser) return "N/A (Current user data not found)"
        return (
          source.field?.split(".").reduce((o, i) => (o ? o[i] : undefined), currentUser) || "N/A"
        )
      }

      // Handle personal documents
      if (source.entityType === "DOCUMENT") {
        const record = await prisma.document.findFirst({
          where: { userId: currentUserId },
          orderBy: { updatedAt: "desc" },
        })
        if (!record) return "N/A (Personal document not found)"
        if (source.field === "content" && typeof record.content === "object") {
          return JSON.stringify(record.content)
        }
        return (
          source.field?.split(".").reduce((o, i) => (o ? o[i] : undefined), record) || "N/A"
        )
      }

      // Project-specific entities are not available in a personal context
      if (
        ["PROJECT", "SPRINT", "MEMBER", "TASK", "WORKSPACE"].includes(source.entityType)
      ) {
        return "N/A (Project context required for this data)"
      }

      return "N/A (Unsupported entity type in personal context)"
    },
  },

  Mutation: {
    // Note: All prompt mutations are generic. They can operate on personal prompts
    // by their ID, or create personal prompts by omitting `projectId` in the input.
    createPrompt: async (
      _parent: any,
      {
        input,
      }: {
        input: {
          projectId?: string
          title: string
          content?: any
          context?: string
          description?: string
          category?: string
          tags?: string[]
          isPublic?: boolean
          model?: string
          variables?: PromptVariable[]
          versions?: Version[]
        }
      },
      context: GraphQLContext
    ): Promise<Prompt> => {
      if (!context.user?.id) {
        throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
      }

      const newPromptData = {
        title: input.title,
        content: input.content || [],
        context: input.context || "",
        description: input.description,
        category: input.category,
        tags: input.tags || [],
        isPublic: input.isPublic || false,
        model: input.model || "gpt-4o",
        userId: context.user.id,
        projectId: input.projectId, // Will be null for personal prompts
        variables: (input.variables || []).map(v => ({ ...v, id: v.id || generateUniqueId() })),
        versions: (input.versions || []).map(v => ({ ...v, id: v.id || generateUniqueId() })),
      }

      const newPrompt = await prisma.prompt.create({
        data: newPromptData as any,
      })

      return newPrompt as unknown as Prompt
    },

    updatePrompt: async (
      _parent: any,
      {
        input,
      }: {
        input: {
          id: string
          title?: string
          content?: any
          context?: string
          description?: string
          category?: string
          tags?: string[]
          isPublic?: boolean
          model?: string
          variables?: PromptVariable[]
        }
      }
    ): Promise<Prompt> => {
      const updateData: any = { updatedAt: new Date() }
      if (input.title !== undefined) updateData.title = input.title
      if (input.content !== undefined) updateData.content = input.content
      if (input.context !== undefined) updateData.context = input.context
      if (input.description !== undefined) updateData.description = input.description
      if (input.category !== undefined) updateData.category = input.category
      if (input.tags !== undefined) updateData.tags = input.tags
      if (input.isPublic !== undefined) updateData.isPublic = input.isPublic
      if (input.model !== undefined) updateData.model = input.model
      if (input.variables !== undefined) {
        updateData.variables = input.variables.map(v => ({ ...v, id: v.id || generateUniqueId() }))
      }

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.id },
        data: updateData,
      })

      return updatedPrompt as unknown as Prompt
    },

    deletePrompt: async (_parent: any, { id }: { id: string }): Promise<Prompt> => {
      const deletedPrompt = await prisma.prompt.delete({
        where: { id },
      })
      return deletedPrompt as unknown as Prompt
    },

    snapshotPrompt: async (
      _parent: any,
      { input }: { input: { promptId: string; notes?: string } }
    ): Promise<Prompt> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id: input.promptId },
      })

      if (!prompt) {
        throw new GraphQLError("Prompt not found", { extensions: { code: "NOT_FOUND" } })
      }

      const newVersion: Version = {
        id: generateUniqueId(),
        content: (prompt.content as any) || [],
        context: (prompt.context as string) || "",
        variables: ((prompt.variables as PromptVariable[]) || []).map(v => ({
          ...v,
          id: v.id || generateUniqueId(),
        })),
        createdAt: new Date().toISOString(),
        notes: input.notes || `Version saved on ${new Date().toLocaleString()}`,
        description: "",
      }

      const updatedVersions = [newVersion, ...((prompt.versions as Version[]) || [])]

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.promptId },
        data: {
          versions: updatedVersions,
          updatedAt: new Date(),
        },
      })

      return updatedPrompt as unknown as Prompt
    },

    restorePromptVersion: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string } }
    ): Promise<Prompt> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id: input.promptId },
      })

      if (!prompt) {
        throw new GraphQLError("Prompt not found", { extensions: { code: "NOT_FOUND" } })
      }

      const versions = (prompt.versions as Version[]) || []
      const versionToRestore = versions.find(v => v.id === input.versionId)

      if (!versionToRestore) {
        throw new GraphQLError("Version not found", { extensions: { code: "NOT_FOUND" } })
      }

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.promptId },
        data: {
          content: versionToRestore.content,
          context: versionToRestore.context,
          variables: versionToRestore.variables.map(v => ({
            ...v,
            id: v.id || generateUniqueId(),
          })),
          updatedAt: new Date(),
        },
      })

      return updatedPrompt as unknown as Prompt
    },

    updateVersionDescription: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string; description: string } }
    ): Promise<Prompt> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id: input.promptId },
      })

      if (!prompt) {
        throw new GraphQLError("Prompt not found", { extensions: { code: "NOT_FOUND" } })
      }

      const versions = (prompt.versions as Version[]) || []
      const versionIndex = versions.findIndex(v => v.id === input.versionId)

      if (versionIndex === -1) {
        throw new GraphQLError("Version not found", { extensions: { code: "NOT_FOUND" } })
      }

      const updatedVersions = [...versions]
      updatedVersions[versionIndex] = {
        ...updatedVersions[versionIndex],
        description: input.description,
      }

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.promptId },
        data: {
          versions: updatedVersions,
          updatedAt: new Date(),
        },
      })

      return updatedPrompt as unknown as Prompt
    },
  },

  User: {
    fullName: (parent: any) => `${parent.firstName || ""} ${parent.lastName || ""}`.trim(),
  },
}

export default personalPromptResolvers