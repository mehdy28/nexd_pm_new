import { ApolloServer } from "@apollo/server"
import { startServerAndCreateNextHandler } from '@as-integrations/next';

import { makeExecutableSchema } from "@graphql-tools/schema"
import { typeDefs } from "@/graphql/schema"
import { resolvers } from "@/graphql/resolvers"
import { db } from "@/lib/firebase"
import { Auth } from "firebase-admin/auth"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { doc, getDoc } from "firebase/firestore"

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
        const decodedToken = await Auth.verifyIdToken(token)
        const userDoc = await getDoc(doc(db, "users", decodedToken.uid))
        const userData = userDoc.data()
        
        user = {
          id: decodedToken.uid,
          email: decodedToken.email!,
          name: userData?.name || decodedToken.name,
          role: userData?.role || "MEMBER",
        }
      } catch (error) {
        console.error("Error verifying token:", error)
      }
    }

    return {
      db,
      user,
    }
  },
})
