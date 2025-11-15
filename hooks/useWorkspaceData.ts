// hooks/useWorkspaceData.ts
import { useQuery } from "@apollo/client";
import { GET_WORKSPACE_DATA_QUERY } from "@/graphql/queries/getWorkspaceData"; // Adjust path

// Define the type for the data returned by the query
interface UserPartial {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface WorkspaceMemberData {
  id: string; // This is the WorkspaceMember ID
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST"; // Use your actual WorkspaceRole enum values
  user: UserPartial;
}

interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED" | "CANCELLED"; // ProjectStatus enum
  projectMemberCount: number;
  totalTaskCount: number;
  completedTaskCount: number;
}

interface WorkspaceData {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  teamSize?: string;
  workFields?: string[];
  members: WorkspaceMemberData[];
  projects: ProjectData[];
}

interface GetWorkspaceDataResponse {
  getWorkspaceData: WorkspaceData ;
}

export function useWorkspaceData() {
  const { data, loading, error, refetch } = useQuery<GetWorkspaceDataResponse>(GET_WORKSPACE_DATA_QUERY, {
    fetchPolicy: "network-only", // Ensure fresh data on initial load
    // No variables needed as userId is implicitly from context
  });

  return {
    workspaceData: data?.getWorkspaceData,
    loading,
    error,
    refetchWorkspaceData: refetch,
  };
}