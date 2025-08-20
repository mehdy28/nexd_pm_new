// ./graphql/resolvers/auth.ts

import { GraphQLError } from "graphql"
import { auth as firebaseAdminAuth } from "firebase-admin/auth" // Import Firebase Admin Auth
import { getAuth } from "firebase/auth" // Import Firebase Client Auth
import { prisma } from "@/lib/prisma"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"

interface SignUpInput {
  email: string
  password: string
  name?: string
}

interface SignInInput {
  email: string
  password: string
}

export const authResolvers = {
  Mutation: {
    signUp: async (_: any, { input }: { input: SignUpInput }) => {
      try {
        const { email, password, name } = input

        // 1. Create user in Firebase Authentication
        const { user: firebaseUser } = await getAuth().createUserWithEmailAndPassword(email, password)

        if (!firebaseUser) {
          throw new Error("Failed to create user in Firebase Authentication")
        }

        // 2. Create user in Prisma
        const newUser = await prisma.user.create({
          data: {
            email,
            name,
            firebaseUid: firebaseUser.uid,
          },
        })
        //3. Create user roles in the firebase firestore

        const userDocRef = doc(db, "users", firebaseUser.uid)
        await setDoc(userDocRef, {
          uid: firebaseUser.uid,
          email: email,
          name: name,
          role: "MEMBER", // Default role
        })

        // 4. Generate custom token
        const token = await firebaseAdminAuth.createCustomToken(firebaseUser.uid)

        return { user: newUser, token }
      } catch (error: any) {
        console.error("Error signing up:", error)
        throw new GraphQLError(error?.message || "Failed to sign up")
      }
    },
    signIn: async (_: any, { input }: { input: SignInInput }) => {
      try {
        const { email, password } = input

        // 1. Sign in with Firebase Authentication
        const { user: firebaseUser } = await getAuth().signInWithEmailAndPassword(email, password)

        if (!firebaseUser) {
          throw new Error("Invalid credentials")
        }
        //2. get user role from firestore

        const userDocRef = doc(db, "users", firebaseUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
          throw new Error("User not found in Firestore")
        }

        const userData = userDoc.data()

        // 3. Get user from Prisma
        const user = await prisma.user.findUnique({
          where: {
            firebaseUid: firebaseUser.uid,
          },
        })

        if (!user) {
          throw new Error("User not found in Prisma")
        }
        // 4. Generate custom token
        const token = await firebaseAdminAuth.createCustomToken(firebaseUser.uid)

        return { user: user, token: token }
      } catch (error: any) {
        console.error("Error signing in:", error)
        throw new GraphQLError(error?.message || "Failed to sign in")
      }
    },
  },
}