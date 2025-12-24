import { prisma } from "../../lib/prisma.js";
const getFullPrompt = async (promptId) => {
    const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        include: {
            versions: {
                orderBy: { createdAt: "desc" },
                include: {
                    content: { orderBy: { order: "asc" } },
                    variables: true,
                },
            },
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
// --- FIX START: Updated function to process an array of filters ---
function buildPrismaWhereClause(sourceFilters, projectId, currentUserId, entityType) {
    const where = {};
    const andConditions = [];
    if (entityType !== "USER" && entityType !== "DATE_FUNCTION" && projectId) {
        where.projectId = projectId;
    }
    else if (entityType === "USER") {
        where.id = currentUserId;
    }
    if (sourceFilters && sourceFilters.length > 0) {
        sourceFilters.forEach(filter => {
            const condition = {};
            let value = filter.value;
            // Handle special dynamic values
            if (filter.specialValue === "CURRENT_USER_ID" || filter.specialValue === "CURRENT_USER") {
                value = currentUserId;
            }
            else if (filter.specialValue === "CURRENT_PROJECT_ID") {
                value = projectId;
            }
            else if (filter.specialValue === "ACTIVE_SPRINT") {
                andConditions.push({ status: "ACTIVE" });
                return; // Continue to next filter
            }
            else if (filter.specialValue === "TODAY") {
                value = new Date();
            }
            if (["status", "priority", "role"].includes(filter.field) && typeof value === "string") {
                value = value.toUpperCase();
            }
            let prismaOperator;
            switch (filter.operator) {
                case "EQ":
                    prismaOperator = value;
                    break;
                case "NEQ":
                    prismaOperator = { not: value };
                    break;
                case "GT":
                    prismaOperator = { gt: value };
                    break;
                case "LT":
                    prismaOperator = { lt: value };
                    break;
                case "GTE":
                    prismaOperator = { gte: value };
                    break;
                case "LTE":
                    prismaOperator = { lte: value };
                    break;
                case "CONTAINS":
                    prismaOperator = { contains: value, mode: "insensitive" };
                    break;
                case "STARTS_WITH":
                    prismaOperator = { startsWith: value, mode: "insensitive" };
                    break;
                case "ENDS_WITH":
                    prismaOperator = { endsWith: value, mode: "insensitive" };
                    break;
                case "IN_LIST":
                    prismaOperator = { in: value };
                    break;
                default:
                    break;
            }
            if (prismaOperator !== undefined) {
                condition[filter.field] = prismaOperator;
                andConditions.push(condition);
            }
        });
    }
    if (andConditions.length > 0) {
        where.AND = andConditions;
    }
    return where;
}
// --- FIX END ---
function extractFieldValue(record, fieldPath) {
    if (!record || !fieldPath)
        return undefined;
    const value = fieldPath.split(".").reduce((obj, key) => (obj && typeof obj === "object" ? obj[key] : undefined), record);
    if (typeof value === "object" && value !== null) {
        return JSON.stringify(value, null, 2);
    }
    return value;
}
async function applyAggregation(records, source, context) {
    const { aggregation, aggregationField, format } = source;
    if (records.length === 0)
        return "No data found";
    switch (aggregation) {
        case "COUNT":
            return String(records.length);
        case "SUM":
        case "AVERAGE": {
            if (!aggregationField)
                return "N/A (Aggregation field not specified)";
            const values = records.map(r => Number(extractFieldValue(r, aggregationField))).filter(v => !isNaN(v));
            if (values.length === 0)
                return "N/A (No numeric data to aggregate)";
            const sum = values.reduce((acc, val) => acc + val, 0);
            return aggregation === "SUM" ? String(sum) : String(sum / values.length);
        }
        case "LIST_FIELD_VALUES": {
            if (!aggregationField)
                return "N/A (Aggregation field not specified)";
            const values = records.map(r => extractFieldValue(r, aggregationField)).filter(Boolean);
            if (values.length === 0)
                return "No data found";
            switch (format) {
                case "BULLET_POINTS":
                    return values.map(v => `• ${v}`).join("\n");
                case "COMMA_SEPARATED":
                    return values.join(", ");
                case "PLAIN_TEXT":
                    return values.join("\n");
                case "JSON_ARRAY":
                    return JSON.stringify(values);
                default:
                    return values.join("\n");
            }
        }
        case "LAST_UPDATED_FIELD_VALUE":
        case "FIRST_CREATED_FIELD_VALUE": {
            if (!aggregationField)
                return "N/A (Aggregation field not specified)";
            const record = aggregation === "LAST_UPDATED_FIELD_VALUE" ? records[0] : records[records.length - 1];
            const value = extractFieldValue(record, aggregationField);
            return value !== undefined ? String(value) : "N/A";
        }
        default:
            return "N/A (Unsupported aggregation)";
    }
}
const promptResolvers = {
    Query: {
        getProjectPrompts: async (_parent, { projectId, skip = 0, take = 10, q }, context) => {
            let finalWhereClause = {};
            if (projectId) {
                finalWhereClause = { projectId };
            }
            else {
                finalWhereClause = {
                    AND: [{ projectId: null }, { userId: context.user?.id || "" }],
                };
            }
            if (q && q.trim() !== "") {
                finalWhereClause.title = {
                    contains: q,
                    mode: "insensitive",
                };
            }
            const [prompts, totalCount] = await prisma.$transaction([
                prisma.prompt.findMany({
                    where: finalWhereClause,
                    orderBy: { updatedAt: "desc" },
                    skip,
                    take,
                }),
                prisma.prompt.count({ where: finalWhereClause }),
            ]);
            return { prompts: prompts, totalCount };
        },
        getPromptDetails: async (_parent, { id }, context) => {
            const prompt = await prisma.prompt.findUnique({
                where: { id },
                include: {
                    versions: {
                        include: {
                            content: { orderBy: { order: "asc" } },
                            variables: true,
                        },
                        orderBy: {
                            createdAt: "desc",
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
            };
        },
        getPromptVersionContent: async (_parent, { promptId, versionId }, context) => {
            const version = await prisma.version.findUnique({
                where: {
                    id: versionId,
                    promptId: promptId,
                },
                include: {
                    content: { orderBy: { order: "asc" } },
                    variables: true,
                },
            });
            if (!version) {
                throw new Error("Version not found.");
            }
            return version;
        },
    },
    Mutation: {
        createPrompt: async (_parent, { input, }, context) => {
            const { projectId, content, variables, context: promptContext, modelProfileId, ...scalarData } = input;
            const userId = context.user?.id;
            const createData = {
                ...scalarData,
                versions: {
                    create: [
                        {
                            notes: "Initial version",
                            context: promptContext || "",
                            isActive: true,
                            content: {
                                create: content?.map((block, index) => ({
                                    order: index,
                                    type: block.type,
                                    value: block.type === "text" ? block.value : null,
                                    varId: block.type === "variable" ? block.varId : null,
                                    placeholder: block.type === "variable" ? block.placeholder : null,
                                    name: block.type === "variable" ? block.name : null,
                                })),
                            },
                            variables: {
                                create: variables?.map(v => ({
                                    name: v.name ?? "",
                                    placeholder: v.placeholder ?? "",
                                    description: v.description ?? "",
                                    type: v.type ?? "STRING",
                                    defaultValue: v.defaultValue ?? "",
                                    source: v.source || undefined,
                                })),
                            },
                        },
                    ],
                },
            };
            let finalModelProfileId = modelProfileId;
            if (!finalModelProfileId) {
                const genericModel = await prisma.modelProfile.findFirst({
                    where: { name: "Generic Model" },
                    select: { id: true },
                });
                if (genericModel) {
                    finalModelProfileId = genericModel.id;
                }
            }
            if (finalModelProfileId) {
                createData.modelProfile = {
                    connect: { id: finalModelProfileId },
                };
            }
            if (projectId) {
                createData.project = { connect: { id: projectId } };
            }
            else if (userId) {
                createData.user = { connect: { id: userId } };
            }
            const newPrompt = await prisma.prompt.create({ data: createData });
            return (await getFullPrompt(newPrompt.id));
        },
        updatePrompt: async (_parent, { input, }, context) => {
            const { id, ...scalarUpdates } = input;
            await prisma.prompt.update({
                where: { id },
                data: { ...scalarUpdates, updatedAt: new Date() },
            });
            return (await getFullPrompt(id));
        },
        deletePrompt: async (_parent, { id }, context) => {
            const deletedPrompt = await prisma.prompt.delete({ where: { id } });
            return deletedPrompt;
        },
        deleteManyPrompts: async (_parent, { ids }, context) => {
            const result = await prisma.prompt.deleteMany({
                where: {
                    id: { in: ids },
                },
            });
            return { count: result.count };
        },
        snapshotPrompt: async (_parent, { input }, context) => {
            const { promptId, notes } = input;
            const activeVersion = await prisma.version.findFirst({
                where: { promptId, isActive: true },
                include: {
                    content: { orderBy: { order: "asc" } },
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
                            type: block.type,
                            value: block.value,
                            varId: block.varId,
                            placeholder: block.placeholder,
                            name: block.name,
                            order: block.order,
                        })),
                    },
                    variables: {
                        create: activeVersion.variables.map(variable => ({
                            name: variable.name,
                            placeholder: variable.placeholder ?? "",
                            description: variable.description ?? "",
                            type: variable.type ?? "STRING",
                            defaultValue: variable.defaultValue ?? "",
                            source: variable.source || undefined,
                        })),
                    },
                },
            });
            return (await getFullPrompt(promptId));
        },
        updatePromptVersion: async (_parent, { input, }) => {
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
                                versionId,
                                order: index,
                                type: block.type,
                                value: block.type === "text" ? block.value : null,
                                varId: block.type === "variable" ? block.varId : null,
                                placeholder: block.type === "variable" ? block.placeholder : null,
                                name: block.type === "variable" ? block.name : null,
                            })),
                        });
                    }
                }
                if (variables) {
                    await tx.promptVariable.deleteMany({ where: { versionId: versionId } });
                    if (variables.length > 0) {
                        await tx.promptVariable.createMany({
                            data: variables.map(v => ({
                                name: v.name ?? "",
                                placeholder: v.placeholder ?? "",
                                description: v.description ?? "",
                                type: v.type ?? "STRING",
                                defaultValue: v.defaultValue ?? "",
                                source: v.source || undefined,
                                versionId,
                            })),
                        });
                    }
                }
            });
            return (await getFullPrompt(promptId));
        },
        setActivePromptVersion: async (_parent, { promptId, versionId }, context) => {
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
            return (await getFullPrompt(promptId));
        },
    },
    Project: {
        totalTaskCount: async (parent) => prisma.task.count({ where: { projectId: parent.id } }),
        completedTaskCount: async (parent) => prisma.task.count({ where: { projectId: parent.id, status: "DONE" } }),
    },
    User: {
        fullName: (parent) => `${parent.firstName || ""} ${parent.lastName || ""}`.trim(),
    },
};
export default promptResolvers;
