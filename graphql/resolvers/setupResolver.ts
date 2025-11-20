import { prisma } from "@/lib/prisma"
import { Plan, SubscriptionStatus } from "@prisma/client" // For type safety

// Consistent logging function
function log(prefix: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  if (data !== undefined) {
    console.log(`${timestamp} ${prefix} ${message}`, data)
  } else {
    console.log(`${timestamp} ${prefix} ${message}`)
  }
}

// Define the arguments type for clarity
interface SetupWorkspaceArgs {
  userId: string
  workspaceName: string
  workspaceDescription?: string
  projectName: string
  projectDescription?: string
  industry?: string
  teamSize?: string
  workFields?: string[]
}

// Define the context type
interface GraphQLContext {
  user?: { id: string; email: string; role: string }
  decodedToken?: { uid: string; email: string }
}

export const setupResolver = {
  Mutation: {
    setupWorkspace: async (_parent: unknown, args: SetupWorkspaceArgs, context: GraphQLContext) => {
      log("[setupWorkspace Mutation]", "called with args:", args)

      const {
        userId,
        workspaceName,
        workspaceDescription,
        projectName,
        projectDescription,
        industry,
        teamSize,
        workFields,
      } = args

      try {
        // 1. Validate User Exists (before starting the transaction)
        log("[setupWorkspace Mutation]", `Checking for user with ID: ${userId}`)
        const user = await prisma.user.findUnique({
          where: { id: userId },
        })

        if (!user) {
          log("[setupWorkspace Mutation]", `User with ID ${userId} not found.`)
          throw new Error(`User with ID ${userId} not found.`)
        }
        log("[setupWorkspace Mutation]", "User found:", { id: user.id, email: user.email })

        // --- Start of Transaction ---
        // All related database writes are wrapped in a transaction.
        // If any step fails, the entire operation is rolled back.
        log("[setupWorkspace Mutation]", "Starting database transaction for full setup.")
        const workspace = await prisma.$transaction(async (tx) => {
          // 2. Create Workspace with FREE plan
          log("[setupWorkspace Mutation]", `Creating workspace: ${workspaceName}`)
          const slug =
            workspaceName.toLowerCase().replace(/\s+/g, "-").slice(0, 50) +
            "-" +
            Math.random().toString(36).substring(2, 8)

          const newWorkspace = await tx.workspace.create({
            data: {
              name: workspaceName,
              slug: slug,
              description: workspaceDescription,
              plan: Plan.FREE, // Assign the default FREE plan
              owner: {
                connect: { id: userId },
              },
              industry: industry,
              teamSize: teamSize,
              workFields: workFields || [],
              members: {
                create: {
                  userId: userId,
                  role: "OWNER",
                },
              },
            },
          })
          log("[setupWorkspace Mutation]", "Workspace created successfully:", {
            id: newWorkspace.id,
            plan: newWorkspace.plan,
          })

          // 3. Create Subscription record for the FREE plan
          log("[setupWorkspace Mutation]", `Creating FREE subscription for workspace ${newWorkspace.id}`)
          const farFutureDate = new Date()
          farFutureDate.setFullYear(farFutureDate.getFullYear() + 100) // Set expiry far in the future for FREE plan

          await tx.subscription.create({
            data: {
              workspaceId: newWorkspace.id,
              plan: Plan.FREE,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodEnd: farFutureDate,
              cancelAtPeriodEnd: false, // Not set to cancel
            },
          })
          log("[setupWorkspace Mutation]", "Subscription record created.")

          // 4. Create Project within the Workspace
          log("[setupWorkspace Mutation]", `Creating project: ${projectName} in workspace ${newWorkspace.id}`)
          const project = await tx.project.create({
            data: {
              name: projectName,
              description: projectDescription,
              workspace: {
                connect: { id: newWorkspace.id },
              },
              members: {
                create: {
                  userId: userId,
                  role: "OWNER",
                },
              },
            },
          })
          log("[setupWorkspace Mutation]", "Project created successfully:", { id: project.id, name: project.name })

          // 5. Create a Sprint for the Project
          log("[setupWorkspace Mutation]", `Creating initial sprint for project ${project.id}`)
          const now = new Date()
          const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          await tx.sprint.create({
            data: {
              name: "Sprint 1",
              startDate: now,
              endDate: oneWeekLater,
              project: {
                connect: { id: project.id },
              },
            },
          })
          log("[setupWorkspace Mutation]", "Sprint created successfully.")

          // 6. Create Default Sections for the Project
          log("[setupWorkspace Mutation]", `Creating default sections for project ${project.id}`)
          const defaultProjectSections = ["To Do", "In Progress", "In Review", "Done"]
          await tx.section.createMany({
            data: defaultProjectSections.map((name, index) => ({
              name,
              order: index,
              projectId: project.id,
            })),
          })
          log("[setupWorkspace Mutation]", `Created ${defaultProjectSections.length} project sections.`)

          return newWorkspace
        })
        log("[setupWorkspace Mutation]", "Database transaction completed successfully.")
        // --- End of Transaction ---

        // 7. Create Default Personal Sections for the User
        // This is user-scoped, so it's safe to run outside the workspace-specific transaction.
        log("[setupWorkspace Mutation]", `Creating default personal sections for user ${userId}`)
        const defaultPersonalSections = ["My To Do", "My In Progress", "My Done"]
        await prisma.personalSection.createMany({
          data: defaultPersonalSections.map((name, index) => ({
            name,
            order: index,
            userId: userId,
          })),
          skipDuplicates: true, // Prevent errors if user already has these
        })
        log("[setupWorkspace Mutation]", "Personal sections created or verified.")

        // 8. Fetch the full workspace object with relations for the return type
        log("[setupWorkspace Mutation]", `Fetching complete workspace data for ID: ${workspace.id}`)
        const createdWorkspace = await prisma.workspace.findUnique({
          where: { id: workspace.id },
          include: {
            owner: true,
            subscription: true, // Include the newly created subscription
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
          },
        })

        if (!createdWorkspace) {
          log("[setupWorkspace Mutation]", "Failed to retrieve the created workspace, despite successful creation steps.")
          throw new Error("Failed to retrieve the created workspace after setup.")
        }
        log("[setupWorkspace Mutation]", "Setup complete. Returning workspace.", {
          id: createdWorkspace.id,
          name: createdWorkspace.name,
        })

        return createdWorkspace
      } catch (error) {
        log("[setupWorkspace Mutation]", "Error during workspace setup:", error)
        throw error
      }
    },
  },
}

export default setupResolver