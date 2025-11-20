import { GraphQLResolveInfo } from 'graphql';
import { prisma } from "@/lib/prisma";
import { type Prompt, type PromptVariable, type Version, PromptVariableType, PromptVariableSource, Block } from '@/components/prompt-lab/store';

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

function generateUniqueId(): string {
  return `svr_${Math.random().toString(36).slice(2)}${Date.now()}`;
}

function buildPrismaWhereClause(
  sourceFilter: PromptVariableSource['filter'] | undefined,
  projectId: string,
  currentUserId: string | undefined,
  entityType: PromptVariableSource['entityType']
): any {
  const where: any = {};

  if (entityType !== 'USER' && entityType !== 'DATE_FUNCTION') {
    where.projectId = projectId;
  } else if (entityType === 'USER') {
    where.id = currentUserId;
  }

  if (sourceFilter && sourceFilter.field && sourceFilter.operator) {
    let value = sourceFilter.value;

    if (sourceFilter.specialValue === 'CURRENT_USER_ID') {
      value = currentUserId;
    } else if (sourceFilter.specialValue === 'CURRENT_PROJECT_ID') {
      value = projectId;
    } else if (sourceFilter.specialValue === 'ACTIVE_SPRINT' && entityType === 'SPRINT') {
        where.status = 'ACTIVE';
        return where;
    }

    if (['status', 'priority', 'role'].includes(sourceFilter.field) && typeof value === 'string') {
        value = value.toUpperCase();
    }


    switch (sourceFilter.operator) {
      case 'EQ':
        if (value !== undefined) where[sourceFilter.field] = value;
        break;
      case 'NEQ':
        if (value !== undefined) where[sourceFilter.field] = { not: value };
        break;
      case 'GT':
        if (value !== undefined) where[sourceFilter.field] = { gt: value };
        break;
      case 'LT':
        if (value !== undefined) where[sourceFilter.field] = { lt: value };
        break;
      case 'GTE':
        if (value !== undefined) where[sourceFilter.field] = { gte: value };
        break;
      case 'LTE':
        if (value !== undefined) where[sourceFilter.field] = { lte: value };
        break;
      case 'CONTAINS':
        if (typeof value === 'string') where[sourceFilter.field] = { contains: value, mode: 'insensitive' };
        break;
      case 'STARTS_WITH':
        if (typeof value === 'string') where[sourceFilter.field] = { startsWith: value, mode: 'insensitive' };
        break;
      case 'ENDS_WITH':
        if (typeof value === 'string') where[sourceFilter.field] = { endsWith: value, mode: 'insensitive' };
        break;
      case 'IN_LIST':
        if (Array.isArray(value)) where[sourceFilter.field] = { in: value };
        break;
      default:
        break;
    }
  }

  return where;
}

function extractFieldValue(record: any, fieldPath: string): any {
  if (!record || !fieldPath) return undefined;
  return fieldPath.split('.').reduce((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), record);
}

async function applyAggregation(
  records: any[],
  source: PromptVariableSource,
  context: GraphQLContext
): Promise<string> {
  const { aggregation, aggregationField, format } = source;

  if (records.length === 0) return 'No data found';

  switch (aggregation) {
    case 'COUNT':
      return String(records.length);
    case 'SUM':
    case 'AVERAGE': {
      if (!aggregationField) return 'N/A (Aggregation field not specified)';
      const values = records.map(r => Number(extractFieldValue(r, aggregationField))).filter(v => !isNaN(v));
      if (values.length === 0) return 'N/A (No numeric data to aggregate)';
      const sum = values.reduce((acc, val) => acc + val, 0);
      return aggregation === 'SUM' ? String(sum) : String(sum / values.length);
    }
    case 'LIST_FIELD_VALUES': {
      if (!aggregationField) return 'N/A (Aggregation field not specified)';
      const values = records.map(r => extractFieldValue(r, aggregationField)).filter(Boolean);
      if (values.length === 0) return 'No data found';
      switch (format) {
        case 'BULLET_POINTS': return values.map(v => `• ${v}`).join('\n');
        case 'COMMA_SEPARATED': return values.join(', ');
        case 'PLAIN_TEXT': return values.join('\n');
        case 'JSON_ARRAY': return JSON.stringify(values);
        default: return values.join('\n');
      }
    }
    case 'LAST_UPDATED_FIELD_VALUE':
    case 'FIRST_CREATED_FIELD_VALUE': {
      if (!aggregationField) return 'N/A (Aggregation field not specified)';
      const record = aggregation === 'LAST_UPDATED_FIELD_VALUE' ? records[0] : records[records.length - 1];
      const value = extractFieldValue(record, aggregationField);
      return value !== undefined ? String(value) : 'N/A';
    }
    default:
      return 'N/A (Unsupported aggregation)';
  }
}

