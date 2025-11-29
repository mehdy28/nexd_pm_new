// src/graphql/resolvers/promptVariableResolver.ts
import { prisma } from "@/lib/prisma";
import {
  PromptVariableSource,
  FormatType,
  FilterOperator,
  SpecialFilterValue
} from "../../components/prompt-lab/store"; 
import { UserRole } from "@prisma/client";

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: UserRole; firstName: string; lastName: string };
}

// Helper to safely parse JSON
function safeParseJson(jsonString: any): any {
  if (typeof jsonString === 'string') {
    try { return JSON.parse(jsonString); } catch (e) { return null; }
  }
  return jsonString;
}

// Helper: Check if a field exists in Prisma model definition
const VALID_FILTERS: Record<string, string[]> = {
    'TASK': ['id', 'status', 'priority', 'assigneeId', 'sprintId', 'points', 'dueDate', 'title'],
    'DOCUMENT': ['id', 'projectId', 'title', 'content'], 
    'SPRINT': ['id', 'status', 'name', 'goal', 'startDate', 'endDate'],
    'MEMBER': ['id', 'role'],
    'PROJECT': ['id', 'status', 'name', 'description', 'key'],
    'USER': ['id', 'email', 'firstName', 'lastName']
};

/**
 * Server-side parser for BlockNote Default Schema.
 * Handles: paragraph, heading, codeBlock, lists, tables, and media.
 */
function parseBlockNoteToMarkdown(content: any): string {
    if (!content) return '';

    // Handle double-encoded JSON strings
    if (typeof content === 'string') {
        if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(content);
                return parseBlockNoteToMarkdown(parsed);
            } catch {
                return content;
            }
        }
        return content;
    }

    if (!Array.isArray(content)) return '';

    return content.map((block: any) => {
        if (!block) return '';

        // Helper to extract text from InlineContent[]
        const getInlineText = (inlineContent: any): string => {
            if (!inlineContent) return '';
            if (typeof inlineContent === 'string') return inlineContent;
            if (Array.isArray(inlineContent)) {
                return inlineContent.map((item: any) => {
                    if (item.type === 'link') return item.href || item.text; 
                    return item.text || '';
                }).join('');
            }
            return '';
        };
        
        // --- 1. Handle Tables ---
        if (block.type === 'table') {
            const rows = block.content?.rows;
            if (Array.isArray(rows)) {
                return rows.map((row: any) => {
                    if (!row.cells) return '';
                    const cells = row.cells.map((cell: any) => {
                         return getInlineText(cell);
                    });
                    return `| ${cells.join(' | ')} |`;
                }).join('\n');
            }
            return '';
        }

        // --- 2. Handle Media ---
        if (['image', 'video', 'audio', 'file'].includes(block.type)) {
            const name = block.props?.name || block.props?.caption || block.type;
            const url = block.props?.url || '';
            return `[${block.type.toUpperCase()}: ${name}](${url})`;
        }

        // --- 3. Handle Standard Text Blocks ---
        const text = getInlineText(block.content);
        
        switch (block.type) {
            case 'heading':
                const level = block.props?.level || 1;
                return `${'#'.repeat(level)} ${text}`;
            
            case 'bulletListItem':
                return `• ${text}`;
            
            case 'numberedListItem':
                const start = block.props?.start || 1;
                return `${start}. ${text}`;
            
            case 'checkListItem':
                const checked = block.props?.checked ? '[x]' : '[ ]';
                return `${checked} ${text}`;
            
            case 'codeBlock':
                const lang = block.props?.language || '';
                return `\`\`\`${lang}\n${text}\n\`\`\``;
            
            case 'paragraph':
            default:
                return text;
        }
    })
    .filter(s => s !== '') 
    .join('\n\n'); 
}

const formatOutput = (values: any[], format: FormatType): string => {
  if (!values || values.length === 0) return '';
  const cleanValues = values.filter(v => v !== undefined && v !== null);
  if (cleanValues.length === 0) return '';

  switch (format) {
    case 'BULLET_POINTS': return cleanValues.map(v => `- ${v}`).join('\n');
    case 'COMMA_SEPARATED': return cleanValues.join(', ');
    case 'JSON_ARRAY': return JSON.stringify(cleanValues);
    case 'PLAIN_TEXT': default: return cleanValues.join('\n\n');
  }
};

