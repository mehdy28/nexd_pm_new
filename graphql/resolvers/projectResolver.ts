// graphql/resolvers/projectResolver.ts

import { prisma } from "@/lib/prisma";

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

interface GetProjectTasksAndSectionsArgs { // Ensure this interface exists
  projectId: string;
  sprintId?: string | null; // Allow null for explicit "no sprint" or when no default found
}


// Changed from IResolvers to a plain object
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
        // 1. Fetch Project data with related members, tasks, and sprints
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            members: {
              include: { user: true },
            },
            tasks: true, // Fetch all tasks to compute stats
            sprints: true, // Fetch all sprints
            // If you had activities, you'd include them here too
            // activities: {
            //   include: { user: true },
            //   orderBy: { createdAt: 'desc' },
            //   take: 5, // Limit recent activities
            // },
          },
        });

        if (!project) {
          log("[getProjectDetails Query]", `Project with ID ${projectId} not found.`);
          return null;
        }

        // 2. Validate if the current user is a member of this project
        const isMember = project.members.some(member => member.userId === userId);
        if (!isMember) {
          log("[getProjectDetails Query]", `User ${userId} is not a member of project ${projectId}. Access denied.`);
          throw new Error("Access Denied: You are not a member of this project.");
        }
        log("[getProjectDetails Query]", `Access granted for user ${userId} to project ${projectId}.`);


        // 3. Compute Project Statistics
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(task => task.status === 'DONE').length;
        // The IN_PROGRESS status does not exist in your Prisma schema's TaskStatus enum,
        // it only has TODO and DONE. Adjusting this filter accordingly.
        const inProgressTasks = project.tasks.filter(task => task.status === 'TODO').length; // Assuming TODO means in progress
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

        // 4. Transform members for output
        const transformedMembers = project.members.map(member => ({
          id: member.id, // ProjectMember ID
          role: member.role,
          user: {
            id: member.user.id,
            email: member.user.email,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            avatar: member.user.avatar,
          },
        }));

        // 5. Transform sprints for output
        const transformedSprints = project.sprints.map(sprint => ({
          ...sprint,
          // 'status' in your mock was "Planning" | "Active" | "Completed"
          // We can derive this from `isCompleted` and current date relative to start/end dates.
          status: sprint.isCompleted ? "Completed" : (
            new Date(sprint.startDate) <= new Date() && new Date(sprint.endDate) >= new Date() ? "Active" : "Planning"
          ),
        }));

        const result = {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status, // Prisma enum value, e.g., 'ACTIVE'
          color: project.color,
          createdAt: project.createdAt.toISOString(),

          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          upcomingDeadlines,

          members: transformedMembers,
          sprints: transformedSprints,
          // activities: project.activities.map(activity => ({
          //   ...activity,
          //   user: {
          //     id: activity.user.id,
          //     firstName: activity.user.firstName,
          //     lastName: activity.user.lastName,
          //     avatar: activity.user.avatar,
          //   },
          // })),
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
        // 1. Verify user access to the project
        const projectMember = await prisma.projectMember.findFirst({
          where: { projectId: projectId, userId: userId },
        });

        if (!projectMember) {
          log("[getGanttData Query]", `User ${userId} is not a member of project ${projectId}. Access denied.`);
          throw new Error("Access Denied: You are not a member of this project.");
        }
        log("[getGanttData Query]", `Access granted for user ${userId} to project ${projectId}.`);

        // 2. Fetch all Sprints for the project (for the dropdown filter)
        const projectSprints = await prisma.sprint.findMany({
          where: { projectId: projectId },
          select: { id: true, name: true, startDate: true, endDate: true, isCompleted: true, createdAt: true }, // Include createdAt for sorting
          orderBy: { createdAt: 'desc' }, // Order by creation date descending
        });
        log("[getGanttData Query]", `Fetched ${projectSprints.length} sprints for project ${projectId}.`);

        const ganttTasks: any[] = [];
        let displayOrder = 1;

        // Determine which sprints to process based on sprintId filter
        const sprintsToProcess = sprintId
          ? projectSprints.filter(s => s.id === sprintId)
          : projectSprints;

        for (const sprint of sprintsToProcess) {
          // Add the sprint itself as a 'project' type task in Gantt
          ganttTasks.push({
            id: sprint.id,
            name: sprint.name,
            start: sprint.startDate.toISOString(),
            end: sprint.endDate.toISOString(),
            progress: sprint.isCompleted ? 100 : 0, // Simplified progress for sprint
            type: "project",
            hideChildren: false,
            displayOrder: displayOrder++,
            description: sprint.description,
          });

          // Fetch Tasks for the current sprint
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
              start: task.startDate ? task.startDate.toISOString() : sprint.startDate.toISOString(), // Fallback to sprint start
              end: task.endDate ? task.endDate.toISOString() : task.dueDate?.toISOString() || sprint.endDate.toISOString(), // Fallback to due or sprint end
              progress: task.status === 'DONE' ? 100 : (task.status === 'TODO' ? 50 : 0), // Basic progress
              type: "task",
              sprint: sprint.id, // Link to parent sprint
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

          // Fetch Milestones for the current sprint
          const milestones = await prisma.milestone.findMany({
            where: { sprintId: sprint.id },
            orderBy: { dueDate: 'asc' },
          });

          for (const milestone of milestones) {
            ganttTasks.push({
              id: milestone.id,
              name: milestone.name,
              start: milestone.dueDate.toISOString(), // Milestones are points in time
              end: milestone.dueDate.toISOString(),
              progress: milestone.isCompleted ? 100 : 0,
              type: "milestone",
              sprint: sprint.id, // Link to parent sprint
              displayOrder: displayOrder++,
              description: milestone.description,
              // Milestones typically don't have assignees, but could if your schema allows
              assignee: null,
            });
          }
        }

        const result = {
          sprints: projectSprints.map(s => ({ id: s.id, name: s.name })), // Only ID and name for filter dropdown
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

      const { projectId, sprintId: argSprintId } = args; // Renamed to argSprintId to avoid conflict
      const userId = context.user.id;

      try {
        // 1. Verify user access to the project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            workspaceId: true, // Needed for personal tasks filtering
            members: { // Fetch project members for validation and return
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

        // 2. Fetch all Sprints for the project
        // Order by createdAt descending to easily find the latest
        const allProjectSprints = await prisma.sprint.findMany({
          where: { projectId: projectId },
          select: { id: true, name: true, startDate: true, endDate: true, isCompleted: true, createdAt: true },
          orderBy: { createdAt: 'desc' }, // Order by createdAt descending
        });
        log("[getProjectTasksAndSections Query]", `Fetched ${allProjectSprints.length} sprints for project ${projectId}.`);

        let effectiveSprintId: string | null | undefined = argSprintId;
        let defaultSelectedSprintId: string | null = null; // Will store the ID of the sprint that is effectively being filtered by


        // If no sprintId is provided in arguments, determine the "latest" sprint by createdAt
        if (!effectiveSprintId) {
          // The `allProjectSprints` array is already sorted by `createdAt` descending.
          // So, the first element is the latest.
          const latestSprint = allProjectSprints[0];

          // If a "latest" sprint is found, use its ID for filtering
          if (latestSprint) {
            effectiveSprintId = latestSprint.id;
            defaultSelectedSprintId = latestSprint.id; // Mark this as the default selected
            log("[getProjectTasksAndSections Query]", `Defaulting to latest sprint by createdAt: ${latestSprint.name} (${latestSprint.id})`);
          } else {
            // If no sprints found, tasks will not be sprint-filtered by default.
            log("[getProjectTasksAndSections Query]", "No sprints found. Fetching all project tasks without sprint filter.");
          }
        } else {
            // If sprintId was provided in arguments, then that's the default selected sprint.
            defaultSelectedSprintId = effectiveSprintId;
        }


        // 3. Define base task filtering based on the effectiveSprintId
        const taskWhereClause: any = {
          projectId: projectId,
          ...(effectiveSprintId && { sprintId: effectiveSprintId }),
        };

        // 4. Fetch Project Sections with their filtered tasks
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



        // 6. Fetch all Project Members (for assignee dropdown)
        const allProjectMembers = await prisma.projectMember.findMany({
          where: { projectId: projectId },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
            },
          },
        });
        log("[getProjectTasksAndSections Query]", `Fetched ${allProjectMembers.length} project members.`);


        // 7. Transform the data for the GraphQL response
        const transformedProjectSections = projectSections.map(section => ({
          id: section.id,
          name: section.name,
          tasks: section.tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate?.toISOString().split('T')[0] || null,
            points: task.points,
            assignee: task.assignee ? {
              id: task.assignee.id,
              firstName: task.assignee.firstName,
              lastName: task.assignee.lastName,
              avatar: task.assignee.avatar,
            } : null,
          })),
        }));


        const transformedProjectMembers = allProjectMembers.map(member => ({
          id: member.id, // ProjectMember ID
          role: member.role,
          user: {
            id: member.user.id,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            avatar: member.user.avatar,
            email: member.user.email,
          },
        }));

        // Filter and map sprints to only return id and name for the frontend dropdown.
        // The sprints will be ordered by createdAt descending from the original fetch.
        const result = {
          sprints: allProjectSprints.map(s => ({ id: s.id, name: s.name })),
          sections: transformedProjectSections,
          projectMembers: transformedProjectMembers,
          defaultSelectedSprintId: defaultSelectedSprintId, // NEW: Tell frontend which sprint was selected by default
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
    // Existing createProject mutation
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
          // Include necessary relations for the return type of the mutation
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
            projectId: project.id, // Direct connect via ID
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

        // Refetch the project to get all newly created sprints/sections for the return
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
  // Custom field resolvers for Project to explicitly define computed fields
  Project: {
    // These fields are populated by the getWorkspaceData resolver,
    // but the GraphQL schema (SDL) might reference Project type directly.
    // They are primarily for ProjectData/WorkspaceData types.
    // If you add them to the main 'Project' type in SDL, you would need
    // resolver functions here if they aren't computed on the root object.
    // For getProjectDetails, we compute them upfront in the main resolver.
    // So, this part might be redundant depending on how your schema uses 'Project'.
    // It's critical if your schema's 'Project' type directly has these fields
    // and they aren't always part of the root query response object.
    projectMemberCount: (parent: any) => parent.projectMemberCount,
    totalTaskCount: (parent: any) => parent.totalTaskCount,
    completedTaskCount: (parent: any) => parent.completedTaskCount,
  }
};

export default projectResolver;