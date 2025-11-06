// hooks/useUser.ts
import { useAuth } from "./useAuth";

/**
 * Provides a simplified interface to access the current authenticated user's data.
 * This hook is a lightweight wrapper around the more comprehensive `useAuth` hook.
 *
 * @returns An object containing the current user, loading state, and an authentication flag.
 */
export function useUser() {
  const { currentUser, loading } = useAuth();

  return {
    /** The authenticated user object, or null if not logged in. */
    user: currentUser,
    /** A boolean flag indicating if the user data is currently being fetched. */
    isLoading: loading,
    /** A derived boolean indicating if the user is authenticated. */
    isAuthenticated: !loading && !!currentUser,
  };
}