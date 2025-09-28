import { prisma } from "@/lib/prisma";

function log(prefix: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`${timestamp} ${prefix} ${message}`, data);
  } else {
    console.log(`${timestamp} ${prefix} ${message}`);
  }
}

export const userResolver = {
  Query: {
    me: async (_parent: unknown, _args: unknown, context: any) => {
      log("[me Query]", "called with context.user:", context.user);

      if (!context.user) {
        log("[me Query]", "no authenticated user found");
        throw new Error("Not authenticated");
      }

      try {
        const user = await prisma.user.findUnique({
          where: { id: context.user.id },
          // ADDED: Include relations for ownedWorkspaces and workspaceMembers
          include: {
            ownedWorkspaces: {
              select: { // Select only the fields needed by the GraphQL query
                id: true,
                name: true,
              },
            },
            workspaceMembers: {
              select: { // Select only the fields needed by the GraphQL query
                workspace: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });
        log("[me Query]", "user fetched:", user);
        return user;
      } catch (error) {
        log("[me Query]", "error fetching user:", error);
        throw error;
      }
    },
  },


  Mutation: {
    createUser: async (
      _parent: unknown,
      args: { email: string; name?: string; firstName?: string; lastName?: string; role?: "ADMIN" | "MEMBER" },
      context: any // Ensure context is properly typed if possible, but 'any' is fine for a quick fix.
    ) => {
      log("[createUser Mutation]", "called with args:", args);
      // Log the decoded token from context to debug its presence
      log("[createUser Mutation]", "context.decodedToken:", context.decodedToken);

      try {
        // Retrieve firebaseUid from context.decodedToken
        const firebaseUid = context.decodedToken?.uid;
        log("[createUser Mutation]", "Attempting to create user with firebaseUid:", firebaseUid);

        const user = await prisma.user.create({
          data: {
            email: args.email,
            firstName: args.firstName,
            lastName: args.lastName,
            role: args.role ?? "MEMBER",
            firebaseUid: firebaseUid, // Use the extracted firebaseUid
          },
        });

        log("[createUser Mutation]", "user created successfully:", user);
        return user;
      } catch (error) {
        log("[createUser Mutation]", "error creating user:", error);
        throw error;
      }
    },
  },
};