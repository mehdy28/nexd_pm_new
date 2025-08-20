import type { Context } from "@/lib/apollo-server"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, { db, user }: Context) => {
      if (!user) {
        throw new Error("Not authenticated")
      }

      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, "users", user.id))
      const userData = userDoc.data()
      
      if (!userData) {
        throw new Error("User not found")
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: userData.createdAt?.toDate() || new Date(),
        ...userData,
      }
    },
  },

  User: {
    workspaceMembers: async (parent: any, _: any, { db }: Context) => {
      // Get workspace memberships from Firestore
      const membersQuery = query(
        collection(db, "workspaceMembers"),
        where("userId", "==", parent.id)
      )
      const membersSnapshot = await getDocs(membersQuery)
      return membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    },

    ownedWorkspaces: async (parent: any, _: any, { db }: Context) => {
      // Get owned workspaces from Firestore
      const workspacesQuery = query(
        collection(db, "workspaces"),
        where("ownerId", "==", parent.id)
      )
      const workspacesSnapshot = await getDocs(workspacesQuery)
      return workspacesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    },

    projectMembers: async (parent: any, _: any, { db }: Context) => {
      // Get project memberships from Firestore
      const membersQuery = query(
        collection(db, "projectMembers"),
        where("userId", "==", parent.id)
      )
      const membersSnapshot = await getDocs(membersQuery)
      return membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    },

    assignedTasks: async (parent: any, _: any, { db }: Context) => {
      // Get assigned tasks from Firestore
      const tasksQuery = query(
        collection(db, "tasks"),
        where("assigneeId", "==", parent.id)
      )
      const tasksSnapshot = await getDocs(tasksQuery)
      return tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    },

    createdTasks: async (parent: any, _: any, { db }: Context) => {
      // Get created tasks from Firestore
      const tasksQuery = query(
        collection(db, "tasks"),
        where("creatorId", "==", parent.id)
      )
      const tasksSnapshot = await getDocs(tasksQuery)
      return tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    },

    activities: async (parent: any, _: any, { db }: Context) => {
      // Get user activities from Firestore
      const activitiesQuery = query(
        collection(db, "activities"),
        where("userId", "==", parent.id)
      )
      const activitiesSnapshot = await getDocs(activitiesQuery)
      return activitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    },

    comments: async (parent: any, _: any, { db }: Context) => {
      // Get user comments from Firestore
      const commentsQuery = query(
        collection(db, "comments"),
        where("authorId", "==", parent.id)
      )
      const commentsSnapshot = await getDocs(commentsQuery)
      return commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    },
  },
}
