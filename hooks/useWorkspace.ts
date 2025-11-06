// hooks/useWorkspace.ts
import { useWorkspaceData } from "./useWorkspaceData";

/**
 * Provides a simplified interface for accessing the data of the user's currently active workspace.
 * This is a lightweight wrapper around the `useWorkspaceData` hook.
 *
 * @returns An object containing the current workspace data, loading and error states, and a refetch function.
 */
export function useWorkspace() {
  const { workspaceData, loading, error, refetchWorkspaceData } = useWorkspaceData();

  return {
    /** The data object for the current workspace, or null if not loaded. */
    currentWorkspace: workspaceData,
    /** A boolean flag indicating if the workspace data is currently being fetched. */
    isLoading: loading,
    /** Any error that occurred during fetching. */
    error,
    /** A function to manually refetch the workspace data. */
    refetch: refetchWorkspaceData,
  };
}