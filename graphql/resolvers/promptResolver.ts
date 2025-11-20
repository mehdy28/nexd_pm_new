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
const getFullPrompt = (promptId: string) => {
  console.log(`[getFullPrompt] Fetching full prompt details for ID: ${promptId}`);
  return prisma.prompt.findUnique({
    where: { id: promptId },
    include: {
      content: { orderBy: { order: 'asc' } },
      variables: true,
      versions: {
        orderBy: { createdAt: 'desc' },
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true
        }
      },
    },
  });
};

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
          // FIX: Added 'variables' and 'versions' to the include clause
          variables: true,
          versions: {
            select: {
              id: true,
              createdAt: true,
              notes: true,
              description: true,
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

      // FIX: Removed all the incorrect logic that was overwriting the fetched data.
      // The prompt object fetched directly from Prisma now contains the correct
      // active content, variables, and version metadata.

      return prompt as unknown as Prompt;
    },


  

    getPromptVersionContent: async (
      _parent: any,
      { promptId, versionId }: { promptId: string; versionId: string },
      context: GraphQLContext
    ): Promise<Version> => {
      console.log(`[getPromptVersionContent] Initiated for versionId: ${versionId}`);

      const version = await prisma.version.findUnique({
        where: {
          id: versionId,
          promptId: promptId, // Ensures version belongs to the correct prompt
        },
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true,
        },
      });

      if (!version) {
        console.error(`[getPromptVersionContent] ERROR: Version with ID ${versionId} not found.`);
        throw new Error("Version not found.");
      }

      console.log(`[getPromptVersionContent] Successfully fetched version. Content blocks: ${version.content.length}, Variables: ${version.variables.length}`);
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
        // 'versions' is no longer used from the input, but we keep it for destructuring
        versions?: any[]; 
      }},
      context: GraphQLContext
    ): Promise<Prompt> => {
      const { content, variables, ...scalarData } = input;

      // Prepare the data for nested creation once to avoid repetition.
      const contentCreateData = content ? content.map((block, index) => ({
        type: block.type,
        value: block.value,
        varId: block.varId,
        placeholder: block.placeholder,
        name: block.name,
        order: index,
      })) : [];
      
      const variablesCreateData = variables ? variables.map(v => {
        const { id, ...rest } = v; // Exclude client-side temporary ID
        return {
          ...rest,
          source: v.source || undefined,
        };
      }) : [];

      // Construct the data payload for Prisma.
      const newPromptData: any = {
        ...scalarData,
        userId: context.user?.id,
        // Create the top-level 'active' content and variables
        content: {
          create: contentCreateData
        },
        variables: {
          create: variablesCreateData
        },
        // Automatically create the first version as a snapshot of the initial state.
        versions: {
          create: [
            {
              notes: "Initial version",
              description: "", // Default description for the first version
              context: input.context || '',
              // Create the content and variables specific to this version
              content: {
                create: contentCreateData,
              },
              variables: {
                create: variablesCreateData,
              },
            },
          ],
        },
      };

      const newPrompt = await prisma.prompt.create({
        data: newPromptData,
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true,
          // Eagerly load the created version and its nested relations
          // to satisfy the GraphQL query and prevent null errors.
          versions: {
            include: {
              content: { orderBy: { order: 'asc' } },
              variables: true,
            }
          },
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



    snapshotPrompt: async (
      _parent: any,
      { input }: { input: { promptId: string; notes?: string } },
      context: GraphQLContext
    ): Promise<Prompt> => {
      console.log(`[snapshotPrompt] Initiated for promptId: ${input.promptId} with notes: "${input.notes}"`);
      const { promptId, notes } = input;

      const activePrompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true,
        },
      });

      if (!activePrompt) {
        console.error(`[snapshotPrompt] ERROR: Prompt with ID ${promptId} not found.`);
        throw new Error("Prompt not found to create a snapshot.");
      }
      
      console.log(`[snapshotPrompt] Fetched active prompt. Content blocks count: ${activePrompt.content?.length}, Variables count: ${activePrompt.variables?.length}`);

      // Create a new Version record and transactionally create copies of its content and variables
      try {
        const createVersionPayload = {
          prompt: { connect: { id: promptId } },
          notes: notes || `Version saved at ${new Date().toLocaleString()}`,
          context: activePrompt.context || '', // Fallback to empty string to ensure non-null
          aiEnhancedContent: activePrompt.aiEnhancedContent,
          content: {
            create: (activePrompt.content || []).map(block => ({
              type: block.type,
              value: block.value,
              varId: block.varId,
              placeholder: block.placeholder,
              name: block.name,
              order: block.order,
            })),
          },
          variables: {
            create: (activePrompt.variables || []).map(variable => ({
              name: variable.name,
              placeholder: variable.placeholder,
              description: variable.description,
              type: variable.type,
              defaultValue: variable.defaultValue,
              source: variable.source || undefined,
            })),
          },
        };

        console.log(`[snapshotPrompt] Payload for new version creation:`, JSON.stringify(createVersionPayload, null, 2));

        await prisma.version.create({
          data: createVersionPayload,
        });

        console.log(`[snapshotPrompt] Successfully created new version record in the database.`);

      } catch (error) {
        console.error(`[snapshotPrompt] ERROR during prisma.version.create:`, error);
        throw new Error("Failed to create version in database.");
      }


      // Refetch the full prompt with the new version included
      console.log(`[snapshotPrompt] Refetching full prompt to return to client...`);
      const updatedPrompt = await getFullPrompt(promptId);
      if (!updatedPrompt) {
        console.error(`[snapshotPrompt] ERROR: Failed to retrieve prompt after snapshot.`);
        throw new Error("Failed to retrieve prompt after snapshot.");
      }

      console.log(`[snapshotPrompt] Successfully completed. Returning updated prompt with ${updatedPrompt.versions.length} versions.`);
      return updatedPrompt as unknown as Prompt;
    },

    updatePromptVersion: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string; content?: ContentBlockType[]; context?: string; variables?: any[]; notes?: string; } },
    ): Promise<Prompt> => {
      const { promptId, versionId, content, context, variables, notes } = input;
      console.log(`[updatePromptVersion] Initiated for versionId: ${versionId}. Updating fields: ${Object.keys(input).join(', ')}`);

      try {
        await prisma.$transaction(async (tx) => {
          console.log(`[updatePromptVersion] Starting transaction for versionId: ${versionId}`);
          
          await tx.version.update({
            where: { id: versionId },
            data: {
              notes: notes,
              context: context,
            },
          });
          console.log(`[updatePromptVersion] Updated scalar fields (notes, context).`);

          if (content) {
            console.log(`[updatePromptVersion] Deleting old content blocks for version...`);
            await tx.contentBlock.deleteMany({ where: { versionId: versionId } });
            console.log(`[updatePromptVersion] Creating ${content.length} new content blocks...`);
            await tx.contentBlock.createMany({
              data: content.map((block, index) => ({
                versionId: versionId,
                type: block.type,
                value: block.value,
                varId: block.varId,
                placeholder: block.placeholder,
                name: block.name,
                order: index,
              })),
            });
          }

          if (variables) {
            console.log(`[updatePromptVersion] Deleting old variables for version...`);
            await tx.promptVariable.deleteMany({ where: { versionId: versionId } });
            console.log(`[updatePromptVersion] Creating ${variables.length} new variables...`);
            await tx.promptVariable.createMany({
              data: variables.map(v => ({
                versionId: versionId,
                name: v.name,
                placeholder: v.placeholder,
                description: v.description,
                type: v.type,
                defaultValue: v.defaultValue,
                source: v.source || undefined,
              })),
            });
          }
          console.log(`[updatePromptVersion] Transaction completed successfully.`);
        });
      } catch (error) {
          console.error(`[updatePromptVersion] ERROR during transaction:`, error);
          throw new Error("Failed to update version in database.");
      }
      
      console.log(`[updatePromptVersion] Refetching full prompt to return to client...`);
      const updatedPrompt = await getFullPrompt(promptId);
      if (!updatedPrompt) {
        console.error(`[updatePromptVersion] ERROR: Failed to retrieve prompt after version update.`);
        throw new Error("Failed to retrieve prompt after version update.");
      }

      console.log(`[updatePromptVersion] Successfully completed. Returning updated prompt.`);
      return updatedPrompt as unknown as Prompt;
    },

    restorePromptVersion: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string } },
      context: GraphQLContext
    ): Promise<Prompt> => {
      const { promptId, versionId } = input;
      console.log(`[restorePromptVersion] Initiated for promptId: ${promptId} from versionId: ${versionId}`);


      const versionToRestore = await prisma.version.findUnique({
        where: { id: versionId },
        include: {
          content: { orderBy: { order: 'asc' } },
          variables: true,
        },
      });

      if (!versionToRestore) {
        console.error(`[restorePromptVersion] ERROR: Version with ID ${versionId} not found.`);
        throw new Error("Version not found.");
      }
      console.log(`[restorePromptVersion] Fetched version to restore. Content blocks count: ${versionToRestore.content?.length}, Variables count: ${versionToRestore.variables?.length}`);

      try {
        await prisma.$transaction(async (tx) => {
          console.log(`[restorePromptVersion] Starting transaction...`);

          await tx.prompt.update({
            where: { id: promptId },
            data: {
              context: versionToRestore.context,
              updatedAt: new Date(),
            },
          });
          console.log(`[restorePromptVersion] Updated main prompt's context.`);

          console.log(`[restorePromptVersion] Deleting old content and variables from main prompt...`);
          await tx.contentBlock.deleteMany({ where: { promptId: promptId } });
          await tx.promptVariable.deleteMany({ where: { promptId: promptId } });
          
          if (versionToRestore.content && versionToRestore.content.length > 0) {
            console.log(`[restorePromptVersion] Creating ${versionToRestore.content.length} new content blocks for main prompt...`);
            await tx.contentBlock.createMany({
              data: versionToRestore.content.map((block, index) => ({
                promptId: promptId,
                type: block.type,
                value: block.value,
                varId: block.varId,
                placeholder: block.placeholder,
                name: block.name,
                order: index,
              })),
            });
          }

          if (versionToRestore.variables && versionToRestore.variables.length > 0) {
            console.log(`[restorePromptVersion] Creating ${versionToRestore.variables.length} new variables for main prompt...`);
            await tx.promptVariable.createMany({
              data: versionToRestore.variables.map(v => ({
                promptId: promptId,
                name: v.name,
                placeholder: v.placeholder,
                description: v.description,
                type: v.type,
                defaultValue: v.defaultValue,
                source: v.source || undefined,
              })),
            });
          }
          console.log(`[restorePromptVersion] Transaction completed successfully.`);
        });
      } catch (error) {
        console.error(`[restorePromptVersion] ERROR during transaction:`, error);
        throw new Error("Failed to restore prompt version.");
      }
      
      console.log(`[restorePromptVersion] Refetching full prompt to return to client...`);
      const restoredPrompt = await getFullPrompt(promptId);
       if (!restoredPrompt) {
        console.error(`[restorePromptVersion] ERROR: Failed to retrieve prompt after restore.`);
        throw new Error("Failed to retrieve prompt after restore.");
      }

      console.log(`[restorePromptVersion] Successfully completed. Returning restored prompt.`);
      return restoredPrompt as unknown as Prompt;
    },

  },









  Project: {
    totalTaskCount: async (parent: any, _args: any, _context: GraphQLContext) => {
      if (!parent.id) return 0;
      return prisma.task.count({ where: { projectId: parent.id } });
    },
    completedTaskCount: async (parent: any, _args: any, _context: GraphQLContext) => {
      if (!parent.id) return 0;
      return prisma.task.count({ where: { projectId: parent.id, status: 'DONE' } });
    },
  },

  User: {
    fullName: (parent: any) => `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
  },
};

export default promptResolvers;


















