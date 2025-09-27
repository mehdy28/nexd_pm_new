
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

interface User {
  id: string;
  email: string;
  firstName?: string; // Added firstName
  lastName?: string;  // Added lastName
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
        fetchPolicy: "network-only",
      });

      console.log("[Auth] fetchMe -> GraphQL me data:", data?.me);
      return data?.me ?? null;
    } catch (err) {
      console.error("[Auth] fetchMe error:", err);
      return null;
    }
  }, [client]);

  // ----------------------------
  // Register
  // ----------------------------
  const register = useCallback(
    // MODIFIED SIGNATURE: Now accepts firstName and lastName
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
          // MODIFIED VARIABLES: Pass firstName and lastName separately
          // And construct the full 'name' field if your schema requires it
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
        });
        console.log("[Auth] register -> GraphQL user created");

        // Step 3: Now fetch user info
        const me = await fetchMe();
        console.log("[Auth] register -> fetched me:", me);

        if (me) {
          const hasWorkspace =
            (me.ownedWorkspaces?.length ?? 0) > 0 ||
            (me.workspaceMembers?.length ?? 0) > 0;

          setCurrentUser({ ...me, hasWorkspace });
          router.push(hasWorkspace ? "/workspace" : "/setup");
        } else {
            console.warn("[Auth] register -> `me` query returned null after successful registration. User might not be fully synchronized yet.");
            router.push("/setup");
        }

      } catch (err: any) {
        setError(err.message);
        console.error("[Auth] register -> error:", err);
      } finally {
        setLoading(false);
      }
    },
    // Dependency array updated
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

        const me = await fetchMe();
        console.log("[Auth] login -> fetched me:", me);

        if (me) {
          const hasWorkspace =
            (me.ownedWorkspaces?.length ?? 0) > 0 ||
            (me.workspaceMembers?.length ?? 0) > 0;

          setCurrentUser({ ...me, hasWorkspace });
          console.log("[Auth] login -> set currentUser, redirecting to:", hasWorkspace ? "/workspace" : "/setup");
          router.push(hasWorkspace ? "/workspace" : "/setup");
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
      router.push("/login");
    } catch (err: any) {
      console.error("[Auth] logout error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

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
            const publicPages = ["/login", "/register"];
            if (!publicPages.includes(pathname)) {
              console.log("[Auth] onAuthStateChanged -> redirecting to:", hasWorkspace ? "/workspace" : "/setup");
              router.push(hasWorkspace ? "/workspace" : "/setup");
            }
          }
        } else {
          console.log("[Auth] onAuthStateChanged -> no user, setting currentUser to null");
          setCurrentUser(null);
          const publicPages = ["/login", "/register"];
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
  }, [fetchMe, router, pathname]);

  return {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
  };
}