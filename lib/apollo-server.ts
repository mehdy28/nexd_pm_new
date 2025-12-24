// lib/apollo-server.ts
import { ApolloServer } from "@apollo/server"
import { startServerAndCreateNextHandler } from "@as-integrations/next"
import { makeExecutableSchema } from "@graphql-tools/schema"
import { typeDefs } from "@/graphql/schema"
import { resolvers } from "@/graphql/resolvers"
import { db } from "@/lib/firebase"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth, DecodedIdToken } from "firebase-admin/auth"
import { prisma } from "./prisma.js"
import { NextApiRequest } from "next"

// Ensure Context is defined as before
export interface Context {
  db: typeof db
  user?: {
    id: string
    email: string
    name?: string
    role: string
    firebaseUid?: string
  }
  decodedToken?: DecodedIdToken
}

// Firebase Admin initialization (assuming it's correct from previous context)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

const server = new ApolloServer<Context>({
  schema,
})

export default startServerAndCreateNextHandler(server, {
  context: async (req: NextApiRequest) => {
    console.log("--- RAW GraphQL Context Headers Received ---")
    const rawHeaders = req.headers
    console.log("Entire req.headers object:", rawHeaders)

    const authHeaderValue = rawHeaders.authorization
    const authHeader = Array.isArray(authHeaderValue) ? authHeaderValue[0] : authHeaderValue

    const plainHeaders: Record<string, string | null | undefined> = {} // For logging purposes if desired
    if (authHeader) plainHeaders["authorization"] = authHeader // Only put authHeader if it exists for logging

    console.log("Auth Header (via .authorization):", authHeader)
    console.log("Auth Header Has 'authorization':", !!authHeader)

    console.log("--- END RAW GraphQL Context Headers Received ---")

    let token = typeof authHeader === "string" ? authHeader.replace("Bearer ", "") : null
    let user: Context["user"] = undefined
    let decodedToken: DecodedIdToken | undefined = undefined

    console.log("--- GraphQL Context Function Called ---")
    console.log(
      "Auth Header Received (from .authorization):",
      authHeader ? "[PRESENT]" : "[ABSENT]",
      `Value type: ${typeof authHeader}`,
    )
    console.log("Extracted Token:", token ? "[PRESENT]" : "[ABSENT]", `Value type: ${typeof token}`)

    if (token) {
      try {
        console.log("🔑 Verifying Firebase ID token...")
        decodedToken = await getAuth().verifyIdToken(token)
        console.log("✅ Firebase ID token decoded:", decodedToken)

        const prismaUser = await prisma.user.findUnique({
          where: { firebaseUid: decodedToken.uid },
        })

        if (prismaUser) {
          console.log("✅ User found in Prisma:", prismaUser)
          const name =
            prismaUser.firstName || prismaUser.lastName
              ? `${prismaUser.firstName || ""} ${prismaUser.lastName || ""}`.trim()
              : decodedToken.name
          user = {
            id: prismaUser.id,
            email: prismaUser.email,
            name: name,
            role: prismaUser.role,
            firebaseUid: decodedToken.uid,
          }
        } else {
          console.warn("⚠️ No user found in Prisma with UID:", decodedToken.uid)
          if (decodedToken.email) {
            user = {
              id: decodedToken.uid,
              email: decodedToken.email,
              name: decodedToken.name,
              role: "GUEST",
              firebaseUid: decodedToken.uid,
            }
          } else {
            console.warn("⚠️ Firebase token does not contain an email. Cannot create temporary user context.")
          }
        }
      } catch (error: any) {
        console.error("❌ Error verifying token:", error.message)
      }
    } else {
      console.log("⚠️ No token found in authorization header")
    }
    console.log("--- GraphQL Context Function Exited ---")

    return {
      db,
      user,
      decodedToken,
    }
  },
})
