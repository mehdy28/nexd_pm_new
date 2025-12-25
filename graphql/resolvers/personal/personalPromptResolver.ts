import { prisma } from"@/lib/prisma"
import { GraphQLError } from "graphql"
import type {
  Prompt,
  PromptVariable,
  Version,
  PromptVariableSource,
  Block,
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
            modelProfileId: true,
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
  },

  Mutation: {
    updateVersionDescription: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string; description: string } }
    ): Promise<Prompt> => {
      try {
        // We use a nested update here. 
        // This attempts to update the Prompt, and specifically finds the Version 
        // within that prompt's relation to update it.
        const updatedPrompt = await prisma.prompt.update({
          where: { 
            id: input.promptId 
          },
          data: {
            versions: {
              update: {
                where: { 
                  id: input.versionId 
                },
                data: { 
                  description: input.description 
                }
              }
            },
            updatedAt: new Date(),
          },
          // CRITICAL: We must include 'versions' in the response because 
          // the GraphQL return type expects the Prompt object to contain them.
          include: {
            versions: {
              orderBy: { createdAt: 'desc' }
            }
          }
        })

        return updatedPrompt as unknown as Prompt

      } catch (error: any) {
        // Prisma throws code P2025 if the record to update (Prompt or Version) is not found
        if (error.code === 'P2025') {
          throw new GraphQLError("Version or Prompt not found", { extensions: { code: "NOT_FOUND" } })
        }
        
        console.error("Error updating version description:", error)
        throw new GraphQLError("Failed to update description", { extensions: { code: "INTERNAL_SERVER_ERROR" } })
      }
    },
  },

  User: {
    fullName: (parent: any) => `${parent.firstName || ""} ${parent.lastName || ""}`.trim(),
  },
}

export default personalPromptResolvers