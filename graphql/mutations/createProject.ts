// graphql/mutations/createProject.ts

import { gql } from '@apollo/client';

export const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject(
    $workspaceId: ID!
    $name: String!
    $description: String
    # You might want to add default color, status, start/end dates if needed,
    # or handle them in the resolver with default values.
  ) {
    createProject(
      workspaceId: $workspaceId
      name: $name
      description: $description
    ) {
      id
      name
      description
      status
      color # Assuming project color is returned
      createdAt
      # Include necessary fields to update cache or show immediately
      members {
        id
        role
        user {
          id
          email
        }
      }
      sprints {
        id
        name
        startDate
      }
      sections {
        id
        name
        order
      }
      # You might want to fetch projectMemberCount, totalTaskCount, completedTaskCount
      # if you want to update the useWorkspaceData cache with fresh project counts.
      # For now, we'll rely on refetching the whole workspace data.
    }
  }
`;