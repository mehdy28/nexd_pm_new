import { GraphQLResolveInfo } from 'graphql';
import { prisma } from "@/lib/prisma";
import { type Prompt, type PromptVariable, type Version, PromptVariableType, type ContentBlock } from '@/components/prompt-lab/types'; // Added ContentBlock to import

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string }; // User might still be provided, but not checked
}

// Extend the Prompt interface for resolvers to properly type the JSON content
interface PromptWithContentBlocks extends Prompt {
  content: ContentBlock[];
  versions: Array<Omit<Version, 'content'> & { content: ContentBlock[] }>;
}

// Utility to generate a unique ID, mimicking client-side cuid for consistency
function generateUniqueId(): string {
  // In a real backend, you'd rely on database-generated IDs or a more robust UUID/CUID library
  return `svr_${Math.random().toString(36).slice(2)}${Date.now()}`;
}

const promptResolvers = {
  Query: {
    getProjectPrompts: async (
      _parent: any,
      { projectId }: { projectId?: string },
      context: GraphQLContext // Context might still have user, but we won't check it
    ): Promise<Prompt[]> => {
      // All user and project access checks removed.

      let finalWhereClause: any = {};
      if (projectId) {
          // If projectId is provided, filter by project.
          finalWhereClause = {
              projectId: projectId,
          };
      } else {
          // If no projectId, fetch all prompts that are not linked to a project (personal ones)
          // For simplicity, we'll try to get them for the logged-in user if available, otherwise just no-project prompts.
          // Note: If `user` is undefined here, it might fetch prompts with `userId: undefined` if that's possible.
          // Assuming `user` from context is always present for 'personal' logic, even if not strictly enforced.
          finalWhereClause = {
              // projectId: null, // Only fetch prompts without a project
              // Assuming you still want personal prompts if no projectId, this will fetch all `projectId: null`
              // If you want all prompts if no projectId (even project ones), remove projectId: null
              // Let's go with "all prompts matching projectId, or all personal prompts for the user if no projectId".
              // This is closest to original intent without specific auth.
              AND: [
                { projectId: null },
                { userId: context.user?.id || '' } // Fallback to empty string if user not available, meaning no match for userId
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
          // Content, context, variables, versions are not returned in list query for performance
        },
      });

      return prompts as unknown as Prompt[];
    },

    getPromptDetails: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<PromptWithContentBlocks> => { // Changed return type to PromptWithContentBlocks
      // All user and project access checks removed.

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

      if (!prompt) {
        throw new Error("Prompt not found.");
      }
      
      // Ensure content and versions content are arrays of ContentBlock or default to empty array
      const parsedPrompt: PromptWithContentBlocks = {
        ...prompt,
        content: (prompt.content as ContentBlock[] || []),
        variables: (prompt.variables as PromptVariable[] || []).map(v => ({ ...v, id: v.id || generateUniqueId() })),
        versions: (prompt.versions as Array<Omit<Version, 'content'> & { content: ContentBlock[] }> || []).map(v => ({ 
            ...v, 
            id: v.id || generateUniqueId(),
            content: (v.content as ContentBlock[] || []) 
        })),
      };

      return parsedPrompt;
    },

    resolvePromptVariable: async (
      _parent: any,
      { projectId, variableSource, promptVariableId }: { projectId?: string; variableSource: any; promptVariableId?: string },
      context: GraphQLContext
    ): Promise<string> => {
      // All user and project access checks removed.

      if (variableSource.type === 'USER_FIELD') {
        const currentUser = await prisma.user.findUnique({ where: { id: context.user?.id || '' } }); // Use context.user without checking if it exists
        if (!currentUser) return 'N/A'; // Still return N/A if user doesn't exist in DB
        switch (variableSource.field) {
          case 'firstName': return currentUser.firstName || 'N/A';
          case 'email': return currentUser.email || 'N/A';
          default: return 'N/A';
        }
      }

      if (variableSource.type === 'DATE_FUNCTION' && variableSource.field === 'today') {
        return new Date().toISOString().split('T')[0];
      }

      if (!projectId) {
        return 'N/A (Project context required for dynamic data)';
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            workspace: true,
        }
      });
      if (!project) return 'N/A (Project not found)'; // Still need this to prevent access to undefined project properties


      switch (variableSource.type) {
        case 'PROJECT_FIELD': {
          switch (variableSource.field) {
            case 'name': return project.name;
            case 'description': return project.description || 'N/A';
            case 'status': return project.status;
            case 'totalTaskCount': {
              const count = await prisma.task.count({ where: { projectId } });
              return String(count);
            }
            case 'completedTaskCount': {
              const count = await prisma.task.count({ where: { projectId, status: 'DONE' } });
              return String(count);
            }
            default: return 'N/A';
          }
        }
        case 'TASKS_AGGREGATION': {
          const where: any = { projectId };
          if (variableSource.filter?.assigneeId === 'current_user') {
            where.assigneeId = context.user?.id; // Use context.user without checking if it exists
          }
          if (variableSource.filter?.status) {
            where.status = variableSource.filter.status;
          }

          if (variableSource.aggregation === 'LIST_TITLES') {
            const tasks = await prisma.task.findMany({
              where,
              select: { title: true },
              orderBy: { createdAt: 'asc' },
            });
            const titles = tasks.map(t => t.title).filter(Boolean);
            if (titles.length === 0) return 'No tasks found';
            return variableSource.format === 'BULLET_POINTS' ? titles.map(t => `• ${t}`).join('\n') : titles.join(', ');
          }
          if (variableSource.aggregation === 'COUNT') {
            const count = await prisma.task.count({ where });
            return String(count);
          }
          return 'N/A';
        }
        case 'SINGLE_TASK_FIELD': {
          let taskWhere: any = { projectId };
          if (variableSource.entityId === 'prompt_for_task_id') {
              const anyTask = await prisma.task.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } });
              if (anyTask) taskWhere.id = anyTask.id;
              else return 'N/A (No tasks in project)';
          } else if (variableSource.entityId) {
              taskWhere.id = variableSource.entityId;
          } else {
              return 'N/A (Specific task ID or "prompt_for_task_id" expected)';
          }

          const task = await prisma.task.findUnique({
            where: taskWhere,
          });

          if (!task) return 'N/A (Task not found)';

          switch (variableSource.field) {
            case 'title': return task.title;
            case 'description': return task.description || 'N/A';
            default: return 'N/A';
          }
        }
        case 'SPRINT_FIELD':
        case 'SPRINT_AGGREGATION': {
            let sprintWhere: any = { projectId };
            if (variableSource.entityId === 'current_sprint') {
                sprintWhere.status = 'ACTIVE';
            } else if (variableSource.filter?.status) {
                sprintWhere.status = variableSource.filter.status;
            }

            if (variableSource.aggregation === 'LIST_NAMES') {
                const sprints = await prisma.sprint.findMany({
                    where: sprintWhere,
                    select: { name: true },
                    orderBy: { startDate: 'asc' },
                });
                const names = sprints.map(s => s.name).filter(Boolean);
                if (names.length === 0) return 'No sprints found';
                return variableSource.format === 'BULLET_POINTS' ? names.map(n => `• ${n}`).join('\n') : names.join(', ');
            } else { // Single field for SPRINT_FIELD
                const sprint = await prisma.sprint.findFirst({
                    where: sprintWhere,
                    orderBy: { startDate: 'desc' },
                });
                if (!sprint) return 'N/A (Sprint not found)';
                switch (variableSource.field) {
                    case 'name': return sprint.name;
                    case 'endDate': return sprint.endDate.toISOString().split('T')[0];
                    default: return 'N/A';
                }
            }
        }
        case 'DOCUMENT_FIELD':
        case 'DOCUMENT_AGGREGATION': {
            let documentWhere: any = { projectId };

            if (variableSource.aggregation === 'LIST_TITLES') {
                const documents = await prisma.document.findMany({
                    where: documentWhere,
                    select: { title: true },
                    orderBy: { updatedAt: 'desc' },
                });
                const titles = documents.map(d => d.title).filter(Boolean);
                if (titles.length === 0) return 'No documents found';
                return variableSource.format === 'BULLET_POINTS' ? titles.map(t => `• ${t}`).join('\n') : titles.join(', ');
            } else { // Single field for DOCUMENT_FIELD
                const document = await prisma.document.findFirst({
                    where: documentWhere,
                    orderBy: { updatedAt: 'desc' },
                });
                if (!document) return 'N/A (Document not found)';
                switch (variableSource.field) {
                    case 'title': return document.title;
                    case 'content': return JSON.stringify(document.content) || 'N/A';
                    default: return 'N/A';
                }
            }
        }
        case 'MEMBER_LIST': {
            const projectMembers = await prisma.projectMember.findMany({
                where: { projectId, ...variableSource.filter },
                include: { user: { select: { firstName: true, lastName: true } } },
                orderBy: { joinedAt: 'asc' },
            });
            const names = projectMembers.map(pm => `${pm.user.firstName || ''} ${pm.user.lastName || ''}`.trim()).filter(Boolean);
            if (names.length === 0) return 'No members found';
            return variableSource.format === 'COMMA_SEPARATED' ? names.join(', ') : names.map(n => `• ${n}`).join('\n');
        }
        case 'WORKSPACE_FIELD': {
            if (!project.workspace) return 'N/A (Workspace not found for this project)';
            switch (variableSource.field) {
                case 'name': return project.workspace.name;
                case 'industry': return project.workspace.industry || 'N/A';
                case 'teamSize': return project.workspace.teamSize || 'N/A';
                default: return 'N/A';
            }
        }
        default: return 'N/A (Unknown variable source type)';
      }
    },
  },

  Mutation: {
    createPrompt: async (
      _parent: any,
      { input }: { input: {
        projectId?: string;
        title: string;
        content?: ContentBlock[]; // Changed to ContentBlock[]
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
    ): Promise<PromptWithContentBlocks> => { // Changed return type
      // All user and project access checks removed.

      // Basic input validation remains for data integrity
      if (!input.title) {
        throw new Error("Prompt title is required.");
      }

      const newPromptData = {
        title: input.title,
        content: (input.content as any || []), // Cast to any to store as Json
        context: input.context || '',
        description: input.description,
        category: input.category,
        tags: input.tags || [],
        isPublic: input.isPublic || false,
        model: input.model || 'gpt-4o',
        userId: context.user?.id || 'anonymous', // Assign to current user if available, otherwise 'anonymous' (or handle as desired)
        projectId: input.projectId,
        variables: (input.variables || []).map(v => ({...v, id: v.id || generateUniqueId()})),
        versions: (input.versions || []).map(v => ({...v, id: v.id || generateUniqueId(), content: (v.content as any || [])})), // Handle content in versions
      };

      const newPrompt = await prisma.prompt.create({
        data: newPromptData,
      });

      const parsedPrompt: PromptWithContentBlocks = { // Parse content for return
        ...newPrompt,
        content: (newPrompt.content as ContentBlock[] || []),
        variables: (newPrompt.variables as PromptVariable[] || []).map(v => ({ ...v, id: v.id || generateUniqueId() })),
        versions: (newPrompt.versions as Array<Omit<Version, 'content'> & { content: ContentBlock[] }> || []).map(v => ({ 
            ...v, 
            id: v.id || generateUniqueId(),
            content: (v.content as ContentBlock[] || []) 
        })),
      };

      return parsedPrompt;
    },

    updatePrompt: async (
      _parent: any,
      { input }: { input: {
        id: string;
        title?: string;
        content?: ContentBlock[]; // Changed to ContentBlock[]
        context?: string;
        description?: string;
        category?: string;
        tags?: string[];
        isPublic?: boolean;
        model?: string;
        variables?: PromptVariable[];
      }},
      context: GraphQLContext
    ): Promise<PromptWithContentBlocks> => { // Changed return type
      // All user and project access checks removed.

      const existingPrompt = await prisma.prompt.findUnique({
        where: { id: input.id },
      });

      if (!existingPrompt) {
        throw new Error("Prompt not found."); // Keep this for data integrity, as we can't update a non-existent prompt.
      }

      const updateData: any = { updatedAt: new Date() };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = (input.content as any); // Cast to any to store as Json
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

      const parsedPrompt: PromptWithContentBlocks = { // Parse content for return
        ...updatedPrompt,
        content: (updatedPrompt.content as ContentBlock[] || []),
        variables: (updatedPrompt.variables as PromptVariable[] || []).map(v => ({ ...v, id: v.id || generateUniqueId() })),
        versions: (updatedPrompt.versions as Array<Omit<Version, 'content'> & { content: ContentBlock[] }> || []).map(v => ({ 
            ...v, 
            id: v.id || generateUniqueId(),
            content: (v.content as ContentBlock[] || []) 
        })),
      };

      return parsedPrompt;
    },

    deletePrompt: async (
      _parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<Prompt> => {
      // All user and project access checks removed.

      const existingPrompt = await prisma.prompt.findUnique({
        where: { id },
      });

      if (!existingPrompt) {
        throw new Error("Prompt not found."); // Keep for data integrity.
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
    ): Promise<PromptWithContentBlocks> => { // Changed return type
      // All user and project access checks removed.

      const prompt = await prisma.prompt.findUnique({
        where: { id: input.promptId },
      });

      if (!prompt) {
        throw new Error("Prompt not found."); // Keep for data integrity.
      }

      const currentContent = (prompt.content as ContentBlock[] || []); // Content is now array of ContentBlock
      const currentContext = prompt.context as string || '';
      const currentVariables = (prompt.variables as PromptVariable[]) || [];

      const newVersion: Omit<Version, 'content'> & { content: ContentBlock[] } = { // Explicitly type newVersion content
        id: generateUniqueId(),
        content: currentContent,
        context: currentContext,
        variables: currentVariables.map(v => ({ ...v, id: v.id || generateUniqueId() })),
        createdAt: new Date().toISOString(),
        notes: input.notes || `Version saved on ${new Date().toLocaleString()}`,
      };

      const updatedVersions = [newVersion, ...(prompt.versions as Array<Omit<Version, 'content'> & { content: ContentBlock[] }> || [])];

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.promptId },
        data: {
          versions: updatedVersions as any, // Cast to any to store as Json
          updatedAt: new Date(),
        },
      });

      const parsedPrompt: PromptWithContentBlocks = { // Parse content for return
        ...updatedPrompt,
        content: (updatedPrompt.content as ContentBlock[] || []),
        variables: (updatedPrompt.variables as PromptVariable[] || []).map(v => ({ ...v, id: v.id || generateUniqueId() })),
        versions: (updatedPrompt.versions as Array<Omit<Version, 'content'> & { content: ContentBlock[] }> || []).map(v => ({ 
            ...v, 
            id: v.id || generateUniqueId(),
            content: (v.content as ContentBlock[] || []) 
        })),
      };

      return parsedPrompt;
    },

    restorePromptVersion: async (
      _parent: any,
      { input }: { input: { promptId: string; versionId: string } },
      context: GraphQLContext
    ): Promise<PromptWithContentBlocks> => { // Changed return type
      // All user and project access checks removed.

      const prompt = await prisma.prompt.findUnique({
        where: { id: input.promptId },
      });

      if (!prompt) {
        throw new Error("Prompt not found."); // Keep for data integrity.
      }

      const versions = (prompt.versions as Array<Omit<Version, 'content'> & { content: ContentBlock[] }> || []);
      const versionToRestore = versions.find((v) => v.id === input.versionId);

      if (!versionToRestore) {
        throw new Error("Version not found."); // Keep for data integrity.
      }

      const updatedPrompt = await prisma.prompt.update({
        where: { id: input.promptId },
        data: {
          content: (versionToRestore.content as any), // Cast to any to store as Json
          context: versionToRestore.context,
          variables: versionToRestore.variables.map(v => ({ ...v, id: v.id || generateUniqueId() })),
          updatedAt: new Date(),
        },
      });

      const parsedPrompt: PromptWithContentBlocks = { // Parse content for return
        ...updatedPrompt,
        content: (updatedPrompt.content as ContentBlock[] || []),
        variables: (updatedPrompt.variables as PromptVariable[] || []).map(v => ({ ...v, id: v.id || generateUniqueId() })),
        versions: (updatedPrompt.versions as Array<Omit<Version, 'content'> & { content: ContentBlock[] }> || []).map(v => ({ 
            ...v, 
            id: v.id || generateUniqueId(),
            content: (v.content as ContentBlock[] || []) 
        })),
      };

      return parsedPrompt;
    },
  },
};

export default promptResolvers;