import type { Context } from "@/lib/apollo-server"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"

export const authResolvers = {
  Mutation: {
    signUp: async (_: any, { input }: { input: any }, { prisma }: Context) => {
      const { email, password, name } = input

      try {
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const firebaseUser = userCredential.user

        // Create user document in Firestore
        const userData = {
          email,
          name,
          role: "MEMBER",
          createdAt: new Date(),
        }
        
        await setDoc(doc(db, "users", firebaseUser.uid), userData)

        // Get ID token
        const token = await firebaseUser.getIdToken()

        return {
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name,
            role: "MEMBER",
          },
          token,
        }
      } catch (error: any) {
        throw new Error(error.message || "Failed to create user")
      }
    },

    signIn: async (_: any, { input }: { input: any }, { db }: Context) => {
      const { email, password } = input

      try {
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const firebaseUser = userCredential.user

        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        const userData = userDoc.data()

        // Get ID token
        const token = await firebaseUser.getIdToken()

        return {
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData?.name || firebaseUser.displayName,
            role: userData?.role || "MEMBER",
          },
          token,
        }
      } catch (error: any) {
        throw new Error("Invalid email or password")
      }
    },
  },
}

      return {
        user,
        token,
      }
    },
  },
}
