import { useQuery } from "@apollo/client"
import {
  GET_PROJECT_HEADER_DATA,
  GetProjectHeaderDataResponse,
  GetProjectHeaderDataVariables,
} from "@/graphql/queries/project.queries"

/**
 * A custom hook to fetch the header data for a specific project.
 *
 * @param projectId The ID of the project to fetch.
 * @returns An object containing the project data, loading state, and any errors.
 */
export const useProjectHeader = (projectId: string) => {
  const { data, loading, error } = useQuery<GetProjectHeaderDataResponse, GetProjectHeaderDataVariables>(
    GET_PROJECT_HEADER_DATA,
    {
      // Pass the projectId as a variable to the query
      variables: { projectId },
      // Important: Do not run the query if projectId is not yet available
      skip: !projectId,
    }
  )

  return {
    // Return the project data, unwrapped from the query response for easier access
    project: data?.getProjectHeaderData,
    loading,
    error,
  }
}