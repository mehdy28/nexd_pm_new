// graphql/queries/getWorkspaceData.ts

import { gql } from '@apollo/client';

export const GET_WORKSPACE_DATA_QUERY = gql`
  query GetWorkspaceData {
    # This query implies that the user's workspace context is implicit
    # and the server will determine which workspace data to return for the authenticated user.
    getWorkspaceData {
      id
      name
      description
      # New fields for Workspace
      industry
      teamSize
      workFields
      members {
        id
        role
        user {
          id
          email
          firstName
          lastName
        }
      }
      projects {
        id
        name
        description
        status
        # Custom fields (resolved by the backend)
        projectMemberCount
        totalTaskCount
        completedTaskCount
      }
    }
  }
`;