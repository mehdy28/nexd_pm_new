// src/graphql/resolvers/promptVariableResolver.ts
import { prisma } from "@/lib/prisma";
import {
  PromptVariableSource,
  PromptVariableType,
  AggregationType,
  FormatType,
  FilterCondition,
  FilterOperator,
  PromptVariable
} from "../../components/prompt-lab/store"; // Assuming store.ts is created at this path
import { UserRole } from "@prisma/client";

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: UserRole };
}

// Helper to safely parse JSON
function safeParseJson(jsonString: any): any {
  if (typeof jsonString === 'string') {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON string:", e);
      return null;
    }
  }
  return jsonString; // Already an object
}

// Helper to convert Prisma Enum values to expected string values
const mapPrismaEnumToString = (enumValue: any) => {
    if (typeof enumValue === 'string') {
        return enumValue.replace(/_/g, ' '); // Convert 'FINISH_TO_START' to 'FINISH TO START'
    }
    return enumValue;
};


// Helper to format results
const formatOutput = (values: any[], format: FormatType, fieldPath: string | null): string => {
  if (!values || values.length === 0) return '';

  const extractedValues = values.map(item => {
    if (!fieldPath) return item; // For count/sum, values are already numbers

    // Handle nested field paths like 'user.firstName'
    let value = item;
    const pathParts = fieldPath.split('.');
    for (const part of pathParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        value = undefined; // Path not found
        break;
      }
    }
    return value;
  }).filter(v => v !== undefined && v !== null); // Filter out undefined/null results

  if (extractedValues.length === 0) return '';


  switch (format) {
    case 'BULLET_POINTS':
      return extractedValues.map(v => `- ${v}`).join('\n');
    case 'COMMA_SEPARATED':
      return extractedValues.join(', ');
    case 'PLAIN_TEXT':
      return extractedValues.join('\n');
    default:
      return String(values); // Fallback for single values or unhandled formats
  }
};