const promptVariableResolver = {
  Query: {
    resolvePromptVariable: async (
      _parent: any,
      { projectId, workspaceId, variableSource, promptVariableId }: { projectId?: string; workspaceId?: string; variableSource: any; promptVariableId?: string },
      context: GraphQLContext
    ): Promise<string | null> => {
      if (!context.user) throw new Error("Authentication required.");

      const source: PromptVariableSource = safeParseJson(variableSource);
      if (!source || !source.entityType) return null;

      const effectiveFormat: FormatType = source.format || ('PLAIN_TEXT' as FormatType);

      try {
        // 1. Build Base WHERE
        let baseWhere: any = {};
        
        if (projectId) {
            // If querying the Project entity itself, use ID. For children, use projectId FK.
            if (source.entityType === 'PROJECT') {
                baseWhere.id = projectId;
            } else {
                baseWhere.projectId = projectId;
            }
        }
        
        if (source.entityType === 'WORKSPACE' && workspaceId) baseWhere.id = workspaceId;

        // 2. Build Dynamic Filters
        const allowedFields = VALID_FILTERS[source.entityType] || [];
        
        const filterWhere = (source.filters || [])
          .filter(f => allowedFields.includes(f.field)) 
          .reduce((acc: any, condition) => {
             let value: any = condition.value;

             if (condition.specialValue === SpecialFilterValue.CURRENT_USER) {
                 value = context.user!.id;
             } else if (condition.specialValue === SpecialFilterValue.ACTIVE_SPRINT) {
                 // Future: Async lookup for active sprint ID
                 return acc; 
             }

             let opClause: any = {};
             switch (condition.operator) {
                 case FilterOperator.EQ: opClause = value; break;
                 case FilterOperator.NEQ: opClause = { not: value }; break;
                 case FilterOperator.IN_LIST: opClause = { in: Array.isArray(value) ? value : [value] }; break;
                 case FilterOperator.GT: opClause = { gt: Number(value) }; break;
                 case FilterOperator.LT: opClause = { lt: Number(value) }; break;
             }
             
             if (Object.keys(opClause).length > 0 || typeof opClause !== 'object') {
                 acc[condition.field] = opClause;
             }
             return acc;
        }, {});

        const combinedWhere = { ...baseWhere, ...filterWhere };
        let result: any = null;

        // 3. Execution Logic
        switch (source.entityType) {
            case 'TASK': {
                 if (source.aggregation === 'COUNT') {
                     result = await prisma.task.count({ where: combinedWhere });
                 } else if (source.aggregation === 'SUM' && source.aggregationField) {
                     const agg = await prisma.task.aggregate({ _sum: { [source.aggregationField]: true }, where: combinedWhere });
                     result = agg._sum[source.aggregationField as 'points'];
                 } else if (source.field) {
                     const tasks = await prisma.task.findMany({
                         where: combinedWhere,
                         select: { [source.field]: true },
                         orderBy: { createdAt: 'desc' },
                         take: 50
                     });
                     const values = tasks.map((t: any) => t[source.field!]);
                     result = formatOutput(values, effectiveFormat);
                     return result; 
                 }
                 break;
            }

            case 'DOCUMENT': {
                if (source.field) {
                    const docs = await prisma.document.findMany({
                        where: combinedWhere,
                        select: { [source.field]: true },
                        orderBy: { updatedAt: 'desc' },
                        take: 50
                    });
                    
                    const values = docs.map((d: any) => {
                        const val = d[source.field!];
                        if (source.field === 'content') {
                            return parseBlockNoteToMarkdown(val);
                        }
                        return val;
                    });
                    
                    result = formatOutput(values, effectiveFormat);
                    return result;
                }
                break;
            }

            case 'MEMBER': {
                if (source.field) {
                     const isNested = source.field.includes('.');
                     const select = isNested ? { user: { select: { firstName: true, lastName: true, email: true } } } : { [source.field]: true };
                     
                     const members = await prisma.projectMember.findMany({
                         where: combinedWhere,
                         select: select as any,
                         take: 50
                     });

                     const values = members.map((m: any) => {
                         if (source.field === 'user.firstName') return m.user?.firstName;
                         if (source.field === 'user.lastName') return m.user?.lastName;
                         if (source.field === 'user.email') return m.user?.email;
                         return m[source.field!];
                     });
                     result = formatOutput(values, effectiveFormat);
                     return result;
                }
                break;
            }

            case 'USER': {
                // Returns data for the CURRENT authenticated user
                if (source.field) {
                    const currentUser = await prisma.user.findUnique({
                        where: { id: context.user.id }
                    });

                    if (!currentUser) return "";

                    const values = [currentUser].map((u: any) => {
                        // Handle Computed fields
                        if (source.field === 'fullName') return `${u.firstName || ''} ${u.lastName || ''}`.trim();
                        // Handle standard fields
                        return u[source.field!];
                    });

                    result = formatOutput(values, effectiveFormat);
                    return result;
                }
                break;
            }

            case 'PROJECT': {
                if (source.field) {
                    const projects = await prisma.project.findMany({
                        where: combinedWhere,
                        select: { [source.field]: true },
                        take: 1
                    });
                    const values = projects.map((p: any) => p[source.field!]);
                    result = formatOutput(values, effectiveFormat);
                    return result;
                }
                break;
            }

            case 'SPRINT': {
                if (source.field) {
                    const sprints = await prisma.sprint.findMany({
                        where: combinedWhere,
                        select: { [source.field]: true },
                        orderBy: { startDate: 'desc' },
                        take: 50
                    });
                    const values = sprints.map((s: any) => s[source.field!]);
                    result = formatOutput(values, effectiveFormat);
                    return result;
                }
                break;
            }
        }

        return String(result ?? "");

      } catch (error) {
        console.error("Resolve Error:", error);
        return `Error: ${(error as Error).message}`;
      }
    }
  }
};

export default promptVariableResolver;