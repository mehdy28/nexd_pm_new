"use client";

import { useEffect, useState } from "react"
import { type User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

interface UserData {
  uid: string
  email: string | null
  displayName: string | null
  firstName?: string
  lastName?: string
  role?: string
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("useFirebaseAuth useEffect triggered");

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      console.log("onAuthStateChanged triggered");
      console.log("Firebase user:", firebaseUser);

      if (firebaseUser) {
        console.log("Firebase user found, fetching additional data from Firestore...");

        try {
          // Get additional user data from Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("Firestore user data:", userData);

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              ...userData,
            });
            console.log("User state updated with Firestore data");
          } else {
            console.log("User document not found in Firestore for UID:", firebaseUser.uid);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            } as UserData);
          }
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
        }
      } else {
        console.log("No Firebase user found, setting user to null");
        setUser(null);
      }
      setLoading(false);
      console.log("Loading set to false");
    });

    return () => {
      console.log("useFirebaseAuth useEffect cleanup: unsubscribing from onAuthStateChanged");
      return unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("Signing out...");
      await firebaseSignOut(auth);
      console.log("Sign out successful");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signOut,
  };
}