// setupResolver.ts

import { prisma } from "@/lib/prisma"; // Using your specified import path

// Consistent logging function
function log(prefix: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`${timestamp} ${prefix} ${message}`, data);
  } else {
    console.log(`${timestamp} ${prefix} ${message}`);
  }
}

// Define the arguments type for clarity
interface SetupWorkspaceArgs {
  userId: string;
  workspaceName: string;
  workspaceDescription?: string;
  projectName: string;
  projectDescription?: string;
  industry?: string;
  teamSize?: string;
  workFields?: string[];
}

// Define the context type, assuming prisma is available via import
interface GraphQLContext {
  // context.user, context.decodedToken might be available based on your setup
  user?: { id: string; email: string; role: string }; // Example, adjust as per your actual context.user
  decodedToken?: { uid: string; email: string }; // Example, adjust as per your actual context.decodedToken
  // Add other context properties if necessary
}

export const setupResolver = { // Renamed to setupResolver for consistency with userResolver export
  Mutation: {
    setupWorkspace: async (
      _parent: unknown, // Consistent with your userResolver
      args: SetupWorkspaceArgs,
      context: GraphQLContext // Using the defined context type
    ) => {
      log("[setupWorkspace Mutation]", "called with args:", args);

      const {
        userId,
        workspaceName,
        workspaceDescription,
        projectName,
        projectDescription,
        industry,
        teamSize,
        workFields,
      } = args;

      try {
        // 1. Validate User Exists
        log("[setupWorkspace Mutation]", `Checking for user with ID: ${userId}`);
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          log("[setupWorkspace Mutation]", `User with ID ${userId} not found.`);
          throw new Error(`User with ID ${userId} not found.`);
        }
        log("[setupWorkspace Mutation]", "User found:", { id: user.id, email: user.email });

        // 2. Create Workspace
        log("[setupWorkspace Mutation]", `Creating workspace: ${workspaceName}`);
        // Generate a basic slug. You might want more robust generation logic here.
        const slug = workspaceName.toLowerCase().replace(/\s+/g, '-').slice(0, 50) + '-' + Math.random().toString(36).substring(2, 8);

        const workspace = await prisma.workspace.create({
          data: {
            name: workspaceName,
            slug: slug,
            description: workspaceDescription,
            // CORRECTED: Explicitly connect the user as the owner using the 'owner' relation
            owner: {
              connect: { id: userId },
            },
            industry: industry,
            teamSize: teamSize,
            workFields: workFields || [],
            // CORRECT: Create the WorkspaceMember entry for the owner role
            members: {
              create: {
                userId: userId,
                role: 'OWNER', // User is the OWNER of the workspace via WorkspaceMember
              },
            },
          },
        });
        log("[setupWorkspace Mutation]", "Workspace created successfully:", { id: workspace.id, name: workspace.name });


        // 3. Create Project within the Workspace
        log("[setupWorkspace Mutation]", `Creating project: ${projectName} in workspace ${workspace.id}`);
        const project = await prisma.project.create({
          data: {
            name: projectName,
            description: projectDescription,
            workspace: {
              connect: { id: workspace.id },
            },
            // CORRECT: Assign the user as 'OWNER' for the project via ProjectMember
            members: {
              create: {
                userId: userId,
                role: 'OWNER', // User is the OWNER of the project via ProjectMember
              },
            },
          },
        });
        log("[setupWorkspace Mutation]", "Project created successfully:", { id: project.id, name: project.name });


        // 4. Create a Sprint for the Project
        log("[setupWorkspace Mutation]", `Creating initial sprint for project ${project.id}`);
        const now = new Date();
        const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        const sprint = await prisma.sprint.create({
          data: {
            name: "Sprint 1",
            startDate: now,
            endDate: oneWeekLater,
            project: {
              connect: { id: project.id },
            },
          },
        });
        log("[setupWorkspace Mutation]", "Sprint created successfully:", { id: sprint.id, name: sprint.name });


        // 5. Create Default Sections for the Project
        log("[setupWorkspace Mutation]", `Creating default sections for project ${project.id}`);
        const defaultProjectSections = ["To Do", "In Progress", "In Review", "Done"];
        await prisma.section.createMany({
          data: defaultProjectSections.map((name, index) => ({
            name,
            order: index,
            projectId: project.id,
          })),
        });
        log("[setupWorkspace Mutation]", `Created ${defaultProjectSections.length} project sections.`);


        // 6. Create Default Personal Sections for the User
        log("[setupWorkspace Mutation]", `Creating default personal sections for user ${userId}`);
        const defaultPersonalSections = ["My To Do", "My In Progress", "My Done"];
        await prisma.personalSection.createMany({
          data: defaultPersonalSections.map((name, index) => ({
            name,
            order: index,
            userId: userId,
          })),
          skipDuplicates: true, // Prevent errors if user already has these from another workspace setup
        });
        log("[setupWorkspace Mutation]", `Created ${defaultPersonalSections.length} personal sections.`);


        // Fetch the full workspace object with relations for the return type
        log("[setupWorkspace Mutation]", `Fetching complete workspace data for ID: ${workspace.id}`);
        const createdWorkspace = await prisma.workspace.findUnique({
          where: { id: workspace.id },
          include: {
            owner: true,
            members: {
              include: { user: true },
            },
            projects: {
              include: {
                members: { include: { user: true } },
                sprints: true,
                sections: true,
              },
            },
            personalTasks: true, // Include personal tasks if they were created (though none yet at this point)
          },
        });

        if (!createdWorkspace) {
          log("[setupWorkspace Mutation]", "Failed to retrieve the created workspace, despite successful creation steps.");
          throw new Error("Failed to retrieve the created workspace after setup.");
        }
        log("[setupWorkspace Mutation]", "Setup complete. Returning workspace.", { id: createdWorkspace.id, name: createdWorkspace.name });

        return createdWorkspace;
      } catch (error) {
        log("[setupWorkspace Mutation]", "Error during workspace setup:", error);
        throw error;
      }
    },
  },
};

export default setupResolver;