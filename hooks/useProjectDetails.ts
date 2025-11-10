import { useQuery } from "@apollo/client";
import { GET_PROJECT_DETAILS_QUERY } from "@/graphql/queries/getProjectDetails"; // Adjust path

// Define the types to match your GraphQL schema for ProjectDetails
interface UserFullDetails {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface ProjectMemberDetails {
  id: string; // ProjectMember ID
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"; // ProjectRole enum
  user: UserFullDetails;
}

interface SprintDetails {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  status: "PLANNING" | "ACTIVE" | "COMPLETED"; // Corresponds to your derived status
}

// Add this interface
interface WorkspacePartial {
  id: string;
}

interface ProjectDetailsResponse {
  getProjectDetails: {
    id: string;
    name: string;
    description?: string;
    status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED" | "CANCELLED"; // ProjectStatus enum
    color: string;
    createdAt: string;

    workspace: WorkspacePartial; // Add this line

    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    upcomingDeadlines: number;

    members: ProjectMemberDetails[];
    sprints: SprintDetails[];
    // activities: ActivityDetails[]; // Uncomment if needed
  } | null;
}

export function useProjectDetails(projectId: string) {
  const { data, loading, error, refetch } = useQuery<ProjectDetailsResponse>(GET_PROJECT_DETAILS_QUERY, {
    variables: { projectId },
    skip: !projectId, // Skip query if projectId is not provided
    fetchPolicy: "network-only", // Always get fresh data for a project overview
  });

  // Helper to map Prisma ProjectStatus to your UI's display text for badges/colors
  const getDisplayStatus = (status: string) => {
    switch (status) {
      case "ACTIVE": return "Active";
      case "PLANNING": return "Planning";
      case "ON_HOLD": return "On Hold";
      case "COMPLETED": return "Completed";
      case "ARCHIVED": return "Archived";
      case "CANCELLED": return "Cancelled";
      default: return status;
    }
  };

  return {
    projectDetails: data?.getProjectDetails ? {
      ...data.getProjectDetails,
      displayStatus: getDisplayStatus(data.getProjectDetails.status),
      // If you decide to store project color as an enum or hex code in DB,
      // it would directly come from data.getProjectDetails.color
      // For now, assuming it's fetched directly
    } : null,
    loading,
    error,
    refetchProjectDetails: refetch,
  };
}