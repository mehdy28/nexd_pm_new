import { prisma } from "@/lib/prisma"
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
  },

  Mutation: {
    // createPrompt: async (
    //   _parent: any,
    //   {
    //     input,
    //   }: {
    //     input: {
    //       projectId?: string
    //       title: string
    //       content?: Block[]
    //       context?: string
    //       description?: string
    //       category?: string
    //       tags?: string[]
    //       isPublic?: boolean
    //       model?: string
    //       variables?: PromptVariable[]
    //       versions?: Version[]
    //     }
    //   },
    //   context: GraphQLContext
    // ): Promise<Prompt> => {
    //   if (!context.user?.id) {
    //     throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } })
    //   }

    //   const { content, ...scalarData } = input;

    //   const newPromptData: any = {
    //     ...scalarData,
    //     userId: context.user.id,
    //     variables: (input.variables || []).map(v => ({...v, id: v.id || generateUniqueId()})),
    //     versions: (input.versions || []).map(v => ({...v, id: v.id || generateUniqueId()})),
    //   };

    //   if (content && content.length > 0) {
    //     newPromptData.content = {
    //       create: content.map((block, index) => ({
    //         type: block.type,
    //         value: block.value,
    //         varId: block.varId,
    //         placeholder: block.placeholder,
    //         name: block.name,
    //         order: index,
    //       }))
    //     };
    //   }

    //   const newPrompt = await prisma.prompt.create({
    //     data: newPromptData,
    //     include: {
    //       content: { orderBy: { order: 'asc' } },
    //     },
    //   })

    //   return newPrompt as unknown as Prompt
    // },

    // updatePrompt: async (
    //   _parent: any,
    //   {
    //     input,
    //   }: {
    //     input: {
    //       id: string
    //       title?: string
    //       content?: Block[]
    //       context?: string
    //       description?: string
    //       category?: string
    //       tags?: string[]
    //       isPublic?: boolean
    //       model?: string
    //       variables?: PromptVariable[]
    //     }
    //   }
    // ): Promise<Prompt> => {
    //   const { id, content, ...scalarUpdates } = input;

    //   const updatedPrompt = await prisma.$transaction(async (tx) => {
    //     if (Object.keys(scalarUpdates).length > 0) {
    //       const updateData: any = { ...scalarUpdates, updatedAt: new Date() };
    //       if (scalarUpdates.variables) {
    //          updateData.variables = scalarUpdates.variables.map(v => ({ ...v, id: v.id || generateUniqueId() }));
    //       }
    //       await tx.prompt.update({
    //         where: { id },
    //         data: updateData,
    //       });
    //     }

    //     if (content) {
    //       await tx.contentBlock.deleteMany({ where: { promptId: id } });
    //       if (content.length > 0) {
    //         await tx.contentBlock.createMany({
    //           data: content.map((block, index) => ({
    //             type: block.type,
    //             value: block.value,
    //             varId: block.varId,
    //             placeholder: block.placeholder,
    //             name: block.name,
    //             promptId: id,
    //             order: index,
    //           }))
    //         });
    //       }
    //     }

    //     return tx.prompt.findUnique({
    //       where: { id },
    //       include: {
    //         content: { orderBy: { order: 'asc' } },
    //       },
    //     });
    //   });

    //   if (!updatedPrompt) {
    //     throw new Error("Prompt not found after update.");
    //   }
      
    //   return updatedPrompt as unknown as Prompt;
    // },

    // deletePrompt: async (_parent: any, { id }: { id: string }): Promise<Prompt> => {
    //   const deletedPrompt = await prisma.prompt.delete({
    //     where: { id },
    //   })
    //   return deletedPrompt as unknown as Prompt
    // },

    snapshotPrompt: async (
      _parent: any,
      { input }: { input: { promptId: string; notes?: string } }
    ): Promise<Prompt> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id: input.promptId },
        include: {
            content: { orderBy: { order: 'asc' } }
        }
      })

      if (!prompt) {
        throw new GraphQLError("Prompt not found", { extensions: { code: "NOT_FOUND" } })
      }

      const currentContent = prompt.content.map(({ promptId, ...block }) => block);

      const newVersion: Version = {
        id: generateUniqueId(),
        content: currentContent as Block[],
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
        include: { content: { orderBy: { order: 'asc' } } }
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
      
      const { content, context, variables } = versionToRestore;

      const restoredPrompt = await prisma.$transaction(async (tx) => {
        await tx.prompt.update({
            where: { id: input.promptId },
            data: {
              context: context,
              variables: variables.map(v => ({ ...v, id: v.id || generateUniqueId() })),
              updatedAt: new Date(),
            },
        });

        await tx.contentBlock.deleteMany({ where: { promptId: input.promptId } });
        if (content && content.length > 0) {
            await tx.contentBlock.createMany({
                data: content.map((block, index) => ({
                    type: block.type,
                    value: block.value,
                    varId: block.varId,
                    placeholder: block.placeholder,
                    name: block.name,
                    promptId: input.promptId,
                    order: index,
                }))
            });
        }
        
        return tx.prompt.findUnique({
            where: { id: input.promptId },
            include: { content: { orderBy: { order: 'asc' } } }
        });
      });

      if (!restoredPrompt) {
          throw new Error("Failed to restore prompt.");
      }

      return restoredPrompt as unknown as Prompt;
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
        include: { content: { orderBy: { order: 'asc' } } }
      })

      return updatedPrompt as unknown as Prompt
    },
  },

  User: {
    fullName: (parent: any) => `${parent.firstName || ""} ${parent.lastName || ""}`.trim(),
  },
}

export default personalPromptResolvers