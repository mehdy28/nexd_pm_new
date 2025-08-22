import { ApolloServer } from "@apollo/server"
import { startServerAndCreateNextHandler } from '@as-integrations/next';

import { makeExecutableSchema } from "@graphql-tools/schema"
import { typeDefs } from "@/graphql/schema"
import { resolvers } from "@/graphql/resolvers"
import { db } from "@/lib/firebase"
import { Auth } from "firebase-admin/auth"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { doc, getDoc } from "firebase/firestore"
import { prisma } from "@/lib/prisma"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}
export interface Context {
  db: typeof db
  user?: {
    id: string
    email: string
    name?: string
    role: string
  }
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

const server = new ApolloServer<Context>({
  schema,
})

export default startServerAndCreateNextHandler(server, {
  context: async (req, res) => {
    const authHeader = req.headers.authorization
    const token = authHeader?.replace("Bearer ", "")
    
    let user = undefined
    
    if (token) {
      try {
        console.log("Verifying Firebase ID token:", token);
        const decodedToken = await Auth.verifyIdToken(token);
        console.log("Firebase ID token decoded:", decodedToken);

        // Fetch user from Prisma instead of Firestore
        const prismaUser = await prisma.user.findUnique({
          where: { firebaseUid: decodedToken.uid },
        });

        if (prismaUser) {
          console.log("User found in Prisma:", prismaUser);
          user = {
            id: decodedToken.uid,
            email: decodedToken.email!,
            name: prismaUser.name || decodedToken.name,
            role: prismaUser.role, // Assuming you have a role field in your Prisma User model
          };
        } else {
          console.log("User not found in Prisma with firebaseUid:", decodedToken.uid);
        }
      } catch (error:any) {
        console.error("Error verifying token:", error.message)
      }
    } else {
        console.log("No token found in authorization header");
    }

    console.log("Context user:", user);
    return {
      db,
      user,
    };
  },
})