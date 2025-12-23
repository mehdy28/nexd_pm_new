import { prisma } from "@/lib/prisma";
import { UserInputError } from "apollo-server-micro";
import { sendEarlyAccessConfirmationEmail } from "@/lib/email";
import { DecodedIdToken } from "firebase-admin/auth";

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



export const earlyAccessResolver = {
  Query: {
    earlyAccessUsers: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      // IMPORTANT: This query should be protected and only accessible by ADMIN users.
      // This logic should be implemented in your authentication middleware.
      if (context.user?.role !== "ADMIN") {
        throw new Error("You are not authorized to perform this action.");
      }

      try {
        const users = await prisma.earlyAccessUser.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });
        return users;
      } catch (error) {
        throw new Error("Failed to fetch early access user list.");
      }
    },
  },

  Mutation: {
    createEarlyAccessUser: async (
      _parent: unknown,
      args: {
        name: string;
        email: string;
      }
    ) => {

      const { name, email } = args;

      if (!name || name.trim().length < 2) {
        throw new UserInputError("Name must be at least 2 characters long.");
      }

      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        throw new UserInputError("You must provide a valid email address.");
      }

      try {
        const newUser = await prisma.earlyAccessUser.create({
          data: {
            name: name.trim(),
            email: email.toLowerCase().trim(),
          },
        });


        // Send confirmation email after successfully creating the user
        await sendEarlyAccessConfirmationEmail({
          to: newUser.email,
          name: newUser.name,
        });


        return newUser;
      } catch (error: any) {
        // Handle unique constraint violation for the email field
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
          throw new UserInputError("This email is already on the waitlist.");
        }
        
        throw new Error("Could not add to the waitlist. Please try again later.");
      }
    },
  },
};