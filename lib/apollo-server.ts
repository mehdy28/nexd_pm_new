// lib/apollo-server.ts
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { makeExecutableSchema } from "@graphql-tools/schema";

import { typeDefs } from "@/graphql/schema";
import { resolvers } from "@/graphql/resolvers";
import { db } from "@/lib/firebase";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { prisma } from "@/lib/prisma";
// No need for IncomingHttpHeaders here if using Headers.get()

// Ensure Context is defined as before
export interface Context {
  db: typeof db;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
    firebaseUid?: string;
  };
  decodedToken?: any;
}

// Firebase Admin initialization (assuming it's correct from previous context)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const server = new ApolloServer<Context>({
  schema,
});

export default startServerAndCreateNextHandler(server, {
  context: async (req) => {
    console.log("--- RAW GraphQL Context Headers Received ---");
    const rawHeaders = req.headers;
    console.log("Entire req.headers object:", rawHeaders);

    // --- MODIFIED: Access headers directly using .get() method ---
    const authHeader = rawHeaders.get('authorization');
    const plainHeaders: Record<string, string | null | undefined> = {}; // For logging purposes if desired
    if (authHeader) plainHeaders['authorization'] = authHeader; // Only put authHeader if it exists for logging

    console.log("Auth Header (via .get()):", authHeader); // Log the direct result
    console.log("Auth Header Has 'authorization' (via .get()):", !!authHeader); // Log if it exists
    // --- END MODIFIED ---

    console.log("--- END RAW GraphQL Context Headers Received ---");

    let token = typeof authHeader === 'string' ? authHeader.replace("Bearer ", "") : null;
    let user = undefined;
    let decodedToken = undefined;

    console.log("--- GraphQL Context Function Called ---");
    console.log("Auth Header Received (from .get()):", authHeader ? "[PRESENT]" : "[ABSENT]", `Value type: ${typeof authHeader}`);
    console.log("Extracted Token (from .get()):", token ? "[PRESENT]" : "[ABSENT]", `Value type: ${typeof token}`);

    if (token) {
      try {
        console.log("🔑 Verifying Firebase ID token...");
        decodedToken = await getAuth().verifyIdToken(token);
        console.log("✅ Firebase ID token decoded:", decodedToken);

        const prismaUser = await prisma.user.findUnique({
          where: { firebaseUid: decodedToken.uid },
        });

        if (prismaUser) {
          console.log("✅ User found in Prisma:", prismaUser);
          user = {
            id: prismaUser.id,
            email: prismaUser.email,
            name: prismaUser.name ?? decodedToken.name ?? null,
            role: prismaUser.role,
            firebaseUid: decodedToken.uid,
          };
        } else {
          console.warn("⚠️ No user found in Prisma with UID:", decodedToken.uid);
          // If no user is found in Prisma, but we have a decoded token,
          // we might still want to pass the basic Firebase user info.
          // This depends on your app's logic for "authenticated but not registered in Prisma".
          user = {
            id: decodedToken.uid, // Use Firebase UID as ID if Prisma user doesn't exist yet
            email: decodedToken.email,
            name: decodedToken.name,
            role: 'GUEST', // Or a default role for un-registered users
            firebaseUid: decodedToken.uid,
          };
        }
      } catch (error: any) {
        console.error("❌ Error verifying token:", error.message);
      }
    } else {
      console.log("⚠️ No token found in authorization header");
    }
    console.log("--- GraphQL Context Function Exited ---");

    return {
      db,
      user,
      decodedToken,
    };
  },
});