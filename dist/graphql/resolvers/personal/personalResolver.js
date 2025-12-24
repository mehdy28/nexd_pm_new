import { prisma } from "../../../lib/prisma.js";
import { GraphQLError } from "graphql";
import { Priority, TaskStatus } from "@prisma/client";
export const personalResolver = {
    Query: {
        getMyTasksAndSections: async (_parent, _args, context) => {
            if (!context.user?.id) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }
            const userId = context.user.id;
            try {
                const personalSections = await prisma.personalSection.findMany({
                    where: { userId: userId },
                    orderBy: { order: "asc" },
                    include: {
                        tasks: {
                            where: {
                                personalUserId: userId,
                            },
                            include: {
                                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                            },
                            orderBy: { createdAt: "desc" },
                        },
                    },
                });
                const transformedPersonalSections = personalSections.map(section => ({
                    id: section.id,
                    name: section.name,
                    order: section.order,
                    tasks: section.tasks.map(task => ({
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        status: task.status,
                        priority: task.priority,
                        startDate: task.startDate?.toISOString().split("T")[0] || null,
                        endDate: task.endDate?.toISOString().split("T")[0] || null,
                        points: task.points,
                        completed: task.status === "DONE",
                        personalSectionId: null, // Personal tasks don't belong to project sections
                        assignee: null, // Personal tasks are self-assigned
                    })),
                }));
                const result = {
                    personalSections: transformedPersonalSections,
                };
                return result;
            }
            catch (error) {
                throw error;
            }
        },
        getMyDashboardData: async (_parent, _args, context) => {
            if (!context.user?.id) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }
            const userId = context.user.id;
            try {
                const tasks = await prisma.task.findMany({
                    where: { personalUserId: userId },
                });
                const totalTasks = tasks.length;
                const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE).length;
                const inProgressTasks = tasks.filter(task => task.status === TaskStatus.TODO).length;
                const overdueTasks = tasks.filter(task => task.endDate && new Date(task.endDate) < new Date() && task.status !== TaskStatus.DONE).length;
                const kpis = {
                    totalTasks,
                    completedTasks,
                    inProgressTasks,
                    overdueTasks,
                };
                const priorityDistribution = Object.values(Priority).map(p => ({
                    name: p,
                    value: tasks.filter(t => t.priority === p).length,
                }));
                const statusDistribution = Object.values(TaskStatus).map(s => ({
                    name: s,
                    value: tasks.filter(t => t.status === s).length,
                }));
                const result = {
                    kpis,
                    priorityDistribution,
                    statusDistribution,
                };
                return result;
            }
            catch (error) {
                throw new GraphQLError("Failed to fetch user dashboard data.");
            }
        },
    },
    Mutation: {
        createPersonalSection: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }
            const userId = context.user.id;
            const { name, order } = args;
            try {
                const newSection = await prisma.personalSection.create({
                    data: {
                        name,
                        order: order ?? 0,
                        user: { connect: { id: userId } },
                    },
                });
                return { ...newSection, tasks: [] };
            }
            catch (error) {
                if (error.code === "P2002") {
                    throw new GraphQLError("A section with this name already exists for your personal tasks.", {
                        extensions: { code: "BAD_USER_INPUT" },
                    });
                }
                throw new GraphQLError("Could not create personal section.");
            }
        },
        updatePersonalSection: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }
            const userId = context.user.id;
            const { id, name, order } = args;
            try {
                const section = await prisma.personalSection.findFirst({
                    where: { id: id, userId: userId },
                });
                if (!section) {
                    throw new GraphQLError("Section not found or you don't have permission to update it.", {
                        extensions: { code: "FORBIDDEN" },
                    });
                }
                const updatedSection = await prisma.personalSection.update({
                    where: { id: id },
                    data: {
                        name: name ?? undefined,
                        order: order ?? undefined,
                    },
                });
                return updatedSection;
            }
            catch (error) {
                throw new GraphQLError("Could not update personal section.");
            }
        },
        deletePersonalSection: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
            }
            const userId = context.user.id;
            const { id, options } = args;
            try {
                const sectionToDelete = await prisma.personalSection.findFirst({
                    where: { id, userId },
                    include: { tasks: { select: { id: true } } },
                });
                if (!sectionToDelete) {
                    throw new GraphQLError("Section not found or you don't have permission to delete it.", {
                        extensions: { code: "FORBIDDEN" },
                    });
                }
                const taskIds = sectionToDelete.tasks.map(t => t.id);
                await prisma.$transaction(async (tx) => {
                    if (taskIds.length > 0) {
                        if (options?.deleteTasks) {
                            await tx.task.deleteMany({ where: { id: { in: taskIds } } });
                        }
                        else if (options?.reassignToSectionId) {
                            await tx.task.updateMany({
                                where: { id: { in: taskIds } },
                                data: { personalSectionId: options.reassignToSectionId },
                            });
                        }
                        else {
                            await tx.task.updateMany({
                                where: { id: { in: taskIds } },
                                data: { personalSectionId: null },
                            });
                        }
                    }
                    await tx.personalSection.delete({ where: { id } });
                });
                return sectionToDelete;
            }
            catch (error) {
                throw new GraphQLError("Could not delete personal section.");
            }
        },
    },
};
export default personalResolver;
