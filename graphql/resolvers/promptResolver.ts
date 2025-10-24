// graphql/resolvers/promptResolver.ts

import { GraphQLResolveInfo } from 'graphql';
import { prisma } from "@/lib/prisma";
import { type Prompt, type PromptVariable, type Version, PromptVariableType, PromptVariableSource } from '@/components/prompt-lab/store'; // Updated import to include PromptVariableSource

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string }; // User might still be provided, but not checked
}

// Utility to generate a unique ID, mimicking client-side cuid for consistency
function generateUniqueId(): string {
  // In a real backend, you'd rely on database-generated IDs or a more robust UUID/CUID library
  return `svr_${Math.random().toString(36).slice(2)}${Date.now()}`;
}

// --- Helper Functions for dynamic resolution ---

function buildPrismaWhereClause(
  sourceFilter: PromptVariableSource['filter'] | undefined,
  projectId: string,
  currentUserId: string | undefined,
  entityType: PromptVariableSource['entityType']
): any {
  const where: any = {};

  // Always filter by projectId if not a USER or DATE_FUNCTION entity
  if (entityType !== 'USER' && entityType !== 'DATE_FUNCTION') {
    where.projectId = projectId;
  } else if (entityType === 'USER') {
    where.id = currentUserId; // For USER entity, filter by current user's ID
  }

  if (sourceFilter && sourceFilter.field && sourceFilter.operator) {
    let value = sourceFilter.value;

    // Handle special dynamic values
    if (sourceFilter.specialValue === 'CURRENT_USER_ID') {
      value = currentUserId;
    } else if (sourceFilter.specialValue === 'CURRENT_PROJECT_ID') {
      value = projectId;
    } else if (sourceFilter.specialValue === 'ACTIVE_SPRINT' && entityType === 'SPRINT') {
        where.status = 'ACTIVE';
        return where; // Special case, status filter applied directly
    }
    
    // Convert status for tasks/sprints/projects to uppercase to match enum if needed
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
        // No-op or throw error for unsupported operator
        break;
    }
  }

  return where;
}

// Extracts value from a nested field path (e.g., 'user.firstName')
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
      const values = records.map(r => extractFieldValue(r, aggregationField)).filter(Boolean); // Filter out null/undefined
      if (values.length === 0) return 'No data found';
      switch (format) {
        case 'BULLET_POINTS': return values.map(v => `• ${v}`).join('\n');
        case 'COMMA_SEPARATED': return values.join(', ');
        case 'PLAIN_TEXT': return values.join('\n');
        case 'JSON_ARRAY': return JSON.stringify(values);
        default: return values.join('\n'); // Default to plain text new line
      }
    }

    case 'LAST_UPDATED_FIELD_VALUE':
    case 'FIRST_CREATED_FIELD_VALUE': {
      if (!aggregationField) return 'N/A (Aggregation field not specified)';
      // Assuming records are already sorted by updatedAt or createdAt if such aggregations are used.
      // For more robustness, you might need to sort here explicitly.
      const record = aggregation === 'LAST_UPDATED_FIELD_VALUE' ? records[0] : records[records.length - 1]; // Assumes desc for last_updated
      const value = extractFieldValue(record, aggregationField);
      return value !== undefined ? String(value) : 'N/A';
    }
    
    // Add other aggregations as needed
    default:
      return 'N/A (Unsupported aggregation)';
  }
}

// --- Main Resolvers ---

