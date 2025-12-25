import { gql } from "@apollo/client"

// Define the GraphQL query to fetch the project header data
export const GET_PROJECT_HEADER_DATA = gql`
  query GetProjectHeaderData($projectId: ID!) {
    getProjectHeaderData(projectId: $projectId) {
      id
      name
      description
      color
      status
      workspace {
        id
      }
    }
  }
`

// Define TypeScript types to match the query response for type safety
export interface ProjectHeaderData {
  id: string
  name: string
  description: string | null
  color: string
  status: string // Assuming ProjectStatus enum values are strings
  workspace: {
    id: string
  }
}

export interface GetProjectHeaderDataResponse {
  getProjectHeaderData: ProjectHeaderData | null
}

export interface GetProjectHeaderDataVariables {
  projectId: string
}