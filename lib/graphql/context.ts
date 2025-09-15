import { prisma } from "@/lib/prisma";
import type { NextApiRequest } from "next";
import { adminAuth } from "@/lib/firebase-admin";

export interface GraphQLContext {
  user: {
    id: string; // Prisma user ID
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: "MEMBER" | "ADMIN";
  } | null;
}

export async function createContext({ req }: { req: NextApiRequest }): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return { user: null };

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);

    const prismaUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!prismaUser) return { user: null };

    return {
      user: {
        id: prismaUser.id, // Prisma DB ID
        email: prismaUser.email,
        firstName: prismaUser.firstName,
        lastName: prismaUser.lastName,
        role: prismaUser.role as "MEMBER" | "ADMIN",
      },
    };
  } catch (err) {
    console.error("Firebase token verification failed:", err);
    return { user: null };
  }
}
