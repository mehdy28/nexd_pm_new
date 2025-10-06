// graphql/resolvers/projectResolver.ts

import { prisma } from "@/lib/prisma";
import { TaskStatus, Priority } from "@prisma/client"; // Ensure these are imported if used in transformations

function log(prefix: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`${timestamp} ${prefix} ${message}`, data);
  } else {
    console.log(`${timestamp} ${prefix} ${message}`);
  }
}

interface GraphQLContext {
  prisma: typeof prisma;
  user?: { id: string; email: string; role: string };
}

interface CreateProjectArgs {
  workspaceId: string;
  name: string;
  description?: string;
}

interface GetProjectDetailsArgs {
  projectId: string;
}

interface GetGanttDataArgs {
  projectId: string;
  sprintId?: string | null;
}

interface GetProjectTasksAndSectionsArgs {
  projectId: string;
  sprintId?: string | null;
}


export const projectResolver = {
  Query: {
    getProjectDetails: async (_parent: unknown, args: GetProjectDetailsArgs, context: GraphQLContext) => {
      log("[getProjectDetails Query]", "called with args:", args);

      if (!context.user?.id) {
        log("[getProjectDetails Query]", "No authenticated user found in context.");
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
          log("[getProjectDetails Query]", `Project with ID ${projectId} not found.`);
          return null;
        }

        const isMember = project.members.some(member => member.userId === userId);
        if (!isMember) {
          log("[getProjectDetails Query]", `User ${userId} is not a member of project ${projectId}. Access denied.`);
          throw new Error("Access Denied: You are not a member of this project.");
        }
        log("[getProjectDetails Query]", `Access granted for user ${userId} to project ${projectId}.`);


        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(task => task.status === 'DONE').length;
        const inProgressTasks = project.tasks.filter(task => task.status === 'TODO').length;
        const overdueTasks = project.tasks.filter(task =>
          task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE'
        ).length;
        const upcomingDeadlines = project.tasks.filter(task => {
          if (!task.dueDate || task.status === 'DONE') return false;
          const dueDate = new Date(task.dueDate);
          const now = new Date();
          const oneWeekLater = new Date();
          oneWeekLater.setDate(now.getDate() + 7);
          return dueDate > now && dueDate < oneWeekLater;
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
          },
        }));

        const transformedSprints = project.sprints.map(sprint => ({
          ...sprint,
          status: sprint.isCompleted ? "Completed" : (
            new Date(sprint.startDate) <= new Date() && new Date(sprint.endDate) >= new Date() ? "Active" : "Planning"
          ),
        }));

        const result = {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          color: project.color,
          createdAt: project.createdAt.toISOString(),

          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          upcomingDeadlines,

          members: transformedMembers,
          sprints: transformedSprints,
        };

        log("[getProjectDetails Query]", "Project data fetched and transformed successfully.", result);
        return result;

      } catch (error) {
        log("[getProjectDetails Query]", "Error fetching project details:", error);
        throw error;
      }
    },


    getGanttData: async (_parent: unknown, args: GetGanttDataArgs, context: GraphQLContext) => {
      log("[getGanttData Query]", "called with args:", args);

      if (!context.user?.id) {
        log("[getGanttData Query]", "No authenticated user found in context.");
        throw new Error("Authentication required: No user ID found in context.");
      }

      const { projectId, sprintId } = args;
      const userId = context.user.id;

      try {
        const projectMember = await prisma.projectMember.findFirst({
          where: { projectId: projectId, userId: userId },
        });

        if (!projectMember) {
          log("[getGanttData Query]", `User ${userId} is not a member of project ${projectId}. Access denied.`);
          throw new Error("Access Denied: You are not a member of this project.");
        }
        log("[getGanttData Query]", `Access granted for user ${userId} to project ${projectId}.`);

        const projectSprints = await prisma.sprint.findMany({
          where: { projectId: projectId },
          select: { id: true, name: true, startDate: true, endDate: true, isCompleted: true, createdAt: true, description: true },
          orderBy: { createdAt: 'desc' },
        });
        log("[getGanttData Query]", `Fetched ${projectSprints.length} sprints for project ${projectId}.`);

        const ganttTasks: any[] = [];
        let displayOrder = 1;

        const sprintsToProcess = sprintId
          ? projectSprints.filter(s => s.id === sprintId)
          : projectSprints;

        for (const sprint of sprintsToProcess) {
          ganttTasks.push({
            id: sprint.id,
            name: sprint.name,
            start: sprint.startDate.toISOString(),
            end: sprint.endDate.toISOString(),
            progress: sprint.isCompleted ? 100 : 0,
            type: "project",
            hideChildren: false,
            displayOrder: displayOrder++,
            description: sprint.description,
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
              progress: task.status === 'DONE' ? 100 : (task.status === 'TODO' ? 50 : 0),
              type: "task",
              sprint: sprint.id,
              displayOrder: displayOrder++,
              description: task.description,
              assignee: task.assignee ? {
                id: task.assignee.id,
                firstName: task.assignee.firstName,
                lastName: task.assignee.lastName,
                avatar: task.assignee.avatar,
              } : null,
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
              displayOrder: displayOrder++,
              description: milestone.description,
              assignee: null,
            });
          }
        }

        const result = {
          sprints: projectSprints.map(s => ({ id: s.id, name: s.name })),
          tasks: ganttTasks,
        };

        log("[getGanttData Query]", "Gantt data fetched and transformed successfully.", result);
        return result;

      } catch (error) {
        log("[getGanttData Query]", "Error fetching Gantt data:", error);
        throw error;
      }
    },


    getProjectTasksAndSections: async (_parent: unknown, args: GetProjectTasksAndSectionsArgs, context: GraphQLContext) => {
      log("[getProjectTasksAndSections Query]", "called with args:", args);

      if (!context.user?.id) {
        log("[getProjectTasksAndSections Query]", "No authenticated user found in context.");
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
          log("[getProjectTasksAndSections Query]", `User ${userId} is not a member of project ${projectId}. Access denied.`);
          throw new Error("Access Denied: You are not a member of this project.");
        }
        log("[getProjectTasksAndSections Query]", `Access granted for user ${userId} to project ${projectId}.`);

        const allProjectSprints = await prisma.sprint.findMany({
          where: { projectId: projectId },
          select: { id: true, name: true, startDate: true, endDate: true, isCompleted: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        });
        log("[getProjectTasksAndSections Query]", `Fetched ${allProjectSprints.length} sprints for project ${projectId}.`);

        let effectiveSprintId: string | null | undefined = argSprintId;

        if (!effectiveSprintId && allProjectSprints.length > 0) {
          effectiveSprintId = allProjectSprints[0].id;
          log("[getProjectTasksAndSections Query]", `Defaulting to latest sprint by createdAt: ${allProjectSprints[0].name} (${allProjectSprints[0].id})`);
        }


        const taskWhereClause: any = {
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
                  select: { id: true, firstName: true, lastName: true, avatar: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        });
        log("[getProjectTasksAndSections Query]", `Fetched ${projectSections.length} project sections.`);

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
                        assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        log("[getProjectTasksAndSections Query]", `Fetched ${personalSections.length} personal sections for user ${userId}.`);


        const transformedProjectSections = projectSections.map(section => ({
          id: section.id,
          name: section.name,
          order: section.order, // <--- INCLUDE ORDER HERE
          tasks: section.tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate?.toISOString().split('T')[0] || null,
            points: task.points,
            completed: task.status === 'DONE', // <--- INCLUDE COMPLETED HERE
            sprintId: task.sprintId, // <--- INCLUDE SPRINTID HERE
            sectionId: task.sectionId, // <--- INCLUDE SECTIONID HERE
            assignee: task.assignee ? {
              id: task.assignee.id,
              firstName: task.assignee.firstName,
              lastName: task.assignee.lastName,
              avatar: task.assignee.avatar,
            } : null,
          })),
        }));

        const transformedPersonalSections = personalSections.map(section => ({
            id: section.id,
            name: section.name,
            order: section.order, // <--- INCLUDE ORDER HERE
            tasks: section.tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate?.toISOString().split('T')[0] || null,
                points: task.points,
                completed: task.status === 'DONE', // <--- INCLUDE COMPLETED HERE
                sprintId: task.sprintId, // <--- INCLUDE SPRINTID HERE
                sectionId: task.sectionId, // <--- INCLUDE SECTIONID HERE
                assignee: task.assignee ? {
                  id: task.assignee.id,
                  firstName: task.assignee.firstName,
                  lastName: task.assignee.lastName,
                  avatar: task.assignee.avatar,
                } : null,
            })),
        }));


        // --- FIX HERE: FETCH ALL PROJECT MEMBERS BEFORE MAPPING ---
        const allProjectMembers = await prisma.projectMember.findMany({
            where: { projectId: projectId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
                },
            },
        });
        log("[getProjectTasksAndSections Query]", `Fetched ${allProjectMembers.length} project members.`);

        const transformedProjectMembers = allProjectMembers.map(member => ({
          id: member.id,
          role: member.role,
          user: {
            id: member.user.id,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            avatar: member.user.avatar,
            email: member.user.email,
          },
        }));

        const result = {
          sprints: allProjectSprints.map(s => ({ id: s.id, name: s.name })),
          sections: transformedProjectSections,
          personalSections: transformedPersonalSections,
          projectMembers: transformedProjectMembers,
          // defaultSelectedSprintId: defaultSelectedSprintId, // Removed as per previous instruction
        };

        log("[getProjectTasksAndSections Query]", "Tasks, sections, and members fetched successfully.", result);
        return result;

      } catch (error) {
        log("[getProjectTasksAndSections Query]", "Error fetching project tasks and sections:", error);
        throw error;
      }
    },
  },
  Mutation: {
    createProject: async (
      _parent: unknown,
      args: CreateProjectArgs,
      context: GraphQLContext
    ) => {
      log("[createProject Mutation]", "called with args:", args);

      if (!context.user?.id) {
        log("[createProject Mutation]", "No authenticated user found in context.");
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
          log("[createProject Mutation]", `User ${userId} is not a member of workspace ${workspaceId}.`);
          throw new Error(`Forbidden: User is not a member of the specified workspace.`);
        }
        log("[createProject Mutation]", `User ${userId} is a member of workspace ${workspaceId}. Proceeding.`);

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
        log("[createProject Mutation]", "Project created successfully:", { id: project.id, name: project.name });


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
        log("[createProject Mutation]", `Initial Sprint created for project ${project.id}.`);


        const defaultProjectSections = ["To Do", "In Progress", "In Review", "Done"];
        await prisma.section.createMany({
          data: defaultProjectSections.map((secName, index) => ({
            name: secName,
            order: index,
            projectId: project.id,
          })),
        });
        log("[createProject Mutation]", `Default sections created for project ${project.id}.`);

        const createdProject = await prisma.project.findUnique({
            where: { id: project.id },
            include: {
                members: { include: { user: true } },
                sprints: true,
                sections: true,
            },
        });

        if (!createdProject) {
            log("[createProject Mutation]", "Failed to retrieve the created project after creation steps for final return.");
            throw new Error("Failed to retrieve the newly created project for final return.");
        }
        return createdProject;

      } catch (error) {
        log("[createProject Mutation]", "Error creating project:", error);
        throw error;
      }
    },
  },
  Project: {
    projectMemberCount: (parent: any) => parent.projectMemberCount,
    totalTaskCount: (parent: any) => parent.totalTaskCount,
    completedTaskCount: (parent: any) => parent.completedTaskCount,
  }
};

export default projectResolver;