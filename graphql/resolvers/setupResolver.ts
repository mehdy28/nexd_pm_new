import { prisma } from "@/lib/prisma"
import { Plan, SubscriptionStatus } from "@prisma/client" // For type safety



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
        const user = await prisma.user.findUnique({
          where: { id: userId },
        })

        if (!user) {
          throw new Error(`User with ID ${userId} not found.`)
        }

        // --- Start of Transaction ---
        // All related database writes are wrapped in a transaction.
        // If any step fails, the entire operation is rolled back.
        const workspace = await prisma.$transaction(async (tx) => {
          // 2. Create Workspace with FREE plan
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


          // 3. Create Subscription record for the FREE plan
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

          // 4. Create Project within the Workspace
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

          // 5. Create a Sprint for the Project
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

          // 6. Create Default Sections for the Project
          const defaultProjectSections = ["To Do", "In Progress", "In Review", "Done"]
          await tx.section.createMany({
            data: defaultProjectSections.map((name, index) => ({
              name,
              order: index,
              projectId: project.id,
            })),
          })

          return newWorkspace
        })
        // --- End of Transaction ---

        // 7. Create Default Personal Sections for the User
        // This is user-scoped, so it's safe to run outside the workspace-specific transaction.
        const defaultPersonalSections = ["My To Do", "My In Progress", "My Done"]
        await prisma.personalSection.createMany({
          data: defaultPersonalSections.map((name, index) => ({
            name,
            order: index,
            userId: userId,
          })),
          skipDuplicates: true, // Prevent errors if user already has these
        })

        // 8. Fetch the full workspace object with relations for the return type
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
          throw new Error("Failed to retrieve the created workspace after setup.")
        }


        return createdWorkspace
      } catch (error) {
        throw error
      }
    },
  },
}

export default setupResolver