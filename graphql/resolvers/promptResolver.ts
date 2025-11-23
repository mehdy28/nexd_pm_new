// graphql/resolvers/promptResolver.ts
import { GraphQLResolveInfo } from 'graphql';
import { prisma } from "@/lib/prisma";
import { type Prompt, type PromptVariable, type Version, Block } from '@/components/prompt-lab/store';

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

type PromptVariableSource = {
  entityType: string;
  field?: string;
  filter?: {
    field: string;
    operator: string;
    value?: any;
    specialValue?: string;
  };
  aggregation?: string;
  aggregationField?: string;
  format?: string;
};

const getFullPrompt = async (promptId: string) => {
  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    include: {
      versions: {
        orderBy: { createdAt: 'desc' },
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true
        }
      }
    },
  });

  if (!prompt) {
    return null;
  }

  const activeVersion = prompt.versions.find(v => v.isActive);

  return {
    ...prompt,
    activeVersion: activeVersion || null,
  };
};

function buildPrismaWhereClause(
  sourceFilter: PromptVariableSource['filter'] | undefined,
  projectId: string,
  currentUserId: string | undefined,
  entityType: PromptVariableSource['entityType']
): any {
  const where: any = {};

  if (entityType !== 'USER' && entityType !== 'DATE_FUNCTION' && projectId) {
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

// --- FIX 1 START: Correctly handle JSON objects during field extraction ---
function extractFieldValue(record: any, fieldPath: string): any {
  if (!record || !fieldPath) return undefined;
  const value = fieldPath.split('.').reduce((obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined), record);
  
  // If the extracted value is an object (like the JSON content field), stringify it.
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2); // Pretty print JSON
  }
  
  return value;
}
// --- FIX 1 END ---


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
        }),
        prisma.prompt.count({ where: finalWhereClause }),
      ]);

      return { prompts: prompts as unknown as Prompt[], totalCount };
    },

    getPromptDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<Prompt | null> => {
      const prompt = await prisma.prompt.findUnique({
        where: { id },
        include: {
          versions: {
            include: {
                content: { orderBy: { order: 'asc' } },
                variables: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
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
      
      const activeVersion = prompt.versions.find(v => v.isActive) || null;

      return {
          ...prompt,
          activeVersion,
      } as unknown as Prompt;
    },

    getPromptVersionContent: async (
      _parent: any,
      { promptId, versionId }: { promptId: string; versionId: string },
      context: GraphQLContext
    ): Promise<Version> => {
      const version = await prisma.version.findUnique({
        where: {
          id: versionId,
          promptId: promptId,
        },
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true,
        },
      });

      if (!version) {
        throw new Error("Version not found.");
      }
      
      return version as unknown as Version;
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

      const project = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;

      let prismaModel: any;

      const where = buildPrismaWhereClause(source.filter, projectId || '', currentUserId, source.entityType);

      switch (source.entityType) {
        case 'PROJECT':
          if (!project || !source.field) return 'N/A';
          return extractFieldValue(project, source.field) || 'N/A';
        default:
          const modelName = source.entityType.toLowerCase();
          if (!(modelName in prisma)) return 'N/A (Unsupported entity type)';
          
          prismaModel = (prisma as any)[modelName];

          // --- FIX 2 START: Handle ambiguous queries by defaulting to the latest record ---
          const records = await prismaModel.findMany({ 
              where,
              orderBy: { updatedAt: 'desc' } // Always order by most recent
          });

          if (records.length === 0) return 'N/A (No matching records found)';

          if (source.aggregation) {
            return await applyAggregation(records, source, context);
          } else {
            // If no aggregation is specified, default to the most recent record.
            const record = records[0]; 
            if (!source.field) {
                // If no field is specified, return the title or name as a sensible default.
                return extractFieldValue(record, 'title') || extractFieldValue(record, 'name') || 'N/A (Field not specified)';
            }
            return extractFieldValue(record, source.field) || 'N/A';
          }
          // --- FIX 2 END ---
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
      }},
      context: GraphQLContext
    ): Promise<Prompt> => {
      const { projectId, content, variables, context: promptContext, ...scalarData } = input;
      const userId = context.user?.id;

      const createData: any = {
        ...scalarData,
        versions: {
          create: [
            {
              notes: "Initial version",
              context: promptContext || '',
              isActive: true,
              content: {
                create: content?.map((block, index) => ({
                  type: block.type, value: block.value, varId: block.varId,
                  placeholder: block.placeholder, name: block.name, order: index,
                })),
              },
              variables: {
                create: variables?.map(v => {
                  const { id, ...rest } = v;
                  return { ...rest, source: v.source || undefined };
                }),
              },
            },
          ],
        },
      };

      if (projectId) {
        createData.project = { connect: { id: projectId } };
      } else if (userId) {
        createData.user = { connect: { id: userId } };
      }

      const newPrompt = await prisma.prompt.create({ data: createData });

      return await getFullPrompt(newPrompt.id) as unknown as Prompt;
    },
       
       
    updatePrompt: async (
      _parent: any,
      { input }: { input: {
        id: string;
        title?: string;
        description?: string;
        category?: string;
        tags?: string[];
        isPublic?: boolean;
        model?: string;
      }},
      context: GraphQLContext
    ): Promise<Prompt> => {
      const { id, ...scalarUpdates } = input;

      await prisma.prompt.update({
        where: { id },
        data: { ...scalarUpdates, updatedAt: new Date() },
      });

      return await getFullPrompt(id) as unknown as Prompt;
    },

    deletePrompt: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<Prompt> => {
      const deletedPrompt = await prisma.prompt.delete({ where: { id } });
      return deletedPrompt as unknown as Prompt;
    },

    updateVersionDescription: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string; description: string } },
      context: GraphQLContext
    ): Promise<Prompt> => {
      await prisma.version.update({
        where: { id: input.versionId, promptId: input.promptId },
        data: { description: input.description },
      });

      return await getFullPrompt(input.promptId) as unknown as Prompt;
    },

    snapshotPrompt: async (
      _parent: any,
      { input }: { input: { promptId: string; notes?: string } },
      context: GraphQLContext
    ): Promise<Prompt> => {
      const { promptId, notes } = input;

      const activeVersion = await prisma.version.findFirst({
        where: { promptId, isActive: true },
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true,
        },
      });

      if (!activeVersion) {
        throw new Error("No active version found to create a snapshot from.");
      }
      
      await prisma.version.create({
        data: {
          prompt: { connect: { id: promptId } },
          notes: notes || `Version saved at ${new Date().toLocaleString()}`,
          context: activeVersion.context,
          isActive: false,
          content: {
            create: activeVersion.content.map(block => ({
              type: block.type, value: block.value, varId: block.varId,
              placeholder: block.placeholder, name: block.name, order: block.order,
            })),
          },
          variables: {
            create: activeVersion.variables.map(variable => ({
              name: variable.name, placeholder: variable.placeholder, description: variable.description,
              type: variable.type, defaultValue: variable.defaultValue, source: variable.source || undefined,
            })),
          },
        },
      });

      return await getFullPrompt(promptId) as unknown as Prompt;
    },

    updatePromptVersion: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string; content?: Block[]; context?: string; variables?: PromptVariable[]; notes?: string; } },
    ): Promise<Prompt> => {
      const { promptId, versionId, content, context, variables, notes } = input;
      
      await prisma.$transaction(async (tx) => {
        await tx.version.update({
          where: { id: versionId },
          data: {
            notes: notes,
            context: context,
          },
        });

        if (content) {
          await tx.contentBlock.deleteMany({ where: { versionId: versionId } });
          if (content.length > 0) {
            await tx.contentBlock.createMany({
              data: content.map((block, index) => ({ 
                type: block.type, value: block.value, varId: block.varId, 
                placeholder: block.placeholder, name: block.name, 
                versionId, order: index 
              })),
            });
          }
        }

        if (variables) {
          await tx.promptVariable.deleteMany({ where: { versionId: versionId } });
          if (variables.length > 0) {
            await tx.promptVariable.createMany({
              data: variables.map(v => {
                const { id, ...rest } = v;
                return { ...rest, versionId, source: v.source || undefined };
              }),
            });
          }
        }
      });
      
      return await getFullPrompt(promptId) as unknown as Prompt;
    },

    setActivePromptVersion: async (
      _parent: any,
      { promptId, versionId }: { promptId: string; versionId: string },
      context: GraphQLContext
    ): Promise<Prompt> => {

      await prisma.$transaction(async (tx) => {
        await tx.version.updateMany({
          where: { promptId: promptId },
          data: { isActive: false },
        });

        await tx.version.update({
          where: { id: versionId },
          data: { isActive: true },
        });
      });

      return await getFullPrompt(promptId) as unknown as Prompt;
    },
  },

  Project: {
    totalTaskCount: async (parent: any) => prisma.task.count({ where: { projectId: parent.id } }),
    completedTaskCount: async (parent: any) => prisma.task.count({ where: { projectId: parent.id, status: 'DONE' } }),
  },
  User: {
    fullName: (parent: any) => `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
  },
};

export default promptResolvers;