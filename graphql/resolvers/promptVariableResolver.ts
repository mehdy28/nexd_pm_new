// src/graphql/resolvers/promptVariableResolver.ts
import { prisma } from "@/lib/prisma";
import {
  PromptVariableSource,
  PromptVariableType,
  AggregationType,
  FormatType,
  FilterCondition,
  FilterOperator,
  PromptVariable,
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

// Helper: Check if a field exists in Prisma model definition (Simple heuristic)
// In a real app, you might use DMMF or explicit allowlists. 
// Here we define allowlists for safety and to prevent crashing on invalid filters.
const VALID_FILTERS: Record<string, string[]> = {
    'TASK': ['id', 'status', 'priority', 'assigneeId', 'sprintId', 'points', 'dueDate'],
    'DOCUMENT': ['id', 'projectId'], // Documents don't have status/assignee
    'SPRINT': ['id', 'status'],
    'MEMBER': ['id', 'role'],
    'PROJECT': ['id', 'status']
};

const formatOutput = (values: any[], format: FormatType): string => {
  if (!values || values.length === 0) return '';
  const cleanValues = values.filter(v => v !== undefined && v !== null);
  if (cleanValues.length === 0) return '';

  switch (format) {
    case 'BULLET_POINTS': return cleanValues.map(v => `- ${v}`).join('\n');
    case 'COMMA_SEPARATED': return cleanValues.join(', ');
    case 'JSON_ARRAY': return JSON.stringify(cleanValues);
    case 'PLAIN_TEXT': default: return cleanValues.join('\n');
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

      const effectiveFormat: FormatType = source.format || 'BULLET_POINTS';

      try {
        // 1. Build Base WHERE
        let baseWhere: any = {};
        if (projectId) baseWhere.projectId = projectId;
        if (source.entityType === 'WORKSPACE' && workspaceId) baseWhere.id = workspaceId;

        // 2. Build Dynamic Filters (Safely)
        const allowedFields = VALID_FILTERS[source.entityType] || [];
        
        const filterWhere = (source.filters || [])
          .filter(f => allowedFields.includes(f.field)) // CRITICAL: Ignore invalid fields for this entity
          .reduce((acc: any, condition) => {
             let value: any = condition.value;

             // Resolve Special Values
             if (condition.specialValue === SpecialFilterValue.CURRENT_USER) {
                 value = context.user!.id;
             } else if (condition.specialValue === SpecialFilterValue.ACTIVE_SPRINT) {
                 // Active Sprint Logic: We assume the frontend passes ID or we treat "Active" status
                 // For complex resolution, we might need a separate query, but usually 'IN_PROGRESS' status works
                 // Here we simplify by assuming value is handled or ignored if complex
                 return acc; 
             }

             // Handle Operators
             let opClause: any = {};
             switch (condition.operator) {
                 case FilterOperator.EQ: opClause = value; break;
                 case FilterOperator.NEQ: opClause = { not: value }; break;
                 case FilterOperator.IN_LIST: opClause = { in: Array.isArray(value) ? value : [value] }; break;
                 case FilterOperator.GT: opClause = { gt: Number(value) }; break;
                 case FilterOperator.LT: opClause = { lt: Number(value) }; break;
                 // Add others as needed
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
                     // LIST LOGIC (Fixing the "take: 1" issue)
                     const tasks = await prisma.task.findMany({
                         where: combinedWhere,
                         select: { [source.field]: true }, // Select dynamic field
                         orderBy: { createdAt: 'desc' },
                         take: 50
                     });
                     // Map to simple array of values
                     const values = tasks.map((t: any) => t[source.field!]);
                     result = formatOutput(values, effectiveFormat);
                     // If it's a formatted string, return immediately to skip default stringification
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
                    const values = docs.map((d: any) => d[source.field!]);
                    result = formatOutput(values, effectiveFormat);
                    return result;
                }
                break;
            }

            case 'MEMBER': {
                if (source.field) {
                     // Special handling for nested 'user.firstName'
                     const isNested = source.field.includes('.');
                     const select = isNested ? { user: { select: { firstName: true, lastName: true, email: true } } } : { [source.field]: true };
                     
                     const members = await prisma.projectMember.findMany({
                         where: combinedWhere,
                         select: select as any,
                         take: 50
                     });

                     const values = members.map((m: any) => {
                         if (source.field === 'user.firstName') return m.user?.firstName;
                         if (source.field === 'user.email') return m.user?.email;
                         return m[source.field!];
                     });
                     result = formatOutput(values, effectiveFormat);
                     return result;
                }
                break;
            }
            // ... Add other cases (SPRINT, PROJECT) following the same pattern
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