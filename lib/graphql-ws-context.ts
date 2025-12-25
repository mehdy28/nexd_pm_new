import { db } from "@/lib/firebase";
import { prisma } from "@/lib/prisma";
import { getAuth } from "firebase-admin/auth";

// Define the context type. It's useful to have this shared.
export type GraphQLContext = {
  db: typeof db;
  prisma: typeof prisma;
  user?: {
    id: string;
    email: string;
    // Match your prisma schema, may include firstName, lastName, etc.
    name?: string | null; 
    role: string;
    firebaseUid: string;
  };
  decodedToken?: any;
};

export const buildWsContext = async (connectionParams: any): Promise<GraphQLContext> => {
  const rawAuth = connectionParams?.authorization || connectionParams?.Authorization || null;
  const token = typeof rawAuth === "string" ? rawAuth.replace("Bearer ", "") : null;
  
  let user: GraphQLContext["user"] = undefined;
  let decodedToken = undefined;

  if (token) {
    try {
      decodedToken = await getAuth().verifyIdToken(token);
      const prismaUser = await prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
      });

      if (prismaUser) {
        user = {
          id: prismaUser.id,
          email: prismaUser.email,
          name: `${prismaUser.firstName} ${prismaUser.lastName}`, // Example: construct full name
          role: prismaUser.role,
          firebaseUid: decodedToken.uid,
        };
      }
    } catch (err: any) {
      console.error("[WS] Token verification failed:", err?.message ?? err);
      // Do not throw here, just fail gracefully without a user.
    }
  }

  return {
    db,
    prisma,
    user,
    decodedToken,
  };
};