import { prisma } from "../../lib/prisma.js";
import { ProjectRole } from "@prisma/client";
import { GraphQLError } from "graphql";
export const projectResolver = {
    Query: {
        getProjectDetails: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new Error("Authentication required: No user ID found in context.");
            }
            const { projectId } = args;
            const userId = context.user.id;
            try {
                const project = await prisma.project.findUnique({
                    where: { id: projectId },
                    include: {
                        members: {
                            include: { user: true },
                        },
                        tasks: true,
                        sprints: true,
                    },
                });
                if (!project) {
                    return null;
                }
                const isMember = project.members.some(member => member.userId === userId);
                if (!isMember) {
                    throw new Error("Access Denied: You are not a member of this project.");
                }
                const totalTasks = project.tasks.length;
                const completedTasks = project.tasks.filter(task => task.status === 'DONE').length;
                const inProgressTasks = project.tasks.filter(task => task.status === 'TODO').length;
                const overdueTasks = project.tasks.filter(task => task.endDate && new Date(task.endDate) < new Date() && task.status !== 'DONE').length;
                const upcomingDeadlines = project.tasks.filter(task => {
                    if (!task.endDate || task.status === 'DONE')
                        return false;
                    const endDate = new Date(task.endDate);
                    const now = new Date();
                    const oneWeekLater = new Date();
                    oneWeekLater.setDate(now.getDate() + 7);
                    return endDate > now && endDate < oneWeekLater;
                }).length;
                const transformedMembers = project.members.map(member => ({
                    id: member.id,
                    role: member.role,
                    user: {
                        id: member.user.id,
                        email: member.user.email,
                        firstName: member.user.firstName,
                        lastName: member.user.lastName,
                        avatar: member.user.avatar,
                        avatarColor: member.user.avatarColor,
                    },
                }));
                const transformedSprints = project.sprints.map(sprint => ({
                    ...sprint,
                    status: sprint.isCompleted ? "COMPLETED" : (new Date(sprint.startDate) <= new Date() && new Date(sprint.endDate) >= new Date() ? "ACTIVE" : "PLANNING"),
                }));
                const result = {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    status: project.status,
                    color: project.color,
                    createdAt: project.createdAt.toISOString(),
                    workspace: {
                        id: project.workspaceId,
                    },
                    totalTasks,
                    completedTasks,
                    inProgressTasks,
                    overdueTasks,
                    upcomingDeadlines,
                    members: transformedMembers,
                    sprints: transformedSprints,
                };
                return result;
            }
            catch (error) {
                throw error;
            }
        },
        getAssignableProjectMembers: async (_, { workspaceId, projectId }, context) => {
            const source = 'Query: getAssignableProjectMembers';
            try {
                const userId = context.user?.id;
                if (!userId)
                    throw new GraphQLError('Not authenticated');
                // Authorization: Check if the current user is part of the workspace
                const requestingMember = await prisma.workspaceMember.findFirst({ where: { workspaceId, userId } });
                if (!requestingMember)
                    throw new GraphQLError('Access denied to workspace');
                // 1. Find all user IDs of members already in the specified project
                const projectMembers = await prisma.projectMember.findMany({
                    where: { projectId },
                    select: { userId: true },
                });
                const projectMemberUserIds = projectMembers.map(member => member.userId);
                // 2. Find all workspace members, excluding those already in the project
                const assignableMembers = await prisma.workspaceMember.findMany({
                    where: {
                        workspaceId,
                        userId: {
                            notIn: projectMemberUserIds,
                        },
                    },
                    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, avatarColor: true } } },
                    orderBy: { user: { firstName: 'asc' } },
                });
                return assignableMembers;
            }
            catch (error) {
                throw new GraphQLError(error.message || 'An error occurred fetching assignable project members.');
            }
        },
        getGanttData: async (_parent, args, context) => {
            if (!context.user?.id) {
                console.error("LOG: Authentication failed. No user ID found in context.");
                throw new Error("Authentication required: No user ID found in context.");
            }
            const { projectId, sprintId } = args;
            const userId = context.user.id;
            try {
                const projectMember = await prisma.projectMember.findFirst({
                    where: { projectId: projectId, userId: userId },
                });
                if (!projectMember) {
                    console.error(`LOG: Access Denied. User ${userId} is not a member of project ${projectId}.`);
                    throw new Error("Access Denied: You are not a member of this project.");
                }
                const projectSprints = await prisma.sprint.findMany({
                    where: { projectId: projectId },
                    select: { id: true, name: true, startDate: true, endDate: true, isCompleted: true, createdAt: true, description: true },
                    orderBy: { createdAt: 'desc' },
                });
                const ganttTasks = [];
                let currentDisplayOrder = 1;
                let sprintsToProcess;
                if (sprintId) {
                    // If sprintId is provided, filter for that specific sprint
                    const specificSprint = projectSprints.find(s => s.id === sprintId);
                    sprintsToProcess = specificSprint ? [specificSprint] : [];
                }
                else if (projectSprints.length > 0) {
                    // If no sprintId is provided, use the latest created sprint (which is the first one due to orderBy: createdAt: 'desc')
                    sprintsToProcess = [projectSprints[0]];
                }
                else {
                    // No sprints found at all
                    sprintsToProcess = [];
                }
                for (const sprint of sprintsToProcess) {
                    ganttTasks.push({
                        id: sprint.id,
                        name: sprint.name,
                        start: sprint.startDate.toISOString(),
                        end: sprint.endDate.toISOString(),
                        progress: sprint.isCompleted ? 100 : 0,
                        type: "project",
                        hideChildren: false,
                        displayOrder: currentDisplayOrder++,
                        description: sprint.description,
                        originalTaskId: sprint.id,
                        originalType: "SPRINT",
                    });
                    const tasks = await prisma.task.findMany({
                        where: { sprintId: sprint.id },
                        include: {
                            assignee: {
                                select: { id: true, firstName: true, lastName: true, avatar: true },
                            },
                        },
                        orderBy: { startDate: 'asc' },
                    });
                    for (const task of tasks) {
                        ganttTasks.push({
                            id: task.id,
                            name: task.title,
                            start: task.startDate ? task.startDate.toISOString() : sprint.startDate.toISOString(),
                            end: task.endDate ? task.endDate.toISOString() : task.dueDate?.toISOString() || sprint.endDate.toISOString(),
                            progress: Math.round(task.completionPercentage ?? 0),
                            type: "task",
                            sprint: sprint.id,
                            displayOrder: currentDisplayOrder++,
                            description: task.description,
                            assignee: task.assignee ? {
                                id: task.assignee.id,
                                firstName: task.assignee.firstName,
                                lastName: task.assignee.lastName,
                                avatar: task.assignee.avatar,
                            } : null,
                            originalTaskId: task.id,
                            originalType: "TASK",
                        });
                    }
                    const milestones = await prisma.milestone.findMany({
                        where: { sprintId: sprint.id },
                        orderBy: { dueDate: 'asc' },
                    });
                    for (const milestone of milestones) {
                        ganttTasks.push({
                            id: milestone.id,
                            name: milestone.name,
                            start: milestone.dueDate.toISOString(),
                            end: milestone.dueDate.toISOString(),
                            progress: milestone.isCompleted ? 100 : 0,
                            type: "milestone",
                            sprint: sprint.id,
                            displayOrder: currentDisplayOrder++,
                            description: milestone.description,
                            assignee: null,
                            originalTaskId: milestone.id,
                            originalType: "MILESTONE",
                        });
                    }
                }
                const result = {
                    sprints: projectSprints.map(s => ({ id: s.id, name: s.name })),
                    tasks: ganttTasks,
                };
                return result;
            }
            catch (error) {
                throw error;
            }
        },
        getProjectTasksAndSections: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new Error("Authentication required: No user ID found in context.");
            }
            const { projectId, sprintId: argSprintId } = args;
            const userId = context.user.id;
            try {
                const project = await prisma.project.findUnique({
                    where: { id: projectId },
                    select: {
                        id: true,
                        workspaceId: true,
                        members: {
                            where: { userId: userId },
                            select: { userId: true }
                        }
                    }
                });
                if (!project || project.members.length === 0) {
                    throw new Error("Access Denied: You are not a member of this project.");
                }
                const allProjectSprints = await prisma.sprint.findMany({
                    where: { projectId: projectId },
                    select: { id: true, name: true, startDate: true, endDate: true, isCompleted: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                });
                let effectiveSprintId = argSprintId;
                if (!effectiveSprintId && allProjectSprints.length > 0) {
                    effectiveSprintId = allProjectSprints[0].id;
                }
                const taskWhereClause = {
                    projectId: projectId,
                    ...(effectiveSprintId && { sprintId: effectiveSprintId }),
                };
                const projectSections = await prisma.section.findMany({
                    where: { projectId: projectId },
                    orderBy: { order: 'asc' },
                    include: {
                        tasks: {
                            where: taskWhereClause,
                            include: {
                                assignee: {
                                    select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true },
                                },
                            },
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                });
                const personalSections = await prisma.personalSection.findMany({
                    where: { userId: userId },
                    orderBy: { order: 'asc' },
                    include: {
                        tasks: {
                            where: {
                                personalUserId: userId,
                                personalWorkspaceId: project.workspaceId,
                                sprintId: null,
                                projectId: null,
                            },
                            include: {
                                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true, avatarColor: true } },
                            },
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                });
                const transformedProjectSections = projectSections.map(section => ({
                    id: section.id,
                    name: section.name,
                    order: section.order,
                    tasks: section.tasks.map(task => ({
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        status: task.status,
                        priority: task.priority,
                        endDate: task.endDate?.toISOString().split('T')[0] || null,
                        points: task.points,
                        completed: task.status === 'DONE',
                        sprintId: task.sprintId,
                        sectionId: task.sectionId,
                        assignee: task.assignee ? {
                            id: task.assignee.id,
                            firstName: task.assignee.firstName,
                            lastName: task.assignee.lastName,
                            avatar: task.assignee.avatar,
                            avatarColor: task.assignee.avatarColor,
                        } : null,
                    })),
                }));
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
                        endDate: task.endDate?.toISOString().split('T')[0] || null,
                        points: task.points,
                        completed: task.status === 'DONE',
                        sprintId: task.sprintId,
                        sectionId: task.sectionId,
                        assignee: task.assignee ? {
                            id: task.assignee.id,
                            firstName: task.assignee.firstName,
                            lastName: task.assignee.lastName,
                            avatar: task.assignee.avatar,
                            avatarColor: task.assignee.avatarColor,
                        } : null,
                    })),
                }));
                const allProjectMembers = await prisma.projectMember.findMany({
                    where: { projectId: projectId },
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, avatar: true, email: true, avatarColor: true },
                        },
                    },
                });
                const transformedProjectMembers = allProjectMembers.map(member => ({
                    id: member.id,
                    role: member.role,
                    user: {
                        id: member.user.id,
                        firstName: member.user.firstName,
                        lastName: member.user.lastName,
                        avatar: member.user.avatar,
                        email: member.user.email,
                        avatarColor: member.user.avatarColor,
                    },
                }));
                const result = {
                    sprints: allProjectSprints.map(s => ({ id: s.id, name: s.name })),
                    sections: transformedProjectSections,
                    personalSections: transformedPersonalSections,
                    projectMembers: transformedProjectMembers,
                };
                return result;
            }
            catch (error) {
                throw error;
            }
        },
    },
    Mutation: {
        createProject: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new Error("Authentication required: No user ID found in context.");
            }
            const userId = context.user.id;
            const { workspaceId, name, description } = args;
            try {
                const workspaceMember = await prisma.workspaceMember.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId: workspaceId,
                            userId: userId,
                        },
                    },
                });
                if (!workspaceMember) {
                    throw new Error(`Forbidden: User is not a member of the specified workspace.`);
                }
                const project = await prisma.project.create({
                    data: {
                        name,
                        description,
                        workspace: { connect: { id: workspaceId } },
                        color: "#4ECDC4",
                        status: 'PLANNING',
                        members: {
                            create: {
                                userId: userId,
                                role: 'OWNER',
                            },
                        },
                    },
                    include: {
                        members: { include: { user: true } },
                        sprints: true,
                        sections: true,
                    }
                });
                const now = new Date();
                const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                await prisma.sprint.create({
                    data: {
                        name: "Initial Sprint",
                        startDate: now,
                        endDate: oneWeekLater,
                        projectId: project.id,
                    },
                });
                const defaultProjectSections = ["To Do", "In Progress", "In Review", "Done"];
                await prisma.section.createMany({
                    data: defaultProjectSections.map((secName, index) => ({
                        name: secName,
                        order: index,
                        projectId: project.id,
                    })),
                });
                const createdProject = await prisma.project.findUnique({
                    where: { id: project.id },
                    include: {
                        members: { include: { user: true } },
                        sprints: true,
                        sections: true,
                    },
                });
                if (!createdProject) {
                    throw new Error("Failed to retrieve the newly created project for final return.");
                }
                return createdProject;
            }
            catch (error) {
                throw error;
            }
        },
        updateProject: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new Error("Authentication required.");
            }
            const userId = context.user.id;
            const { id, ...dataToUpdate } = args.input;
            const member = await prisma.projectMember.findFirst({
                where: {
                    projectId: id,
                    userId: userId,
                },
            });
            if (!member || ![ProjectRole.OWNER, ProjectRole.ADMIN].includes(member.role)) {
                throw new Error("Forbidden: You do not have permission to update this project.");
            }
            try {
                const updatedProject = await prisma.project.update({
                    where: { id: id },
                    data: dataToUpdate,
                });
                return updatedProject;
            }
            catch (error) {
                throw new Error("Failed to update project.");
            }
        },
        deleteProject: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new Error("Authentication required.");
            }
            const userId = context.user.id;
            const { id } = args;
            const member = await prisma.projectMember.findFirst({
                where: {
                    projectId: id,
                    userId: userId,
                },
            });
            if (!member || member.role !== ProjectRole.OWNER) {
                throw new Error("Forbidden: Only the project owner can delete the project.");
            }
            try {
                // Prisma's cascading delete will handle related models if the schema is configured correctly.
                // If not, a $transaction would be required to delete related entities manually.
                const deletedProject = await prisma.project.delete({
                    where: { id: id },
                });
                return deletedProject;
            }
            catch (error) {
                throw new Error("Failed to delete project.");
            }
        },
        updateSprint: async (_parent, args, context) => {
            if (!context.user?.id) {
                throw new Error("Authentication required: No user ID found in context.");
            }
            const userId = context.user.id;
            const { id: sprintId, ...updates } = args.input;
            try {
                const sprint = await prisma.sprint.findUnique({
                    where: { id: sprintId },
                    select: {
                        id: true,
                        projectId: true,
                        project: { select: { members: { where: { userId: userId }, select: { userId: true } } } },
                    },
                });
                if (!sprint) {
                    throw new Error(`Sprint with ID ${sprintId} not found.`);
                }
                if (!sprint.project || sprint.project.members.length === 0) {
                    throw new Error("Access Denied: You are not authorized to update this sprint.");
                }
                const dataToUpdate = {};
                for (const key in updates) {
                    if (Object.prototype.hasOwnProperty.call(updates, key)) {
                        const value = updates[key];
                        if (value !== undefined) {
                            if (key === 'startDate' || key === 'endDate') {
                                dataToUpdate[key] = value ? new Date(value) : null;
                            }
                            else {
                                dataToUpdate[key] = value;
                            }
                        }
                    }
                }
                const updatedSprint = await prisma.sprint.update({
                    where: { id: sprintId },
                    data: dataToUpdate,
                });
                return {
                    ...updatedSprint,
                    startDate: updatedSprint.startDate.toISOString(),
                    endDate: updatedSprint.endDate.toISOString(),
                    status: updatedSprint.isCompleted ? "COMPLETED" : (new Date(updatedSprint.startDate) <= new Date() && new Date(updatedSprint.endDate) >= new Date() ? "ACTIVE" : "PLANNING"),
                    tasks: [],
                    milestones: [],
                };
            }
            catch (error) {
                throw error;
            }
        },
    },
    Project: {
        projectMemberCount: (parent) => parent.projectMemberCount,
        totalTaskCount: (parent) => parent.totalTaskCount,
        completedTaskCount: (parent) => parent.completedTaskCount,
    }
};
export default projectResolver;
