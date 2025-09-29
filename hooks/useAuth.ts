// hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation, useApolloClient } from "@apollo/client";
import { CREATE_USER } from "@/graphql/mutations/register";
import { ME_QUERY } from "@/graphql/queries/me";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import app from "@/lib/firebase";

const auth = getAuth(app);

// Update interface to reflect your User type, including 'name' if it's still distinct
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Keep 'name' if it exists in your schema/Prisma User model
  role: string;
  ownedWorkspaces?: { id: string; name: string }[];
  workspaceMembers?: { workspace: { id: string } }[];
  hasWorkspace?: boolean;
}

// Define your public pages. These are pages anyone can visit, logged in or not.
const PUBLIC_PAGES = ["/login", "/register", "/forgot-password", "/blog", "/"]; // Added "/" for your root page if it's public

// Define where an authenticated user should go if they land on a public page
const AUTH_REDIRECT_DESTINATION = "/workspace"; // Or you can dynamically choose between /workspace and /setup

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const client = useApolloClient();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createUser] = useMutation(CREATE_USER);

  // ----------------------------
  // Fetch current user from GraphQL using Firebase token
  // ----------------------------
  const fetchMe = useCallback(async (): Promise<User | null> => {
    const user = auth.currentUser;
    // console.log("[Auth] fetchMe -> current Firebase user:", user); // Keep for debugging, remove for production
    if (!user) return null;

    try {
      const token = await user.getIdToken();
      // console.log("[Auth] fetchMe -> Firebase token:", token); // Keep for debugging, remove for production

      const { data } = await client.query({
        query: ME_QUERY,
        context: { headers: { Authorization: `Bearer ${token}` } },
        fetchPolicy: "network-only", // Always get fresh data for the primary auth check
      });

      // console.log("[Auth] fetchMe -> GraphQL me data:", data?.me); // Keep for debugging, remove for production
      return data?.me ?? null;
    } catch (err) {
      console.error("[Auth] fetchMe error:", err);
      // On fetchMe error, clear auth state to ensure user is logged out or redirected
      setCurrentUser(null);
      await signOut(auth); // Force Firebase signOut on GraphQL me fetch failure
      return null;
    }
  }, [client]);

  // ----------------------------
  // Register
  // ----------------------------
  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      // console.log("[Auth] register -> called with:", { email, firstName, lastName }); // Keep for debugging, remove for production
      setLoading(true);
      setError(null);

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        if (!firebaseUser) throw new Error("Firebase registration failed");

        // console.log("[Auth] register -> Firebase registration success:", firebaseUser); // Keep for debugging, remove for production

        const firebaseIdToken = await firebaseUser.getIdToken();
        // console.log("[Auth] register -> Firebase ID Token for GraphQL:", firebaseIdToken); // Keep for debugging, remove for production


        await createUser({
          variables: {
            email,
            firstName,
            lastName,
            role: "MEMBER"
          },
          context: {
            headers: {
              Authorization: `Bearer ${firebaseIdToken}`,
            },
          },
          update(cache, { data: { createUser: newUserData } }) {
            cache.writeQuery({
              query: ME_QUERY,
              data: {
                me: {
                  ...newUserData,
                  hasWorkspace: false,
                  ownedWorkspaces: [],
                  workspaceMembers: [],
                  __typename: "User",
                },
              },
            });
            // console.log("[Auth] register -> Apollo cache updated with new user"); // Keep for debugging, remove for production
          },
        });
        // console.log("[Auth] register -> GraphQL user created"); // Keep for debugging, remove for production

        const me = await fetchMe();
        // console.log("[Auth] register -> fetched me:", me); // Keep for debugging, remove for production

        if (me) {
          const hasWorkspace =
            (me.ownedWorkspaces?.length ?? 0) > 0 ||
            (me.workspaceMembers?.length ?? 0) > 0;

          setCurrentUser({ ...me, hasWorkspace });
          router.push(hasWorkspace ? AUTH_REDIRECT_DESTINATION : "/setup");
        } else {
            console.warn("[Auth] register -> `me` query returned null after successful registration. This should not happen if cache update was successful.");
            router.push("/setup");
        }

      } catch (err: any) {
        setError(err.message);
        console.error("[Auth] register -> error:", err);
        await signOut(auth);
      } finally {
        setLoading(false);
      }
    },
    [createUser, fetchMe, router]
  );


  // ----------------------------
  // Login
  // ----------------------------
  const login = useCallback(
    async (email: string, password: string) => {
      // console.log("[Auth] login -> called with:", { email }); // Keep for debugging, remove for production
      setLoading(true);
      setError(null);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // console.log("[Auth] login -> Firebase signIn success"); // Keep for debugging, remove for production

        const me = await fetchMe();
        // console.log("[Auth] login -> fetched me:", me); // Keep for debugging, remove for production

        if (me) {
          const hasWorkspace =
            (me.ownedWorkspaces?.length ?? 0) > 0 ||
            (me.workspaceMembers?.length ?? 0) > 0;

          setCurrentUser({ ...me, hasWorkspace });
          // console.log("[Auth] login -> set currentUser, redirecting to:", hasWorkspace ? AUTH_REDIRECT_DESTINATION : "/setup"); // Keep for debugging, remove for production
          router.push(hasWorkspace ? AUTH_REDIRECT_DESTINATION : "/setup");
        } else {
          console.error("[Auth] login -> Failed to fetch user data after successful Firebase login.");
          setError("Failed to retrieve user profile. Please try again.");
          await signOut(auth);
        }
      } catch (err: any) {
        console.error("[Auth] login error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [fetchMe, router]
  );

  // ----------------------------
  // Logout
  // ----------------------------
  const logout = useCallback(async () => {
    // console.log("[Auth] logout -> called"); // Keep for debugging, remove for production
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      // console.log("[Auth] logout -> Firebase signOut success"); // Keep for debugging, remove for production
      setCurrentUser(null);
      client.resetStore();
      router.push("/login");
    } catch (err: any) {
      console.error("[Auth] logout error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router, client]);

  // ----------------------------
  // Listen to Firebase auth changes and handle redirects
  // ----------------------------
  useEffect(() => {
    // console.log("[Auth] useEffect -> onAuthStateChanged subscribe"); // Keep for debugging, remove for production
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      // console.log("[Auth] onAuthStateChanged -> user:", user); // Keep for debugging, remove for production
      setLoading(true);
      try {
        if (user) {
          // User is logged in via Firebase
          const me = await fetchMe();
          // console.log("[Auth] onAuthStateChanged -> fetched me:", me); // Keep for debugging, remove for production

          if (me) {
            // User data successfully retrieved from GraphQL
            const hasWorkspace =
              (me.ownedWorkspaces?.length ?? 0) > 0 ||
              (me.workspaceMembers?.length ?? 0) > 0;

            setCurrentUser({ ...me, hasWorkspace });

            // **THE CLEANEST REDIRECT LOGIC FOR AUTHENTICATED USERS**
            // If the user is authenticated and currently on a public page,
            // redirect them to their primary authenticated dashboard.
            if (PUBLIC_PAGES.includes(pathname)) {
              const destination = hasWorkspace ? AUTH_REDIRECT_DESTINATION : "/setup";
              // console.log(`[Auth] Redirecting authenticated user from public page (${pathname}) to ${destination}`); // Keep for debugging, remove for production
              router.push(destination);
            }
            // If the user is authenticated and NOT on a public page,
            // assume they are on a valid protected page (like /project/[id]) and do nothing.
            // This allows them to access all protected pages without defining each one.

          } else {
            // Firebase user exists but GraphQL 'me' query failed. Force logout.
            console.error("[Auth] onAuthStateChanged -> Firebase user present but GraphQL 'me' data is null. Forcing logout.");
            await signOut(auth);
            setCurrentUser(null);
            client.resetStore();
            router.push("/login");
          }
        } else {
          // No Firebase user (logged out or never logged in)
          // console.log("[Auth] onAuthStateChanged -> no user, setting currentUser to null"); // Keep for debugging, remove for production
          setCurrentUser(null);
          client.resetStore(); // Clear Apollo cache on no user
          
          // **THE CLEANEST REDIRECT LOGIC FOR UNAUTHENTICATED USERS**
          // If the user is not logged in and tries to access a non-public page,
          // redirect them to the login page.
          if (!PUBLIC_PAGES.includes(pathname)) {
            // console.log(`[Auth] Redirecting unauthenticated user from protected page (${pathname}) to /login`); // Keep for debugging, remove for production
            router.push("/login");
          }
          // If the user is not logged in and on a public page, do nothing.
        }
      } catch (err: any) {
        console.error("[Auth] onAuthStateChanged error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      // console.log("[Auth] useEffect cleanup -> unsubscribe onAuthStateChanged"); // Keep for debugging, remove for production
      unsubscribe();
    };
  }, [fetchMe, router, pathname, client]); // Added client to dependency array

  return {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
  };
}