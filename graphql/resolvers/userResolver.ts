// graphql/resolvers/userResolver.ts
import { prisma } from "@/lib/prisma";
import { DecodedIdToken } from "firebase-admin/auth";
import { UserInputError, ForbiddenError } from "apollo-server-micro";
import { getRandomAvatarColor } from "@/lib/avatar-colors";

// The GraphQL context interface, ensuring type safety for our resolvers.
interface GraphQLContext {
  prisma: typeof prisma;
  user?: {
    id: string;
    email: string;
    role: string;
    firebaseUid: string;
  };
  decodedToken?: DecodedIdToken | null;
}

function log(prefix: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`${timestamp} ${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${timestamp} ${prefix} ${message}`);
  }
}

export const userResolver = {
  Query: {
    me: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.user?.id) {
        log("[me Query]", "No user ID found in context. Returning null.");
        return null;
      }
      try {
        const user = await prisma.user.findUnique({
          where: { id: context.user.id },
          include: {
            ownedWorkspaces: { select: { id: true, name: true } },
            workspaceMembers: { select: { workspace: { select: { id: true } } } },
          },
        });
        log("[me Query]", "User fetched successfully:", user);
        return user;
      } catch (error) {
        log("[me Query]", "Error during database fetch:", error);
        throw new Error("Failed to fetch user profile.");
      }
    },
  },

  Mutation: {
    createUser: async (
      _parent: unknown,
      args: {
        email: string;
        firstName?: string;
        lastName?: string;
        role?: "ADMIN" | "MEMBER";
        invitationToken?: string; // This argument must be added to the GraphQL mutation definition
      },
      context: GraphQLContext
    ) => {
      log("[createUser Mutation]", "Mutation initiated with args:", args);

      const firebaseUid = context.decodedToken?.uid;
      if (!firebaseUid) {
        log("[createUser Mutation]", "CRITICAL: firebaseUid not found in context. Aborting.");
        throw new ForbiddenError("Authentication token is invalid or missing.");
      }

      // Generate a random avatar color for this new user
      const avatarColor = getRandomAvatarColor();

      // If an invitation token is provided, handle it within a transaction
      if (args.invitationToken) {
        const invitation = await prisma.workspaceInvitation.findUnique({
          where: { token: args.invitationToken },
        });

        // --- Invitation Validation ---
        if (!invitation) {
          throw new UserInputError("This invitation is invalid.");
        }
        if (invitation.status !== 'PENDING') {
          throw new UserInputError("This invitation has already been used or revoked.");
        }
        if (new Date() > invitation.expiresAt) {
          throw new UserInputError("This invitation has expired.");
        }
        if (invitation.email.toLowerCase() !== args.email.toLowerCase()) {
          throw new ForbiddenError("This invitation is for a different email address.");
        }

        log("[createUser Mutation]", `Valid invitation found for workspace ID: ${invitation.workspaceId}`);

        // --- Transactional User Creation and Workspace Linking ---
        try {
          const newUser = await prisma.$transaction(async (tx) => {
            log("[createUser Mutation]", "Starting database transaction.");

            // 1. Create the User
            const createdUser = await tx.user.create({
              data: {
                email: args.email,
                firstName: args.firstName,
                lastName: args.lastName,
                avatarColor: avatarColor, // Assign random color
                role: "MEMBER", // Default role for invited users
                firebaseUid: firebaseUid,
              },
            });
            log("[createUser Mutation]", "User created within transaction:", createdUser);

            // 2. Add User to Workspace
            await tx.workspaceMember.create({
              data: {
                userId: createdUser.id,
                workspaceId: invitation.workspaceId,
                role: invitation.role, // Assign role from the invitation
              },
            });
            log("[createUser Mutation]", `User linked to workspace ${invitation.workspaceId} with role ${invitation.role}.`);

            // 3. Update Invitation Status
            await tx.workspaceInvitation.update({
              where: { id: invitation.id },
              data: { status: 'ACCEPTED' },
            });
            log("[createUser Mutation]", "Invitation status updated to ACCEPTED.");

            return createdUser;
          });

          log("[createUser Mutation]", "Transaction completed successfully. Returning new user:", newUser);
          return newUser;

        } catch (error) {
          log("[createUser Mutation]", "Error during transaction:", error);
          throw new Error("Failed to create account and join workspace.");
        }
      } else {
        // --- Standard User Creation (No Invitation) ---
        log("[createUser Mutation]", "No invitation token. Proceeding with standard registration.");
        try {
          const user = await prisma.user.create({
            data: {
              email: args.email,
              firstName: args.firstName,
              lastName: args.lastName,
              avatarColor: avatarColor, // Assign random color
              role: args.role ?? "MEMBER",
              firebaseUid: firebaseUid,
            },
          });
          log("[createUser Mutation]", "Standard user created successfully:", user);
          return user;
        } catch (error: any) {
          log("[createUser Mutation]", "Error during standard user creation:", error.message);
          if (error.code === 'P2002') {
            throw new Error("An account with this email already exists.");
          }
          throw new Error("Could not create user account.");
        }
      }
    },
  },
};