const promptResolvers = {
  Query: {
    getProjectPrompts: async (
      _parent: any,
      { projectId }: { projectId?: string },
      context: GraphQLContext
    ): Promise<Prompt[]> => {
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

      const prompts = await prisma.prompt.findMany({
        where: finalWhereClause,
        orderBy: { updatedAt: 'desc' },
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
      });

      return prompts as unknown as Prompt[];
    },

    getPromptDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<Prompt> => {
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
      });
      return prompt as unknown as Prompt;
    },

    resolvePromptVariable: async (
      _parent: any,
      { projectId, variableSource }: { projectId?: string; variableSource: any; promptVariableId?: string },
      context: GraphQLContext
    ): Promise<string> => {
      const source = variableSource as PromptVariableSource;
      const currentUserId = context.user?.id;

      // Handle DATE_FUNCTION separately as it doesn't need project context
      if (source.entityType === 'DATE_FUNCTION' && source.field === 'today') {
        return new Date().toISOString().split('T')[0];
      }

      // Project context required for all other dynamic data sources
      if (!projectId && source.entityType !== 'USER') {
        return 'N/A (Project context required for this dynamic data)';
      }

      // If entityType is USER, and we need current user's data
      if (source.entityType === 'USER') {
        const userWhere = buildPrismaWhereClause(source.filter, projectId || '', currentUserId, source.entityType);
        const currentUser = await context.prisma.user.findUnique({ where: userWhere });
        if (!currentUser) return 'N/A (Current user data not found)';
        return extractFieldValue(currentUser, source.field || '') || 'N/A';
      }

      // Fetch the project for context validation if it's a project-scoped entity
      const project = await context.prisma.project.findUnique({
        where: { id: projectId },
        include: {
            workspace: true,
            members: {
                include: { user: true }
            }
        }
      });
      if (!project) return 'N/A (Project not found)';


      let result: any;
      let prismaModel: any;
      let include: any;
      let orderBy: any;
      let fieldToSelect: string | undefined = source.field; // The field to get if not aggregating

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
          prismaModel = context.prisma.task;
          const where = buildPrismaWhereClause(source.filter, projectId!, currentUserId, source.entityType);
          include = { assignee: true, creator: true }; // Include relations for nested fields like assignee.firstName
          orderBy = { updatedAt: 'desc' }; // Default order for 'LAST_UPDATED_FIELD_VALUE'

          if (source.aggregation) {
            const records = await prismaModel.findMany({ where, include, orderBy });
            return await applyAggregation(records, source, context);
          } else {
            // No aggregation, assume single task needed (e.g., first, or by ID if filter provides it)
            // For simplicity, take the first one if no specific ID is filtered
            const record = await prismaModel.findFirst({ where, include, orderBy });
            if (!record) return 'N/A (Task not found)';
            return extractFieldValue(record, source.field || '') || 'N/A';
          }
        }
        case 'SPRINT': {
          prismaModel = context.prisma.sprint;
          const where = buildPrismaWhereClause(source.filter, projectId!, currentUserId, source.entityType);
          orderBy = { startDate: 'desc' }; // Default order for 'current_sprint' or 'LAST_UPDATED_FIELD_VALUE'

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
          prismaModel = context.prisma.document;
          const where = buildPrismaWhereClause(source.filter, projectId!, currentUserId, source.entityType);
          orderBy = { updatedAt: 'desc' };

          if (source.aggregation) {
            const records = await prismaModel.findMany({ where, orderBy });
            return await applyAggregation(records, source, context);
          } else {
            const record = await prismaModel.findFirst({ where, orderBy });
            if (!record) return 'N/A (Document not found)';
            // Special handling for JSON content
            if (source.field === 'content' && typeof record.content === 'object') {
                return JSON.stringify(record.content);
            }
            return extractFieldValue(record, source.field || '') || 'N/A';
          }
        }
        case 'MEMBER': { // ProjectMember entity
            prismaModel = context.prisma.projectMember;
            const where = buildPrismaWhereClause(source.filter, projectId!, currentUserId, source.entityType);
            include = { user: true }; // Always include user for member details
            orderBy = { joinedAt: 'asc' };

            // Special aggregation for full names, as 'user.fullName' is not a direct Prisma field
            if (source.aggregation === 'LIST_FIELD_VALUES' && source.aggregationField === 'user.fullName') {
                const projectMembers = await prismaModel.findMany({ where, include, orderBy });
                const fullNames = projectMembers
                    .map((pm: any) => `${pm.user.firstName || ''} ${pm.user.lastName || ''}`.trim())
                    .filter(Boolean);
                if (fullNames.length === 0) return 'No members found';
                return applyAggregation(fullNames.map(name => ({ name })), { ...source, aggregationField: 'name' }, context); // Re-use aggregation for formatting
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
        content?: string;
        context?: string;
        description?: string;
        category?: string;
        tags?: string[];
        isPublic?: boolean;
        model?: string;
        variables?: PromptVariable[];
        versions?: Version[];
      }},
      context: GraphQLContext
    ): Promise<Prompt> => {
      const newPromptData = {
        title: input.title,
        content: input.content || '',
        context: input.context || '',
        description: input.description,
        category: input.category,
        tags: input.tags || [],
        isPublic: input.isPublic || false,
        model: input.model || 'gpt-4o',
        userId: context.user?.id || 'anonymous',
        projectId: input.projectId,
        variables: (input.variables || []).map(v => ({...v, id: v.id || generateUniqueId()})),
        versions: (input.versions || []).map(v => ({...v, id: v.id || generateUniqueId()})),
      };

      const newPrompt = await prisma.prompt.create({
        data: newPromptData,
      });

      return newPrompt as unknown as Prompt;
    },

    updatePrompt: async (
      _parent: any,
      { input }: { input: {
        id: string;
        title?: string;
        content?: string;
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
      const existingPrompt = await prisma.prompt.findUnique({
        where: { id: input.id },
      });

      if (!existingPrompt) {
        throw new Error("Prompt not found.");
      }

      const updateData: any = { updatedAt: new Date() };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.context !== undefined) updateData.context = input.context;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;
      if (input.model !== undefined) updateData.model = input.model;
      if (input.variables !== undefined) {
        updateData.variables = input.variables.map(v => ({ ...v, id: v.id || generateUniqueId() }));
      }

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.id },
        data: updateData,
      });

      return updatedPrompt as unknown as Prompt;
    },

    deletePrompt: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<Prompt> => {
      const existingPrompt = await prisma.prompt.findUnique({
        where: { id },
      });

      if (!existingPrompt) {
        throw new Error("Prompt not found.");
      }

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
      });

      if (!prompt) {
        throw new Error("Prompt not found.");
      }

      const currentContent = prompt.content as string || '';
      const currentContext = prompt.context as string || '';
      const currentVariables = (prompt.variables as PromptVariable[]) || [];

      const newVersion: Version = {
        id: generateUniqueId(),
        content: currentContent,
        context: currentContext,
        variables: currentVariables.map(v => ({ ...v, id: v.id || generateUniqueId() })),
        createdAt: new Date().toISOString(),
        notes: input.notes || `Version saved on ${new Date().toLocaleString()}`,
      };

      const updatedVersions = [newVersion, ...(prompt.versions as Version[] || [])];

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.promptId },
        data: {
          versions: updatedVersions,
          updatedAt: new Date(),
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

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.promptId },
        data: {
          content: versionToRestore.content,
          context: versionToRestore.context,
          variables: versionToRestore.variables.map(v => ({ ...v, id: v.id || generateUniqueId() })),
          updatedAt: new Date(),
        },
      });

      return updatedPrompt as unknown as Prompt;
    },
  },

  // NEW: Project Type Resolvers for computed fields
  Project: {
    totalTaskCount: async (parent: any, _args: any, context: GraphQLContext) => {
      if (!parent.id) return 0;
      return context.prisma.task.count({ where: { projectId: parent.id } });
    },
    completedTaskCount: async (parent: any, _args: any, context: GraphQLContext) => {
      if (!parent.id) return 0;
      return context.prisma.task.count({ where: { projectId: parent.id, status: 'DONE' } });
    },
    // Add other computed fields for Project here if necessary
  },

  // User type resolver for full name
  User: {
      fullName: (parent: any) => `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
  },
};

export default promptResolvers;