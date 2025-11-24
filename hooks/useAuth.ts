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
  avatarColor?: string;
  name?: string; // Keep 'name' if it exists in your schema/Prisma User model
  role: string;
  ownedWorkspaces?: { id: string; name: string }[];
  workspaceMembers?: { workspace: { id: string } }[];
  hasWorkspace?: boolean;
}

// Define your public pages. These are pages anyone can visit, logged in or not.
const PUBLIC_PAGES = ["/login", "/register", "/forgot-password", "/blog", "/"]; 

// Define where an authenticated user should go if they land on a public page
const AUTH_REDIRECT_DESTINATION = "/workspace"; 

// Helper function to determine the correct redirection path based on role and workspace status
const getRedirectPath = (user: User | null): string => {
    if (!user) return "/login";

    const hasWorkspace =
        (user.ownedWorkspaces?.length ?? 0) > 0 ||
        (user.workspaceMembers?.length ?? 0) > 0;

    if (user.role === "ADMIN") {
        // Redirection for Admin role
        return "/admin-dashboard"; 
    } else { 
        // Redirection for MEMBER role
        return hasWorkspace ? "/workspace" : "/setup";
    }
};

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
    // console.log("[Auth] fetchMe -> current Firebase user:", user); 
    if (!user) return null;

    try {
      const token = await user.getIdToken();
      // console.log("[Auth] fetchMe -> Firebase token:", token); 

      const { data } = await client.query({
        query: ME_QUERY,
        context: { headers: { Authorization: `Bearer ${token}` } },
        fetchPolicy: "network-only", 
      });

      // console.log("[Auth] fetchMe -> GraphQL me data:", data?.me); 
      return data?.me ?? null;
    } catch (err) {
      console.error("[Auth] fetchMe error:", err);
      setCurrentUser(null);
      await signOut(auth); 
      return null;
    }
  }, [client]);

  // ----------------------------
  // Register (MODIFIED TO ACCEPT ROLE)
  // ----------------------------
  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      invitationToken: string | null,
      role: "MEMBER" | "ADMIN" = "MEMBER"
    ) => {
      // console.log("[Auth] register -> called with:", { email, firstName, lastName, role }); 
      setLoading(true);
      setError(null);

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        if (!firebaseUser) throw new Error("Firebase registration failed");

        // console.log("[Auth] register -> Firebase registration success:", firebaseUser); 

        const firebaseIdToken = await firebaseUser.getIdToken();
        // console.log("[Auth] register -> Firebase ID Token for GraphQL:", firebaseIdToken); 


        await createUser({
          variables: {
            email,
            firstName,
            lastName,
            role,
            invitationToken,
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
            // console.log("[Auth] register -> Apollo cache updated with new user"); 
          },
        });
        // console.log("[Auth] register -> GraphQL user created"); 

        const me = await fetchMe();
        // console.log("[Auth] register -> fetched me:", me); 

        if (me) {
          const hasWorkspace =
            (me.ownedWorkspaces?.length ?? 0) > 0 ||
            (me.workspaceMembers?.length ?? 0) > 0;

          const currentUserData: User = { ...me, hasWorkspace };
          setCurrentUser(currentUserData);
          
          const destination = getRedirectPath(currentUserData);
          router.push(destination);

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
  // Login (MODIFIED REDIRECTION)
  // ----------------------------
  const login = useCallback(
    async (email: string, password: string) => {
      // console.log("[Auth] login -> called with:", { email }); 
      setLoading(true);
      setError(null);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // console.log("[Auth] login -> Firebase signIn success"); 

        const me = await fetchMe();
        // console.log("[Auth] login -> fetched me:", me); 

        if (me) {
          const hasWorkspace =
            (me.ownedWorkspaces?.length ?? 0) > 0 ||
            (me.workspaceMembers?.length ?? 0) > 0;

          const currentUserData: User = { ...me, hasWorkspace };
          setCurrentUser(currentUserData);
          
          // Determine path based on role/workspace logic
          const destination = getRedirectPath(currentUserData); 
          
          // console.log("[Auth] login -> set currentUser, redirecting to:", destination); 
          router.push(destination);
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
    // console.log("[Auth] logout -> called"); 
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      // console.log("[Auth] logout -> Firebase signOut success"); 
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
  // Listen to Firebase auth changes and handle redirects (MODIFIED REDIRECTION)
  // ----------------------------
  useEffect(() => {
    // console.log("[Auth] useEffect -> onAuthStateChanged subscribe"); 
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      // console.log("[Auth] onAuthStateChanged -> user:", user); 
      setLoading(true);
      try {
        if (user) {
          // User is logged in via Firebase
          const me = await fetchMe();
          // console.log("[Auth] onAuthStateChanged -> fetched me:", me); 

          if (me) {
            // User data successfully retrieved from GraphQL
            const hasWorkspace =
              (me.ownedWorkspaces?.length ?? 0) > 0 ||
              (me.workspaceMembers?.length ?? 0) > 0;

            const currentUserData: User = { ...me, hasWorkspace };
            setCurrentUser(currentUserData);

            // Redirect authenticated users from public pages
            if (PUBLIC_PAGES.includes(pathname)) {
              const destination = getRedirectPath(currentUserData); 
              // console.log(`[Auth] Redirecting authenticated user from public page (${pathname}) to ${destination}`); 
              router.push(destination);
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
          // No Firebase user (logged out or never logged in)
          // console.log("[Auth] onAuthStateChanged -> no user, setting currentUser to null"); 
          setCurrentUser(null);
          client.resetStore(); 
          
          // Redirect unauthenticated users from protected pages
          if (!PUBLIC_PAGES.includes(pathname)) {
            // console.log(`[Auth] Redirecting unauthenticated user from protected page (${pathname}) to /login`); 
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
      // console.log("[Auth] useEffect cleanup -> unsubscribe onAuthStateChanged"); 
      unsubscribe();
    };
  }, [fetchMe, router, pathname, client]); 

  return {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
  };
}

// ----------------------------
// NEW HOOK: useAdminRegistration
// ----------------------------
export function useAdminRegistration() {
  const { register, loading, error } = useAuth();

  const registerAdmin = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      // Calls the primary register function, explicitly passing 'ADMIN' as the role.
      await register(email, password, firstName, lastName, null, "ADMIN");
    },
    [register]
  );

  return { registerAdmin, loading, error };
}