const promptResolvers = {
  Query: {
    getProjectPrompts: async (
      _parent: any,
      { projectId, skip = 0, take = 10, q }: { projectId?: string, skip?: number, take?: number, q?: string },
      context: GraphQLContext
    ): Promise<{ prompts: Prompt[], totalCount: number }> => {
      let finalWhereClause: any = {};
      if (projectId) {
        finalWhereClause = { projectId };
      } else {
        finalWhereClause = {
          AND: [
            { projectId: null },
            { userId: context.user?.id || '' }
          ]
        };
      }

      if (q && q.trim() !== '') {
        finalWhereClause.title = {
          contains: q,
          mode: 'insensitive',
        };
      }

      const [prompts, totalCount] = await prisma.$transaction([
        prisma.prompt.findMany({
          where: finalWhereClause,
          orderBy: { updatedAt: 'desc' },
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
        prisma.prompt.count({ where: finalWhereClause }),
      ]);

      const mappedPrompts = prompts.map(p => ({
        ...p,
        content: [],
        context: '',
        variables: [],
        versions: [],
      })) as unknown as Prompt[];

      return { prompts: mappedPrompts, totalCount };
    },

    getPromptDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<Prompt> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id },
        include: {
          content: {
            orderBy: { order: 'asc' },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          project: {
            select: { id: true, name: true, workspaceId: true },
          },
        },
      });

      if (!prompt) {
        throw new Error("Prompt not found.");
      }

      const versions = (prompt.versions as any[] || []); // Use `any` for flexibility

      if (versions.length > 0) {
        // Sort to find the latest version reliably
        const sortedVersions = [...versions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const latestVersion = sortedVersions[0];

        // Override the prompt's "active" data with the latest version's data
        prompt.content = latestVersion.content || [];
        prompt.context = latestVersion.context || '';
        prompt.variables = latestVersion.variables || [];
        prompt.aiEnhancedContent = latestVersion.aiEnhancedContent || null;
      }

      // Ensure fields have default values
      prompt.context = prompt.context || '';
      prompt.variables = prompt.variables || [];

      // Map versions to just metadata for the final response, as expected by the frontend hook
      prompt.versions = versions.map(v => ({
        id: v.id,
        createdAt: v.createdAt,
        notes: v.notes,
        description: v.description || '',
        // Explicitly DON'T include content, context, variables here for the list
      }));

      return prompt as unknown as Prompt;
    },

    getPromptVersionContent: async (
      _parent: any,
      { promptId, versionId }: { promptId: string; versionId: string },
      context: GraphQLContext
    ): Promise<Version> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        select: { versions: true },
      });

      if (!prompt) {
        throw new Error("Prompt not found.");
      }

      const versions = (prompt.versions as any[]) || []; // Use any to access aiEnhancedContent
      const version = versions.find((v) => v.id === versionId);

      if (!version) {
        throw new Error("Version not found within this prompt.");
      }
      return {
        id: version.id,
        createdAt: version.createdAt,
        notes: version.notes,
        description: version.description || '',
        content: version.content || [],
        context: version.context || '',
        variables: version.variables || [],
        aiEnhancedContent: version.aiEnhancedContent || null,
      } as Version;
    },

    resolvePromptVariable: async (
      _parent: any,
      { projectId, variableSource }: { projectId?: string; variableSource: any; promptVariableId?: string },
      context: GraphQLContext
    ): Promise<string> => {
      const source = variableSource as PromptVariableSource;
      const currentUserId = context.user?.id;

      if (source.entityType === 'DATE_FUNCTION' && source.field === 'today') {
        return new Date().toISOString().split('T')[0];
      }

      if (!projectId && source.entityType !== 'USER') {
        return 'N/A (Project context required for this dynamic data)';
      }

      if (source.entityType === 'USER') {
        const userWhere = buildPrismaWhereClause(source.filter, projectId || '', currentUserId, source.entityType);
        const currentUser = await prisma.user.findUnique({ where: userWhere });
        if (!currentUser) return 'N/A (Current user data not found)';
        return extractFieldValue(currentUser, source.field || '') || 'N/A';
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            workspace: true,
            members: {
                include: { user: true }
            }
        }
      });
      if (!project) return 'N/A (Project not found)';


      let prismaModel: any;
      let include: any;
      let orderBy: any;

      switch (source.entityType) {
        case 'PROJECT': {
          if (!source.field) return 'N/A (Project field not specified)';
          return extractFieldValue(project, source.field) || 'N/A';
        }
        case 'WORKSPACE': {
          if (!project.workspace) return 'N/A (Workspace not found)';
          if (!source.field) return 'N/A (Workspace field not specified)';
          return extractFieldValue(project.workspace, source.field) || 'N/A';
        }
        case 'TASK': {
          prismaModel = prisma.task;
          const where = buildPrismaWhereClause(source.filter, projectId!, currentUserId, source.entityType);
          include = { assignee: true, creator: true };
          orderBy = { updatedAt: 'desc' };

          if (source.aggregation) {
            const records = await prismaModel.findMany({ where, include, orderBy });
            return await applyAggregation(records, source, context);
          } else {
            const record = await prismaModel.findFirst({ where, include, orderBy });
            if (!record) return 'N/A (Task not found)';
            return extractFieldValue(record, source.field || '') || 'N/A';
          }
        }
        case 'SPRINT': {
          prismaModel = prisma.sprint;
          const where = buildPrismaWhereClause(source.filter, projectId!, currentUserId, source.entityType);
          orderBy = { startDate: 'desc' };

          if (source.aggregation) {
            const records = await prismaModel.findMany({ where, orderBy });
            return await applyAggregation(records, source, context);
          } else {
            const record = await prismaModel.findFirst({ where, orderBy });
            if (!record) return 'N/A (Sprint not found)';
            return extractFieldValue(record, source.field || '') || 'N/A';
          }
        }
        case 'DOCUMENT': {
          prismaModel = prisma.document;
          const where = buildPrismaWhereClause(source.filter, projectId!, currentUserId, source.entityType);
          orderBy = { updatedAt: 'desc' };

          if (source.aggregation) {
            const records = await prismaModel.findMany({ where, orderBy });
            return await applyAggregation(records, source, context);
          } else {
            const record = await prismaModel.findFirst({ where, orderBy });
            if (!record) return 'N/A (Document not found)';
            if (source.field === 'content' && typeof record.content === 'object') {
                return JSON.stringify(record.content);
            }
            return extractFieldValue(record, source.field || '') || 'N/A';
          }
        }
        case 'MEMBER': {
            prismaModel = prisma.projectMember;
            const where = buildPrismaWhereClause(source.filter, projectId!, currentUserId, source.entityType);
            include = { user: true };
            orderBy = { joinedAt: 'asc' };

            if (source.aggregation === 'LIST_FIELD_VALUES' && source.aggregationField === 'user.fullName') {
                const projectMembers = await prismaModel.findMany({ where, include, orderBy });
                const fullNames = projectMembers
                    .map((pm: any) => `${pm.user.firstName || ''} ${pm.user.lastName || ''}`.trim())
                    .filter(Boolean);
                if (fullNames.length === 0) return 'No members found';
                return applyAggregation(fullNames.map(name => ({ name })), { ...source, aggregationField: 'name' }, context);
            }

            if (source.aggregation) {
                const records = await prismaModel.findMany({ where, include, orderBy });
                return await applyAggregation(records, source, context);
            } else {
                const record = await prismaModel.findFirst({ where, include, orderBy });
                if (!record) return 'N/A (Member not found)';
                return extractFieldValue(record, source.field || '') || 'N/A';
            }
        }
        default:
          return 'N/A (Unsupported entity type)';
      }
    },
  },

  Mutation: {
    createPrompt: async (
      _parent: any,
      { input }: { input: {
        projectId?: string;
        title: string;
        content?: Block[];
        context?: string;
        description?: string;
        category?: string;
        tags?: string[];
        isPublic?: boolean;
        model?: string;
        variables?: PromptVariable[];
        versions?: any[];
      }},
      context: GraphQLContext
    ): Promise<Prompt> => {
      const { content, variables, versions, ...scalarData } = input;

      const newPromptData: any = {
        ...scalarData,
        userId: context.user?.id,
      };

      if (content) {
        newPromptData.content = {
          create: content.map((block, index) => ({
            type: block.type,
            value: block.value,
            varId: block.varId,
            placeholder: block.placeholder,
            name: block.name,
            order: index,
          }))
        };
      }

      if (variables) {
        newPromptData.variables = {
          create: variables.map(v => {
            const { id, ...rest } = v;
            return {
              ...rest,
              source: v.source || undefined,
            };
          })
        };
      }
      
      if (versions) {
        newPromptData.versions = {
          create: versions.map(version => {
            const { id, content: versionContent, variables: versionVariables, ...restOfVersion } = version;
            
            const versionCreateData: any = { ...restOfVersion };

            if (versionContent) {
              versionCreateData.content = {
                create: versionContent.map((block: Block, index: number) => ({
                  type: block.type,
                  value: block.value,
                  varId: block.varId,
                  placeholder: block.placeholder,
                  name: block.name,
                  order: index,
                }))
              };
            }

            if (versionVariables) {
              versionCreateData.variables = {
                create: versionVariables.map((v: PromptVariable) => {
                  const { id: varId, ...rest } = v;
                  return {
                     ...rest,
                     source: v.source || undefined
                  };
                })
              };
            }
            
            return versionCreateData;
          })
        };
      }

      const newPrompt = await prisma.prompt.create({
        data: newPromptData,
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true,
          versions: true,
        },
      });

      return newPrompt as unknown as Prompt;
    },

       
        updatePrompt: async (
          _parent: any,
          { input }: { input: {
            id: string;
            title?: string;
            content?: Block[];
            context?: string;
            description?: string;
            category?: string;
            tags?: string[];
            isPublic?: boolean;
            model?: string;
            variables?: PromptVariable[];
          }},
          context: GraphQLContext
        ): Promise<Prompt> => {
          const { id, content, variables, ...scalarUpdates } = input;
    
          await prisma.$transaction(async (tx) => {
            // 1. Update scalar fields on the Prompt
            if (Object.keys(scalarUpdates).length > 0) {
              await tx.prompt.update({
                where: { id },
                data: { ...scalarUpdates, updatedAt: new Date() },
              });
            }
    
            // 2. Sync 'variables' relation
            if (variables) {
              const incomingVariableIds = variables.map(v => v.id).filter(Boolean) as string[];
    
              // Delete variables that were removed on the client
              await tx.promptVariable.deleteMany({
                where: {
                  promptId: id,
                  id: { notIn: incomingVariableIds },
                },
              });
    
              // Create or update incoming variables
              await Promise.all(variables.map(async (variable) => {
                const { id: varId, ...data } = variable;
                const upsertData = {
                  ...data,
                  promptId: id,
                  source: data.source || undefined,
                };
                
                await tx.promptVariable.upsert({
                  where: { id: varId || `_ nonexistent id _` }, // a value that won't be found for creates
                  create: upsertData,
                  update: upsertData,
                });
              }));
            }
    
            // 3. Sync 'content' relation
            if (content) {
              const incomingBlockIds = content.map(b => b.id).filter(Boolean) as string[];
              
              // Delete content blocks that were removed on the client
              await tx.contentBlock.deleteMany({
                where: {
                  promptId: id,
                  id: { notIn: incomingBlockIds },
                },
              });
    
              // Create or update incoming content blocks
              await Promise.all(content.map(async (block, index) => {
                const { id: blockId, ...data } = block;
                const upsertData = {
                  ...data,
                  promptId: id,
                  order: index, // Maintain order from the client
                };
                
                await tx.contentBlock.upsert({
                  where: { id: blockId || `_ nonexistent id _` }, // a value that won't be found for creates
                  create: upsertData,
                  update: upsertData,
                });
              }));
            }
          });
    
          // 4. Fetch and return the final, fully updated prompt
          const updatedPrompt = await prisma.prompt.findUnique({
            where: { id },
            include: {
              content: { orderBy: { order: 'asc' } },
              variables: true,
            },
          });
    
          if (!updatedPrompt) {
            throw new Error("Prompt not found after update.");
          }
          
          return updatedPrompt as unknown as Prompt;
        },
    

    deletePrompt: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<Prompt> => {
      const deletedPrompt = await prisma.prompt.delete({
        where: { id },
      });
      return deletedPrompt as unknown as Prompt;
    },




    snapshotPrompt: async (
      _parent: any,
      { input }: { input: { promptId: string; notes?: string } },
      context: GraphQLContext
    ): Promise<Prompt> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id: input.promptId },
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true,
        },
      });

      if (!prompt) {
        throw new Error("Prompt not found.");
      }
      
      const contentForVersion = prompt.content.map(({ id, promptId, versionId, ...block }) => block);
      const variablesForVersion = (prompt.variables || []).map(({ id, promptId, versionId, ...variable }) => ({
        ...variable,
        source: variable.source || undefined,
      }));

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.promptId },
        data: {
          updatedAt: new Date(),
          versions: {
            create: [
              {
                notes: input.notes || `Version saved on ${new Date().toLocaleString()}`,
                description: "",
                context: prompt.context || '',
                content: {
                  createMany: {
                    data: contentForVersion,
                  },
                },
                variables: {
                  createMany: {
                    data: variablesForVersion,
                  },
                },
              },
            ],
          },
        },
        include: { 
            content: { orderBy: { order: 'asc' } }, // For the top-level prompt
            versions: { // For the versions relation...
                include: { // ...for each version, also include its...
                    content: { orderBy: { order: 'asc' } }, // ...content
                    variables: true, // ...and variables
                }
            },
        },
      });

      return updatedPrompt as unknown as Prompt;
    },








    restorePromptVersion: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string } },
      context: GraphQLContext
    ): Promise<Prompt> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id: input.promptId },
      });

      if (!prompt) {
        throw new Error("Prompt not found.");
      }

      const versions = (prompt.versions as Version[]) || [];
      const versionToRestore = versions.find((v) => v.id === input.versionId);

      if (!versionToRestore) {
        throw new Error("Version not found.");
      }
      
      // **FIX**: Rename the destructured 'context' to avoid conflict with the argument 'context'
      const { content, context: versionContext, variables } = versionToRestore;

      const restoredPrompt = await prisma.$transaction(async (tx) => {
        await tx.prompt.update({
            where: { id: input.promptId },
            data: {
              context: versionContext, // **FIX**: Use the renamed variable
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
      { input }: { input: { promptId: string; versionId: string; description: string } },
      context: GraphQLContext
    ): Promise<Prompt> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id: input.promptId },
      });

      if (!prompt) {
        throw new Error("Prompt not found.");
      }

      let versions = (prompt.versions as Version[]) || [];
      const versionIndex = versions.findIndex((v) => v.id === input.versionId);

      if (versionIndex === -1) {
        throw new Error("Version not found.");
      }

      const updatedVersions = [...versions];
      updatedVersions[versionIndex] = {
        ...updatedVersions[versionIndex],
        description: input.description,
      };

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.promptId },
        data: {
          versions: updatedVersions,
          updatedAt: new Date(),
        },
        include: { content: { orderBy: { order: 'asc' } } }
      });
      
      return updatedPrompt as unknown as Prompt;
    },

  },

  Project: {
    totalTaskCount: async (parent: any, _args: any, context: GraphQLContext) => {
      if (!parent.id) return 0;
      return prisma.task.count({ where: { projectId: parent.id } });
    },
    completedTaskCount: async (parent: any, _args: any, context: GraphQLContext) => {
      if (!parent.id) return 0;
      return prisma.task.count({ where: { projectId: parent.id, status: 'DONE' } });
    },
  },

  User: {
    fullName: (parent: any) => `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
  },
};

export default promptResolvers;
