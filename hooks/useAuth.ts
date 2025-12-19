import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useApolloClient } from "@apollo/client";
import { CREATE_USER, RESEND_VERIFICATION_EMAIL } from "@/graphql/mutations/register"; // Import here
import { REQUEST_PASSWORD_RESET } from "@/graphql/mutations/auth";
import { ME_QUERY } from "@/graphql/queries/me";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  EmailAuthProvider,  
  reauthenticateWithCredential,
  updatePassword,
  onAuthStateChanged,
  confirmPasswordReset,
  User as FirebaseUser,
} from "firebase/auth";
import app from "@/lib/firebase";

const auth = getAuth(app);

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  avatarColor?: string;
  name?: string; 
  role: string;
  emailVerified: boolean;
  ownedWorkspaces?: { id: string; name: string }[];
  workspaceMembers?: { workspace: { id: string } }[];
  hasWorkspace?: boolean;
}

const setAuthCookies = (token: string | null, user: User | null = null) => {
  if (token) {
    console.log("[useAuth] Setting session cookie.");
    document.cookie = `session=${token}; path=/; SameSite=Lax`;
    if (user) {
      console.log("[useAuth] Setting user-metadata cookie.");
      const hasWorkspace = (user.ownedWorkspaces?.length ?? 0) > 0 || (user.workspaceMembers?.length ?? 0) > 0;
      const metadata = {
        role: user.role,
        emailVerified: user.emailVerified,
        hasWorkspace
      };
      document.cookie = `user-metadata=${JSON.stringify(metadata)}; path=/; SameSite=Lax`;
    }
  } else {
    console.log("[useAuth] Clearing auth cookies.");
    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user-metadata=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
};

export function useAuth() {
  const router = useRouter();
  const client = useApolloClient();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createUser] = useMutation(CREATE_USER);
  const [requestReset] = useMutation(REQUEST_PASSWORD_RESET);
  
  
  const [resendEmailMutation] = useMutation(RESEND_VERIFICATION_EMAIL);

  const fetchMe = useCallback(async (): Promise<User | null> => {
    const user = auth.currentUser;
    if (!user) {
      console.log("[useAuth][fetchMe] No Firebase user found.");
      return null;
    }

    try {
      console.log("[useAuth][fetchMe] Fetching user profile from GraphQL...");
      const token = await user.getIdToken();
      const { data } = await client.query({
        query: ME_QUERY,
        context: { headers: { Authorization: `Bearer ${token}` } },
        fetchPolicy: "network-only", 
      });
      
      const me = data?.me ?? null;
      if (me) {
        console.log("[useAuth][fetchMe] Profile found:", me.email);
        const hasWorkspace = (me.ownedWorkspaces?.length ?? 0) > 0 || (me.workspaceMembers?.length ?? 0) > 0;
        const enrichedUser = { ...me, hasWorkspace };
        setAuthCookies(token, enrichedUser);
        return enrichedUser;
      }
      
      console.log("[useAuth][fetchMe] No profile returned from GraphQL.");
      setAuthCookies(token, null);
      return null;
    } catch (err) {
      console.error("[useAuth][fetchMe] Error fetching profile:", err);
      return null;
    }
  }, [client]);

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string, invitationToken: string | null, role: "MEMBER" | "ADMIN" = "MEMBER") => {
      console.log("[useAuth][register] Registration initiated for:", email);
      setLoading(true);
      setError(null);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        console.log("[useAuth][register] Firebase user created:", firebaseUser.uid);
        
        const firebaseIdToken = await firebaseUser.getIdToken();
        console.log("[useAuth][register] Token acquired. Setting initial session cookie.");
        setAuthCookies(firebaseIdToken, null);

        console.log("[useAuth][register] Calling createUser mutation...");
        await createUser({
          variables: { email, firstName, lastName, role, invitationToken },
          context: { headers: { Authorization: `Bearer ${firebaseIdToken}` } },
        });

        console.log("[useAuth][register] Mutation successful. Verifying profile...");
        const me = await fetchMe();
        if (me) {
          setCurrentUser(me);
        } else {
          console.warn("[useAuth][register] Profile not found immediately. Setting local placeholder.");
          setCurrentUser({ email: firebaseUser.email, emailVerified: false, role } as any);
        }
        
        console.log("[useAuth][register] Redirecting to /check-email");
        router.push("/check-email");
      } catch (err: any) {
        console.error("[useAuth][register] Registration error:", err.message);
        await signOut(auth);
        setAuthCookies(null, null);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [createUser, fetchMe, router]
  );

  const login = useCallback(
    async (email: string, password: string, invitationToken: string | null = null) => {
      console.log("[useAuth][login] Login initiated for:", email);
      setLoading(true);
      setError(null);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("[useAuth][login] Firebase login successful.");
        const me = await fetchMe();
        if (me) {
          setCurrentUser(me);
          if (!me.emailVerified) {
            console.log("[useAuth][login] Email not verified. Redirecting to /check-email.");
            router.push("/check-email");
          } else {
            const dest = me.role === "ADMIN" ? "/admin-dashboard" : (me.hasWorkspace ? "/workspace" : "/setup");
            console.log("[useAuth][login] Success. Redirecting to:", dest);
            router.push(dest);
          }
        } else {
          console.error("[useAuth][login] Profile not found after login. Signing out.");
          await signOut(auth);
          setAuthCookies(null, null);
        }
      } catch (err: any) {
        console.error("[useAuth][login] Login error:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [fetchMe, router]
  );

  const logout = useCallback(async () => {
    console.log("[useAuth][logout] Logging out...");
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setAuthCookies(null, null);
      setCurrentUser(null);
      client.resetStore();
      router.push("/login");
    } catch (err: any) {
      console.error("[useAuth][logout] Error during logout:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router, client]);

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await requestReset({ variables: { email } });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [requestReset]);

  const confirmNewPassword = useCallback(async (oobCode: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  const resendVerificationEmail = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await resendEmailMutation({ variables: { email } });
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [resendEmailMutation]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("User not authenticated");
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      console.log("[useAuth][Observer] Auth state changed. User:", user ? user.email : "none");
      setLoading(true);
      try {
        if (user) {
          const me = await fetchMe();
          if (me) {
            setCurrentUser(me);
          } else {
            console.log("[useAuth][Observer] No profile record found yet.");
            const token = await user.getIdToken();
            setAuthCookies(token, null);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
          setAuthCookies(null, null);
          client.resetStore(); 
        }
      } catch (err: any) {
        console.error("[useAuth][Observer] Error in auth observer:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchMe, client]); 

  return {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword,
    confirmNewPassword,
    changePassword,
    resendVerificationEmail,
    fetchMe
  };
}

export function useAdminRegistration() {
  const { register, loading, error } = useAuth();

  const registerAdmin = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      await register(email, password, firstName, lastName, null, "ADMIN");
    },
    [register]
  );

  return { registerAdmin, loading, error };
}





