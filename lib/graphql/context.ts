import { prisma } from "@/lib/prisma";
import type { NextApiRequest } from "next";
import { adminAuth } from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { User as PrismaUser } from "@prisma/client";

// Update the GraphQLContext interface to include the decoded token.
export interface GraphQLContext {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: "MEMBER" | "ADMIN";
  } | null;
  // This is the crucial addition. It will hold the verified Firebase token data.
  decodedToken: DecodedIdToken | null;
}

export async function createContext({ req }: { req: NextApiRequest }): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith("Bearer ")) {
    // If there's no token, return a completely null context.
    return { user: null, decodedToken: null };
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the token. This remains the same.
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Attempt to find the user, but do not return early if they are not found.
    const prismaUser: PrismaUser | null = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    // Construct the final context object, including BOTH the prismaUser (if found)
    // and the decodedToken. This ensures createUser has the uid it needs.
    return {
      user: prismaUser ? {
        id: prismaUser.id,
        email: prismaUser.email,
        firstName: prismaUser.firstName,
        lastName: prismaUser.lastName,
        role: prismaUser.role as "MEMBER" | "ADMIN",
      } : null,
      decodedToken: decodedToken, // Always pass the valid token
    };

  } catch (err) {
    // If token verification fails, return a null context.
    return { user: null, decodedToken: null };
  }
}