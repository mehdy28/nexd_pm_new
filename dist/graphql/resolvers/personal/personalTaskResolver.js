import { prisma } from "../../../lib/prisma.js";
import { ActivityType } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { GraphQLError } from "graphql";
// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});
// Helper to check if a user is authorized to access a task
const checkTaskAuthorization = async (userId, taskId) => {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { personalUserId: true },
    });
    if (!task) {
        throw new GraphQLError("Task not found.", { extensions: { code: "NOT_FOUND" } });
    }
    if (task.personalUserId !== userId) {
        throw new GraphQLError("Access Denied: You are not authorized to access this task.", {
            extensions: { code: "FORBIDDEN" },
        });
    }
    return task;
};
const toISODateString = (date) => {
    return date ? date.toISOString().split("T")[0] : null;
};
export const personalTaskResolver = {
    Query: {
        getMyGanttData: async (_parent, _args, context) => {
            if (!context.user?.id) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }
            const userId = context.user.id;
            try {
                // Step 1: Fetch sections and tasks concurrently
                const [personalSections, personalTasks] = await Promise.all([
                    prisma.personalSection.findMany({
                        where: { userId },
                        select: { id: true, name: true }, // Only fetch what's needed for the response
                        orderBy: { order: "asc" },
                    }),
                    prisma.task.findMany({
                        where: {
                            personalUserId: userId,
                            OR: [{ startDate: { not: null } }, { endDate: { not: null } }, { dueDate: { not: null } }],
                        },
                        orderBy: { startDate: "asc" }, // Sort tasks within a section by start date
                    }),
                ]);
                // Step 2: Group tasks by section and calculate date ranges for sections
                const tasksBySectionId = new Map();
                const sectionDateRanges = new Map();
                const orphanedTasks = [];
                for (const task of personalTasks) {
                    const sectionId = task.personalSectionId;
                    if (sectionId) {
                        // Group tasks
                        if (!tasksBySectionId.has(sectionId)) {
                            tasksBySectionId.set(sectionId, []);
                        }
                        tasksBySectionId.get(sectionId).push(task);
                        // Calculate date ranges
                        const startDate = task.startDate || task.createdAt;
                        const endDate = task.endDate || task.dueDate || new Date(new Date(startDate).setDate(startDate.getDate() + 1));
                        const currentRange = sectionDateRanges.get(sectionId);
                        if (!currentRange) {
                            sectionDateRanges.set(sectionId, { start: startDate, end: endDate });
                        }
                        else {
                            if (startDate < currentRange.start)
                                currentRange.start = startDate;
                            if (endDate > currentRange.end)
                                currentRange.end = endDate;
                        }
                    }
                    else {
                        orphanedTasks.push(task);
                    }
                }
                // Step 3: Build the final hierarchical list with calculated displayOrder
                const finalGanttTasks = [];
                let displayOrder = 1;
                for (const section of personalSections) {
                    const range = sectionDateRanges.get(section.id);
                    // Add section as a "project"
                    finalGanttTasks.push({
                        id: section.id,
                        name: section.name,
                        start: (range?.start || new Date()).toISOString(),
                        end: (range?.end || new Date()).toISOString(),
                        progress: 100,
                        type: "project",
                        project: null,
                        personalSectionId: null,
                        hideChildren: false,
                        displayOrder: displayOrder++,
                        description: null,
                        originalTaskId: section.id,
                        originalType: "SECTION",
                    });
                    // Add tasks for this section
                    const childrenTasks = tasksBySectionId.get(section.id) || [];
                    for (const task of childrenTasks) {
                        const startDate = task.startDate || task.createdAt;
                        const endDate = task.endDate || task.dueDate || new Date(new Date(startDate).setDate(startDate.getDate() + 1));
                        finalGanttTasks.push({
                            id: task.id,
                            name: task.title,
                            start: startDate.toISOString(),
                            end: endDate.toISOString(),
                            progress: task.completed ? 100 : task.completionPercentage ?? 0,
                            type: "task",
                            project: task.personalSectionId, // Link task to its parent section
                            personalSectionId: task.personalSectionId,
                            hideChildren: false, // Tasks don't have children in this model
                            displayOrder: displayOrder++,
                            description: task.description,
                            originalTaskId: task.id,
                            originalType: "TASK",
                        });
                    }
                }
                // Add orphaned tasks at the end
                for (const task of orphanedTasks) {
                    const startDate = task.startDate || task.createdAt;
                    const endDate = task.endDate || task.dueDate || new Date(new Date(startDate).setDate(startDate.getDate() + 1));
                    finalGanttTasks.push({
                        id: task.id,
                        name: task.title,
                        start: startDate.toISOString(),
                        end: endDate.toISOString(),
                        progress: task.completed ? 100 : task.completionPercentage ?? 0,
                        type: "task",
                        project: task.personalSectionId,
                        personalSectionId: task.personalSectionId,
                        hideChildren: false,
                        displayOrder: displayOrder++,
                        description: task.description,
                        originalTaskId: task.id,
                        originalType: "TASK",
                    });
                }
                return {
                    sections: personalSections,
                    tasks: finalGanttTasks,
                };
            }
            catch (error) {
                throw error;
            }
        },
        personalTask: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new Error("Authentication required.");
            }
            const userId = context.user.id;
            const task = await prisma.task.findFirst({
                where: {
                    id: args.id,
                    creatorId: userId, // The user must be the creator.
                    projectId: null, // It must be a personal task (no project).
                },
                include: {
                    assignee: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } },
                    creator: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } },
                    sprint: { select: { id: true, name: true } },
                    section: { select: { id: true, name: true } },
                    comments: {
                        include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
                        orderBy: { createdAt: "asc" },
                    },
                    attachments: {
                        include: { uploader: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
                        orderBy: { createdAt: "asc" },
                    },
                    activities: {
                        include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } } },
                        orderBy: { createdAt: "desc" },
                    },
                },
            });
            return task;
        },
    },
    Mutation: {
        createPersonalTask: async (_parent, { input }, context) => {
            if (!context.user?.id)
                throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } });
            const userId = context.user.id;
            const createdAt = new Date();
            const startDate = input.startDate ? new Date(input.startDate) : createdAt;
            let endDate;
            if (input.endDate) {
                endDate = new Date(input.endDate);
            }
            else {
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
            }
            const newPersonalTask = await prisma.task.create({
                data: {
                    ...input,
                    creatorId: userId,
                    personalUserId: userId,
                    dueDate: input.dueDate ? new Date(input.dueDate) : null,
                    startDate: startDate,
                    endDate: endDate,
                },
            });
            await prisma.activity.create({
                data: {
                    type: ActivityType.TASK_CREATED,
                    userId: userId,
                    taskId: newPersonalTask.id,
                    data: {
                        title: newPersonalTask.title,
                    },
                },
            });
            return { ...newPersonalTask, assignee: null };
        },
        updatePersonalTask: async (_parent, args, context) => {
            if (!context.user?.id)
                throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } });
            const userId = context.user.id;
            const { id: taskId, ...updates } = args.input;
            await checkTaskAuthorization(userId, taskId);
            const existingTask = await prisma.task.findUnique({
                where: { id: taskId },
                select: {
                    title: true,
                    description: true,
                    status: true,
                    priority: true,
                    dueDate: true,
                    points: true,
                    completed: true,
                    personalSectionId: true,
                    personalSection: { select: { name: true } },
                },
            });
            if (!existingTask) {
                throw new GraphQLError("Task not found.", { extensions: { code: "NOT_FOUND" } });
            }
            const activitiesToCreate = [];
            const commonActivityData = { userId, taskId };
            if (updates.title !== undefined && updates.title !== existingTask.title) {
                activitiesToCreate.push({
                    type: "TASK_UPDATED",
                    data: { change: "title", old: existingTask.title, new: updates.title },
                    ...commonActivityData,
                });
            }
            if (updates.description !== undefined && updates.description !== existingTask.description) {
                activitiesToCreate.push({ type: "DESCRIPTION_UPDATED", data: {}, ...commonActivityData });
            }
            if (updates.status !== undefined && updates.status !== existingTask.status) {
                activitiesToCreate.push({
                    type: "STATUS_UPDATED",
                    data: { old: existingTask.status, new: updates.status },
                    ...commonActivityData,
                });
            }
            if (updates.priority !== undefined && updates.priority !== existingTask.priority) {
                activitiesToCreate.push({
                    type: "PRIORITY_UPDATED",
                    data: { old: existingTask.priority, new: updates.priority },
                    ...commonActivityData,
                });
            }
            if (updates.dueDate !== undefined &&
                toISODateString(updates.dueDate ? new Date(updates.dueDate) : null) !==
                    toISODateString(existingTask.dueDate)) {
                activitiesToCreate.push({
                    type: "DUE_DATE_UPDATED",
                    data: {
                        old: toISODateString(existingTask.dueDate),
                        new: toISODateString(updates.dueDate ? new Date(updates.dueDate) : null),
                    },
                    ...commonActivityData,
                });
            }
            if (updates.points !== undefined && (updates.points ?? null) !== (existingTask.points ?? null)) {
                activitiesToCreate.push({
                    type: "POINTS_UPDATED",
                    data: { old: existingTask.points ?? null, new: updates.points ?? null },
                    ...commonActivityData,
                });
            }
            const newCompletedState = updates.isCompleted !== undefined ? updates.isCompleted : updates.status === "DONE";
            if (newCompletedState && !existingTask.completed) {
                activitiesToCreate.push({ type: "TASK_COMPLETED", data: { title: existingTask.title }, ...commonActivityData });
            }
            if (updates.personalSectionId !== undefined && updates.personalSectionId !== existingTask.personalSectionId) {
                const newSection = updates.personalSectionId
                    ? await prisma.personalSection.findUnique({ where: { id: updates.personalSectionId } })
                    : null;
                activitiesToCreate.push({
                    type: "TASK_UPDATED",
                    data: { change: "section", old: existingTask.personalSection?.name ?? null, new: newSection?.name ?? null },
                    ...commonActivityData,
                });
            }
            const [, updatedTask] = await prisma.$transaction([
                prisma.activity.createMany({ data: activitiesToCreate }),
                prisma.task.update({
                    where: { id: taskId },
                    data: {
                        title: updates.title ?? undefined,
                        description: updates.description,
                        status: updates.status,
                        priority: updates.priority,
                        dueDate: updates.dueDate ? new Date(updates.dueDate) : updates.dueDate === null ? null : undefined,
                        startDate: updates.startDate ? new Date(updates.startDate) : updates.startDate === null ? null : undefined,
                        endDate: updates.endDate ? new Date(updates.endDate) : updates.endDate === null ? null : undefined,
                        points: updates.points,
                        personalSectionId: updates.personalSectionId,
                        completed: newCompletedState,
                    },
                }),
            ]);
            return updatedTask;
        },
        deletePersonalTask: async (_parent, args, context) => {
            if (!context.user?.id)
                throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } });
            await checkTaskAuthorization(context.user.id, args.id);
            return await prisma.task.delete({ where: { id: args.id } });
        },
        deleteManyPersonalTasks: async (_parent, { ids }, context) => {
            if (!context.user?.id) {
                throw new GraphQLError("Authentication required.", { extensions: { code: "UNAUTHENTICATED" } });
            }
            const userId = context.user.id;
            const tasksToDelete = await prisma.task.findMany({
                where: {
                    id: { in: ids },
                    personalUserId: userId,
                },
            });
            const foundIds = new Set(tasksToDelete.map(task => task.id));
            const notFoundOrUnauthorizedIds = ids.filter(id => !foundIds.has(id));
            if (notFoundOrUnauthorizedIds.length > 0) {
                throw new GraphQLError(`Tasks not found or you are not authorized to delete them: ${notFoundOrUnauthorizedIds.join(", ")}`, {
                    extensions: { code: "FORBIDDEN" },
                });
            }
            await prisma.task.deleteMany({
                where: {
                    id: { in: ids },
                    personalUserId: userId,
                },
            });
            return tasksToDelete;
        },
        createPersonalGanttTask: async (_parent, { input }, context) => {
            if (!context.user?.id)
                throw new GraphQLError("Authentication required.");
            const userId = context.user.id;
            const createdAt = new Date();
            const startDate = input.startDate ? new Date(input.startDate) : createdAt;
            let endDate;
            if (input.endDate) {
                endDate = new Date(input.endDate);
            }
            else {
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
            }
            const newTask = await prisma.task.create({
                data: {
                    title: input.name,
                    description: input.description,
                    startDate: startDate,
                    endDate: endDate,
                    completionPercentage: input.progress,
                    creatorId: userId,
                    personalUserId: userId,
                    personalSectionId: input.personalSectionId,
                },
            });
            return {
                ...newTask,
                name: newTask.title,
                start: newTask.startDate?.toISOString(),
                end: newTask.endDate?.toISOString(),
                progress: newTask.completionPercentage,
                type: "task",
                originalTaskId: newTask.id,
                originalType: "TASK",
            };
        },
        updatePersonalGanttTask: async (_parent, { input }, context) => {
            if (!context.user?.id)
                throw new GraphQLError("Authentication required.");
            await checkTaskAuthorization(context.user.id, input.id);
            const updatedTask = await prisma.task.update({
                where: { id: input.id },
                data: {
                    title: input.name ?? undefined,
                    description: input.description,
                    startDate: input.startDate ? new Date(input.startDate) : undefined,
                    endDate: input.endDate ? new Date(input.endDate) : undefined,
                    completionPercentage: input.progress,
                },
            });
            return {
                ...updatedTask,
                name: updatedTask.title,
                start: updatedTask.startDate.toISOString(),
                end: updatedTask.endDate.toISOString(),
                progress: updatedTask.completionPercentage ?? 0,
                type: "task",
                personalSectionId: updatedTask.personalSectionId,
                originalTaskId: updatedTask.id,
                originalType: "TASK",
                displayOrder: input.displayOrder ?? null, // <-- ECHO THE displayOrder BACK
            };
        },
    },
};
export default personalTaskResolver;