const promptVariableResolver = {
  Query: {
    resolvePromptVariable: async (
      _parent: any,
      { projectId, workspaceId, variableSource, promptVariableId }: { projectId?: string; workspaceId?: string; variableSource: any; promptVariableId?: string },
      context: GraphQLContext
    ): Promise<string | null> => {
      if (!context.user) {
        throw new Error("Authentication required.");
      }

      const source: PromptVariableSource = safeParseJson(variableSource);

      if (!source || !source.entityType) {
        console.warn("Invalid variableSource provided:", variableSource);
        return null;
      }

      // Default format if not provided, especially for LIST_OF_STRINGS
      const effectiveFormat: FormatType = source.format || 'PLAIN_TEXT';

      try {
        let result: any = null;

        // Apply global project/workspace ID filters if present
        let baseWhere: any = {};
        if (projectId) {
            baseWhere.projectId = projectId;
        }
        // NOTE: Workspace context for entities like USER or global tasks
        // will require more complex logic. For now, prioritize projectId.
        // If entity is WORKSPACE itself, use workspaceId.
        if (source.entityType === 'WORKSPACE' && workspaceId) {
            baseWhere.id = workspaceId; // Filtering the workspace itself
        }

        // Apply dynamic filters
        const processFilterConditions = (conditions: FilterCondition[] | undefined): any => {
            if (!conditions || conditions.length === 0) return {};
            return {
                AND: conditions.map(condition => {
                    let value: any = condition.value;
                    if (condition.specialValue === 'CURRENT_USER_ID') {
                        value = context.user!.id;
                    } else if (condition.specialValue === 'ACTIVE_SPRINT') {
                        // Special handling for active sprint is more complex.
                        // Assuming status='ACTIVE' is sufficient for a simplified filter.
                        value = 'ACTIVE'; // Actual logic might involve date comparisons
                    }
                    // Type conversion for dates, numbers etc.
                    if (condition.type === PromptVariableType.DATE && typeof value === 'string') {
                      value = new Date(value);
                    } else if (condition.type === PromptVariableType.NUMBER && typeof value === 'string') {
                      value = parseFloat(value);
                    } else if (condition.type === PromptVariableType.BOOLEAN && typeof value === 'string') {
                      value = value.toLowerCase() === 'true';
                    }

                    switch (condition.operator) {
                        case 'EQ': return { [condition.field]: value };
                        case 'NEQ': return { [condition.field]: { not: value } };
                        case 'CONTAINS': return { [condition.field]: { contains: value, mode: 'insensitive' } };
                        case 'STARTS_WITH': return { [condition.field]: { startsWith: value, mode: 'insensitive' } };
                        case 'ENDS_WITH': return { [condition.field]: { endsWith: value, mode: 'insensitive' } };
                        case 'GT': return { [condition.field]: { gt: value } };
                        case 'GTE': return { [condition.field]: { gte: value } };
                        case 'LT': return { [condition.field]: { lt: value } };
                        case 'LTE': return { [condition.field]: { lte: value } };
                        case 'IN': return { [condition.field]: { in: Array.isArray(value) ? value : [value] } };
                        case 'NOT_IN': return { [condition.field]: { notIn: Array.isArray(value) ? value : [value] } };
                        default: return {};
                    }
                })
            };
        };

        const filterWhere = processFilterConditions(source.filters);
        const combinedWhere = { ...baseWhere, ...filterWhere };


        switch (source.entityType) {
          case 'PROJECT':
            if (!projectId) {
                throw new Error("Project ID is required for Project entity type.");
            }
            const project = await prisma.project.findUnique({
              where: { id: projectId },
              select: {
                name: true,
                description: true,
                status: true,
                color: true,
                startDate: true,
                endDate: true,
              },
            });
            if (project && source.field) {
              result = project[source.field as keyof typeof project];
              if (result instanceof Date) result = result.toISOString().split('T')[0];
              if (typeof result === 'string') result = mapPrismaEnumToString(result);
            }
            break;

          case 'TASK':
            if (!projectId) {
                throw new Error("Project ID is required for Task entity type.");
            }
            const taskSelect: any = {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                dueDate: true,
                startDate: true,
                endDate: true,
                completed: true,
                points: true,
                completionPercentage: true,
                assignee: { select: { firstName: true, lastName: true, email: true } },
                creator: { select: { firstName: true, lastName: true, email: true } },
            };

            if (source.aggregation) {
              const aggregationField = source.aggregationField;
              const countWhere = { ...combinedWhere };
              if (source.aggregation === 'COUNT') {
                result = await prisma.task.count({ where: countWhere });
              } else if (aggregationField) {
                const aggregateResult = await prisma.task.aggregate({
                  _sum: aggregationField === 'points' ? { points: true } : undefined,
                  _avg: aggregationField === 'points' ? { points: true } : undefined,
                  where: combinedWhere,
                });
                if (source.aggregation === 'SUM') result = aggregateResult._sum?.[aggregationField as 'points'];
                if (source.aggregation === 'AVERAGE') result = aggregateResult._avg?.[aggregationField as 'points'];

                if (source.aggregation === 'LIST_FIELD_VALUES') {
                    const tasks = await prisma.task.findMany({
                        where: combinedWhere,
                        select: { [aggregationField]: true },
                        orderBy: { createdAt: 'desc' },
                        take: 100, // Limit list length
                    });
                    result = formatOutput(tasks, effectiveFormat, aggregationField);
                } else if (source.aggregation === 'LAST_UPDATED_FIELD_VALUE') {
                    const latestTask = await prisma.task.findFirst({
                        where: combinedWhere,
                        orderBy: { updatedAt: 'desc' },
                        select: { [aggregationField]: true },
                    });
                    result = latestTask ? latestTask[aggregationField as keyof typeof latestTask] : null;
                }
              }
            } else if (source.field) {
                const tasks = await prisma.task.findMany({
                    where: combinedWhere,
                    select: taskSelect,
                    orderBy: { createdAt: 'desc' }, // Order by latest to get a "representative" task if many match
                    take: 1, // Only take one if a single field is requested
                });
                if (tasks.length > 0) {
                    let fieldValue = tasks[0];
                    const pathParts = source.field.split('.');
                    for (const part of pathParts) {
                        if (fieldValue && typeof fieldValue === 'object' && part in fieldValue) {
                            fieldValue = fieldValue[part as keyof typeof fieldValue];
                        } else {
                            fieldValue = undefined;
                            break;
                        }
                    }
                    result = fieldValue;
                    if (result instanceof Date) result = result.toISOString().split('T')[0];
                    if (typeof result === 'string') result = mapPrismaEnumToString(result);
                }
            }
            break;

          case 'SPRINT':
            if (!projectId) {
                throw new Error("Project ID is required for Sprint entity type.");
            }
            const sprintSelect: any = {
                id: true,
                name: true,
                description: true,
                startDate: true,
                endDate: true,
                isCompleted: true,
                status: true,
            };

            if (source.aggregation) {
                const aggregationField = source.aggregationField;
                if (source.aggregation === 'COUNT') {
                    result = await prisma.sprint.count({ where: combinedWhere });
                } else if (source.aggregation === 'LIST_FIELD_VALUES' && aggregationField) {
                    const sprints = await prisma.sprint.findMany({
                        where: combinedWhere,
                        select: { [aggregationField]: true },
                        orderBy: { startDate: 'desc' },
                        take: 50,
                    });
                    result = formatOutput(sprints, effectiveFormat, aggregationField);
                } else if (source.aggregation === 'LAST_UPDATED_FIELD_VALUE' && aggregationField) {
                    const latestSprint = await prisma.sprint.findFirst({
                        where: combinedWhere,
                        orderBy: { updatedAt: 'desc' },
                        select: { [aggregationField]: true },
                    });
                    result = latestSprint ? latestSprint[aggregationField as keyof typeof latestSprint] : null;
                }
            } else if (source.field) {
                const sprints = await prisma.sprint.findMany({ // findMany to allow for filters to return multiple
                    where: combinedWhere,
                    select: sprintSelect,
                    orderBy: { startDate: 'desc' },
                    take: 1, // Take one if a single field
                });
                if (sprints.length > 0) {
                    result = sprints[0][source.field as keyof typeof sprints[0]];
                    if (result instanceof Date) result = result.toISOString().split('T')[0];
                    if (typeof result === 'string') result = mapPrismaEnumToString(result);
                }
            }
            break;

          case 'DOCUMENT':
            if (!projectId) {
                throw new Error("Project ID is required for Document entity type.");
            }
            const documentSelect: any = {
                id: true,
                title: true,
                content: true,
                dataUrl: true,
            };

            if (source.aggregation) {
                const aggregationField = source.aggregationField;
                if (source.aggregation === 'COUNT') {
                    result = await prisma.document.count({ where: combinedWhere });
                } else if (source.aggregation === 'LIST_FIELD_VALUES' && aggregationField) {
                    const documents = await prisma.document.findMany({
                        where: combinedWhere,
                        select: { [aggregationField]: true },
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                    });
                    result = formatOutput(documents, effectiveFormat, aggregationField);
                } else if (source.aggregation === 'LAST_UPDATED_FIELD_VALUE' && aggregationField) {
                    const latestDocument = await prisma.document.findFirst({
                        where: combinedWhere,
                        orderBy: { updatedAt: 'desc' },
                        select: { [aggregationField]: true },
                    });
                    result = latestDocument ? latestDocument[aggregationField as keyof typeof latestDocument] : null;
                }
            } else if (source.field) {
                const documents = await prisma.document.findMany({
                    where: combinedWhere,
                    select: documentSelect,
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                });
                if (documents.length > 0) {
                    result = documents[0][source.field as keyof typeof documents[0]];
                    if (result instanceof Date) result = result.toISOString().split('T')[0];
                }
            }
            break;

          case 'MEMBER': // Project Members
            if (!projectId) {
                throw new Error("Project ID is required for Member entity type.");
            }
            const memberSelect: any = {
                id: true,
                role: true,
                user: { select: { firstName: true, lastName: true, email: true } },
            };
            // Note: ProjectMember model doesn't have `updatedAt` for LAST_UPDATED_FIELD_VALUE
            // For now, we'll just handle COUNT and LIST_FIELD_VALUES

            if (source.aggregation) {
                const aggregationField = source.aggregationField;
                if (source.aggregation === 'COUNT') {
                    result = await prisma.projectMember.count({ where: combinedWhere });
                } else if (source.aggregation === 'LIST_FIELD_VALUES' && aggregationField) {
                    const members = await prisma.projectMember.findMany({
                        where: combinedWhere,
                        select: memberSelect, // Need to select entire user object to get nested fields
                        orderBy: { joinedAt: 'asc' },
                        take: 50,
                    });
                    // Special handling for 'user.fullName' as it's not a direct field
                    if (aggregationField === 'user.fullName') {
                        result = formatOutput(
                            members.map(m => m.user ? `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim() : null),
                            effectiveFormat,
                            null // Field already extracted
                        );
                    } else {
                        result = formatOutput(members, effectiveFormat, aggregationField);
                    }
                }
            } else if (source.field) {
                const members = await prisma.projectMember.findMany({
                    where: combinedWhere,
                    select: memberSelect,
                    orderBy: { joinedAt: 'asc' },
                    take: 1,
                });
                if (members.length > 0) {
                    let fieldValue = members[0];
                    const pathParts = source.field.split('.');
                    for (const part of pathParts) {
                        if (fieldValue && typeof fieldValue === 'object' && part in fieldValue) {
                            fieldValue = fieldValue[part as keyof typeof fieldValue];
                        } else {
                            fieldValue = undefined;
                            break;
                        }
                    }
                    result = fieldValue;
                    if (typeof result === 'string') result = mapPrismaEnumToString(result);
                }
            }
            break;

          case 'WORKSPACE':
            if (!workspaceId) {
                // Try to derive workspaceId from projectId if available
                if (projectId) {
                    const project = await prisma.project.findUnique({
                        where: { id: projectId },
                        select: { workspaceId: true }
                    });
                    if (project) workspaceId = project.workspaceId;
                }
            }
            if (!workspaceId) {
                throw new Error("Workspace ID is required for Workspace entity type.");
            }
            const workspace = await prisma.workspace.findUnique({
              where: { id: workspaceId },
              select: {
                name: true,
                description: true,
                industry: true,
                teamSize: true,
                workFields: true,
                owner: { select: { firstName: true, lastName: true, email: true } },
              },
            });
            if (workspace && source.field) {
                let fieldValue = workspace;
                const pathParts = source.field.split('.');
                for (const part of pathParts) {
                    if (fieldValue && typeof fieldValue === 'object' && part in fieldValue) {
                        fieldValue = fieldValue[part as keyof typeof fieldValue];
                    } else {
                        fieldValue = undefined;
                        break;
                    }
                }
                result = fieldValue;
                if (typeof result === 'string') result = mapPrismaEnumToString(result);
            }
            break;

          case 'USER': // Current User
            if (context.user && source.field) {
                if (source.field === 'firstName') result = context.user.firstName;
                if (source.field === 'lastName') result = context.user.lastName;
                if (source.field === 'email') result = context.user.email;
                if (source.field === 'role') result = context.user.role;
            }
            break;

          case 'DATE_FUNCTION':
            if (source.field === 'today') {
              result = new Date().toISOString().split('T')[0];
            }
            break;

          default:
            return null;
        }

        if (result === undefined || result === null) {
            // Check if there's a promptVariableId and fetch its defaultValue if result is null
            if (promptVariableId) {
                const existingPrompt = await prisma.prompt.findUnique({
                    where: { id: promptVariableId },
                    select: { variables: true }
                });
                const promptVariables = safeParseJson(existingPrompt?.variables) as PromptVariable[];
                const targetVariable = promptVariables?.find(v => v.id === promptVariableId);
                if (targetVariable?.defaultValue) {
                    return targetVariable.defaultValue;
                }
            }
            return null; // Explicitly return null if no result and no default
        }


        // Ensure result is stringified for GraphQL scalar
        if (Array.isArray(result) && effectiveFormat === 'PLAIN_TEXT') {
            return result.join('\n');
        }
        return String(result);

      } catch (error) {
        console.error("Error resolving prompt variable:", error);
        // In a production environment, you might want to return a more generic error message
        // or log the detailed error without exposing it directly to the client.
        throw new Error(`Failed to resolve variable: ${(error as Error).message}`);
      }
    },
  },
};

export default promptVariableResolver;