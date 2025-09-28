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
    console.log("[Auth] fetchMe -> current Firebase user:", user);
    if (!user) return null;

    try {
      const token = await user.getIdToken();
      console.log("[Auth] fetchMe -> Firebase token:", token);

      const { data } = await client.query({
        query: ME_QUERY,
        context: { headers: { Authorization: `Bearer ${token}` } },
        fetchPolicy: "network-only", // Always get fresh data for the primary auth check
      });

      console.log("[Auth] fetchMe -> GraphQL me data:", data?.me);
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
      console.log("[Auth] register -> called with:", { email, firstName, lastName });
      setLoading(true);
      setError(null);

      try {
        // Step 1: Firebase registration
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        if (!firebaseUser) throw new Error("Firebase registration failed");

        console.log("[Auth] register -> Firebase registration success:", firebaseUser);

        const firebaseIdToken = await firebaseUser.getIdToken();
        console.log("[Auth] register -> Firebase ID Token for GraphQL:", firebaseIdToken);


        // Step 2: Create user in Postgres via GraphQL
        await createUser({
          variables: {
            email,
            firstName,
            lastName,
            // If your GraphQL schema expects a 'name' field, uncomment this line.
            // It's generally better for the backend to derive 'name' from first/last if possible.
            // name: `${firstName} ${lastName}`,
            role: "MEMBER"
          },
          context: {
            headers: {
              Authorization: `Bearer ${firebaseIdToken}`,
            },
          },
          // Crucially: Update Apollo cache after successful user creation
          update(cache, { data: { createUser: newUserData } }) {
            cache.writeQuery({
              query: ME_QUERY,
              data: {
                me: {
                  ...newUserData, // New user data from the mutation result
                  hasWorkspace: false, // Default for new users
                  // Ensure these match your ME_QUERY and schema
                  ownedWorkspaces: [],
                  workspaceMembers: [],
                  __typename: "User", // Required by Apollo Client for type inference
                },
              },
            });
            console.log("[Auth] register -> Apollo cache updated with new user");
          },
        });
        console.log("[Auth] register -> GraphQL user created");

        // Step 3: Now fetch user info (it will likely hit cache after the update)
        const me = await fetchMe();
        console.log("[Auth] register -> fetched me:", me);

        if (me) {
          const hasWorkspace =
            (me.ownedWorkspaces?.length ?? 0) > 0 ||
            (me.workspaceMembers?.length ?? 0) > 0;

          setCurrentUser({ ...me, hasWorkspace });
          router.push(hasWorkspace ? "/workspace" : "/setup");
        } else {
            console.warn("[Auth] register -> `me` query returned null after successful registration. This should not happen if cache update was successful.");
            router.push("/setup"); // Fallback
        }

      } catch (err: any) {
        setError(err.message);
        console.error("[Auth] register -> error:", err);
        // Ensure logout if GraphQL user creation fails
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
      console.log("[Auth] login -> called with:", { email });
      setLoading(true);
      setError(null);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("[Auth] login -> Firebase signIn success");

        // Fetch me data. This also populates the Apollo cache.
        const me = await fetchMe();
        console.log("[Auth] login -> fetched me:", me);

        if (me) {
          const hasWorkspace =
            (me.ownedWorkspaces?.length ?? 0) > 0 ||
            (me.workspaceMembers?.length ?? 0) > 0;

          setCurrentUser({ ...me, hasWorkspace });
          console.log("[Auth] login -> set currentUser, redirecting to:", hasWorkspace ? "/workspace" : "/setup");
          router.push(hasWorkspace ? "/workspace" : "/setup");
        } else {
          // If login is successful but 'me' data can't be fetched, it's an issue.
          // Force logout to avoid partially authenticated state.
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
    console.log("[Auth] logout -> called");
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      console.log("[Auth] logout -> Firebase signOut success");
      setCurrentUser(null);
      // Clear Apollo cache on logout to prevent stale data for next user
      client.resetStore();
      router.push("/login");
    } catch (err: any) {
      console.error("[Auth] logout error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router, client]); // Added client to dependency array

  // ----------------------------
  // Listen to Firebase auth changes
  // ----------------------------
  useEffect(() => {
    console.log("[Auth] useEffect -> onAuthStateChanged subscribe");
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      console.log("[Auth] onAuthStateChanged -> user:", user);
      setLoading(true);
      try {
        if (user) {
          const me = await fetchMe();
          console.log("[Auth] onAuthStateChanged -> fetched me:", me);

          if (me) {
            const hasWorkspace =
              (me.ownedWorkspaces?.length ?? 0) > 0 ||
              (me.workspaceMembers?.length ?? 0) > 0;

            setCurrentUser({ ...me, hasWorkspace });
            const publicPages = ["/login", "/register", "/forgot-password", "/blog", "/page"]; // Added /forgot-password, /blog, /page (root)
            if (!publicPages.includes(pathname)) {
              console.log("[Auth] onAuthStateChanged -> redirecting to:", hasWorkspace ? "/workspace" : "/setup");
              router.push(hasWorkspace ? "/workspace" : "/setup");
            }
          } else {
            // Firebase user exists but GraphQL 'me' query failed. Force logout.
            console.error("[Auth] onAuthStateChanged -> Firebase user present but GraphQL 'me' data is null. Forcing logout.");
            await signOut(auth);
            setCurrentUser(null);
            client.resetStore();
            router.push("/login");
          }
        } else {
          console.log("[Auth] onAuthStateChanged -> no user, setting currentUser to null");
          setCurrentUser(null);
          // Clear Apollo cache on no user to prevent stale data
          client.resetStore();
          const publicPages = ["/login", "/register", "/forgot-password", "/blog", "/page"];
          if (!publicPages.includes(pathname)) {
            console.log("[Auth] onAuthStateChanged -> redirecting to /login");
            router.push("/login");
          }
        }
      } catch (err: any) {
        console.error("[Auth] onAuthStateChanged error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log("[Auth] useEffect cleanup -> unsubscribe onAuthStateChanged");
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