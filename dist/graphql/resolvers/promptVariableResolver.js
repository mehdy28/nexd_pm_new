// src/graphql/resolvers/promptVariableResolver.ts
import { prisma } from "../../lib/prisma.js";
import { FilterOperator, SpecialFilterValue } from "../../components/prompt-lab/store.js";
// Helper to safely parse JSON
function safeParseJson(jsonString) {
    if (typeof jsonString === 'string') {
        try {
            // Handle potential double encoding
            const parsed = JSON.parse(jsonString);
            if (typeof parsed === 'string')
                return safeParseJson(parsed);
            return parsed;
        }
        catch (e) {
            return null;
        }
    }
    return jsonString;
}
// Helper: Check if a field exists in Prisma model definition
const VALID_FILTERS = {
    'TASK': ['id', 'status', 'priority', 'assigneeId', 'sprintId', 'points', 'endDate', 'title'],
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
function parseBlockNoteToMarkdown(content) {
    if (!content)
        return '';
    // Handle double-encoded JSON strings
    if (typeof content === 'string') {
        if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(content);
                return parseBlockNoteToMarkdown(parsed);
            }
            catch {
                return content;
            }
        }
        return content;
    }
    if (!Array.isArray(content))
        return '';
    return content.map((block) => {
        if (!block)
            return '';
        // Helper to extract text from InlineContent[]
        const getInlineText = (inlineContent) => {
            if (!inlineContent)
                return '';
            if (typeof inlineContent === 'string')
                return inlineContent;
            if (Array.isArray(inlineContent)) {
                return inlineContent.map((item) => {
                    if (item.type === 'link')
                        return item.href || item.text;
                    return item.text || '';
                }).join('');
            }
            return '';
        };
        // --- 1. Handle Tables ---
        if (block.type === 'table') {
            const rows = block.content?.rows;
            if (Array.isArray(rows)) {
                return rows.map((row) => {
                    if (!row.cells)
                        return '';
                    const cells = row.cells.map((cell) => {
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
const formatOutput = (values, format) => {
    if (!values || values.length === 0)
        return '';
    const cleanValues = values.filter(v => v !== undefined && v !== null);
    if (cleanValues.length === 0)
        return '';
    switch (format) {
        case 'BULLET_POINTS': return cleanValues.map(v => `- ${v}`).join('\n');
        case 'COMMA_SEPARATED': return cleanValues.join(', ');
        case 'JSON_ARRAY': return JSON.stringify(cleanValues);
        case 'PLAIN_TEXT':
        default: return cleanValues.join('\n\n');
    }
};
const promptVariableResolver = {
    Query: {
        resolvePromptVariable: async (_parent, { projectId, workspaceId, variableSource, promptVariableId }, context) => {
            if (!context.user)
                throw new Error("Authentication required.");
            const source = safeParseJson(variableSource);
            if (!source || !source.entityType)
                return null;
            const effectiveFormat = source.format || 'PLAIN_TEXT';
            try {
                // 1. Build Base WHERE
                let baseWhere = {};
                if (projectId) {
                    // If querying the Project entity itself, use ID. For children, use projectId FK.
                    if (source.entityType === 'PROJECT') {
                        baseWhere.id = projectId;
                    }
                    else {
                        baseWhere.projectId = projectId;
                    }
                }
                if (source.entityType === 'WORKSPACE' && workspaceId)
                    baseWhere.id = workspaceId;
                // 2. Build Dynamic Filters
                const allowedFields = VALID_FILTERS[source.entityType] || [];
                const filterWhere = (source.filters || [])
                    .filter(f => allowedFields.includes(f.field))
                    .reduce((acc, condition) => {
                    let value = condition.value;
                    // Handle Special Values
                    if (condition.specialValue === SpecialFilterValue.CURRENT_USER) {
                        value = context.user.id;
                    }
                    else if (condition.specialValue === SpecialFilterValue.TODAY || condition.specialValue === SpecialFilterValue.NOW) {
                        // Use ISO string to ensure consistent comparison across Date and String fields in DB
                        // and prevent implicit string conversion issues (e.g. "Fri Nov..." > "2025...")
                        value = new Date().toISOString();
                    }
                    else if (condition.specialValue === SpecialFilterValue.ACTIVE_SPRINT) {
                        // Future: Async lookup for active sprint ID
                        return acc;
                    }
                    let opClause = {};
                    switch (condition.operator) {
                        case FilterOperator.EQ:
                            opClause = value;
                            break;
                        case FilterOperator.NEQ:
                            opClause = { not: value };
                            break;
                        case FilterOperator.IN_LIST:
                            opClause = { in: Array.isArray(value) ? value : [value] };
                            break;
                        case FilterOperator.GT:
                            // Handle Dates vs Numbers
                            if (value instanceof Date) {
                                opClause = { gt: value };
                            }
                            else if (typeof value === 'string' && !isNaN(Date.parse(value)) && isNaN(Number(value))) {
                                // It is a valid Date string but NOT a number string
                                opClause = { gt: value };
                            }
                            else if (typeof value === 'string' && isNaN(Number(value))) {
                                // It is a string, not a date, not a number
                                opClause = { gt: value };
                            }
                            else {
                                opClause = { gt: Number(value) };
                            }
                            break;
                        case FilterOperator.LT:
                            if (value instanceof Date) {
                                opClause = { lt: value };
                            }
                            else if (typeof value === 'string' && !isNaN(Date.parse(value)) && isNaN(Number(value))) {
                                opClause = { lt: value };
                            }
                            else if (typeof value === 'string' && isNaN(Number(value))) {
                                opClause = { lt: value };
                            }
                            else {
                                opClause = { lt: Number(value) };
                            }
                            break;
                    }
                    if (Object.keys(opClause).length > 0 || typeof opClause !== 'object') {
                        // Merge Logic: If field already exists (e.g. range query), merge properties
                        if (acc[condition.field] && typeof acc[condition.field] === 'object' && typeof opClause === 'object') {
                            acc[condition.field] = { ...acc[condition.field], ...opClause };
                        }
                        else {
                            acc[condition.field] = opClause;
                        }
                    }
                    return acc;
                }, {});
                const combinedWhere = { ...baseWhere, ...filterWhere };
                let result = null;
                // Helper: Determine target field (Field property OR AggregationField property)
                const getTargetField = () => source.field || (source.aggregation === 'LIST_FIELD_VALUES' ? source.aggregationField : null);
                // 3. Execution Logic
                switch (source.entityType) {
                    case 'TASK': {
                        if (source.aggregation === 'COUNT') {
                            result = await prisma.task.count({ where: combinedWhere });
                        }
                        else if (source.aggregation === 'SUM' && source.aggregationField) {
                            const agg = await prisma.task.aggregate({ _sum: { [source.aggregationField]: true }, where: combinedWhere });
                            result = agg._sum[source.aggregationField];
                        }
                        else {
                            // Handle standard fetch OR List Aggregation
                            const targetField = getTargetField();
                            if (targetField) {
                                const tasks = await prisma.task.findMany({
                                    where: combinedWhere,
                                    select: { [targetField]: true },
                                    orderBy: { createdAt: 'desc' },
                                    take: 50
                                });
                                const values = tasks.map((t) => t[targetField]);
                                result = formatOutput(values, effectiveFormat);
                                return result;
                            }
                        }
                        break;
                    }
                    case 'DOCUMENT': {
                        const targetField = getTargetField();
                        if (targetField) {
                            const docs = await prisma.document.findMany({
                                where: combinedWhere,
                                select: { [targetField]: true },
                                orderBy: { updatedAt: 'desc' },
                                take: 50
                            });
                            const values = docs.map((d) => {
                                const val = d[targetField];
                                if (targetField === 'content') {
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
                        const targetField = getTargetField();
                        if (targetField) {
                            const isNested = targetField.includes('.');
                            const select = isNested ? { user: { select: { firstName: true, lastName: true, email: true } } } : { [targetField]: true };
                            const members = await prisma.projectMember.findMany({
                                where: combinedWhere,
                                select: select,
                                take: 50
                            });
                            const values = members.map((m) => {
                                if (targetField === 'user.firstName')
                                    return m.user?.firstName;
                                if (targetField === 'user.lastName')
                                    return m.user?.lastName;
                                if (targetField === 'user.email')
                                    return m.user?.email;
                                return m[targetField];
                            });
                            result = formatOutput(values, effectiveFormat);
                            return result;
                        }
                        break;
                    }
                    case 'USER': {
                        // Returns data for the CURRENT authenticated user
                        const targetField = getTargetField();
                        if (targetField) {
                            const currentUser = await prisma.user.findUnique({
                                where: { id: context.user.id }
                            });
                            if (!currentUser)
                                return "";
                            const values = [currentUser].map((u) => {
                                // Handle Computed fields
                                if (targetField === 'fullName')
                                    return `${u.firstName || ''} ${u.lastName || ''}`.trim();
                                // Handle standard fields
                                return u[targetField];
                            });
                            result = formatOutput(values, effectiveFormat);
                            return result;
                        }
                        break;
                    }
                    case 'PROJECT': {
                        const targetField = getTargetField();
                        if (targetField) {
                            const projects = await prisma.project.findMany({
                                where: combinedWhere,
                                select: { [targetField]: true },
                                take: 1
                            });
                            const values = projects.map((p) => p[targetField]);
                            result = formatOutput(values, effectiveFormat);
                            return result;
                        }
                        break;
                    }
                    case 'SPRINT': {
                        const targetField = getTargetField();
                        if (targetField) {
                            const sprints = await prisma.sprint.findMany({
                                where: combinedWhere,
                                select: { [targetField]: true },
                                orderBy: { startDate: 'desc' },
                                take: 50
                            });
                            const values = sprints.map((s) => s[targetField]);
                            result = formatOutput(values, effectiveFormat);
                            return result;
                        }
                        break;
                    }
                }
                return String(result ?? "");
            }
            catch (error) {
                console.error("Resolve Error:", error);
                return `Error: ${error.message}`;
            }
        }
    }
};
export default promptVariableResolver;
