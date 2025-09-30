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
        const inProgressTasks = project.tasks.filter(task => task.status === 'IN_PROGRESS').length;
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