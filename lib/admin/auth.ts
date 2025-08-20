import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore"
import { auth } from "firebase-admin/auth"

export async function requireAdmin(context?: any) {
  let user = context?.user

  if (!user) {
    throw new Error("Authentication required")
  }

  if (user.role !== "ADMIN") {
    throw new Error("Admin access required")
  }

  return user
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const userDoc = await getDoc(doc(db, "users", userId))
  const userData = userDoc.data()

  return userData?.role === "ADMIN"
}

export async function promoteUserToAdmin(userId: string, promotedBy: string) {
  const promoterDoc = await getDoc(doc(db, "users", promotedBy))
  const promoterData = promoterDoc.data()

  if (promoterData?.role !== "ADMIN") {
    throw new Error("Only admins can promote users")
  }

  // Update user role in Firestore
  await updateDoc(doc(db, "users", userId), {
    role: "ADMIN",
    updatedAt: new Date(),
  })

  // Set custom claims in Firebase Auth
  await auth.setCustomUserClaims(userId, { role: "ADMIN" })

  // Log the promotion
  await addDoc(collection(db, "activities"), {
    type: "USER_PROMOTED",
    data: {
      targetUserId: userId,
      promotedBy: promotedBy,
    },
    userId: promotedBy,
    createdAt: new Date(),
  })

  // Get updated user data
  const updatedUserDoc = await getDoc(doc(db, "users", userId))
  return { id: userId, ...updatedUserDoc.data() }
}

export async function demoteAdminUser(userId: string, demotedBy: string) {
  const demoterDoc = await getDoc(doc(db, "users", demotedBy))
  const demoterData = demoterDoc.data()

  if (demoterData?.role !== "ADMIN") {
    throw new Error("Only admins can demote users")
  }

  // Prevent self-demotion
  if (userId === demotedBy) {
    throw new Error("Cannot demote yourself")
  }

  // Update user role in Firestore
  await updateDoc(doc(db, "users", userId), {
    role: "MEMBER",
    updatedAt: new Date(),
  })

  // Remove custom claims in Firebase Auth
  await auth.setCustomUserClaims(userId, { role: "MEMBER" })

  // Log the demotion
  await addDoc(collection(db, "activities"), {
    type: "USER_DEMOTED",
    data: {
      targetUserId: userId,
      demotedBy: demotedBy,
    },
    userId: demotedBy,
    createdAt: new Date(),
  })

  // Get updated user data
  const updatedUserDoc = await getDoc(doc(db, "users", userId))
  return { id: userId, ...updatedUserDoc.data() }
}
