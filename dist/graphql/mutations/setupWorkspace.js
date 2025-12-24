// graphql/mutations/setupWorkspace.ts
// (Adjust this file, not directly setupWorkspace.ts as that's a string,
// but the file that defines and exports SETUP_WORKSPACE_MUTATION)
// --- ADD THIS IMPORT ---
import { gql } from '@apollo/client';
// -----------------------
/**
 * GraphQL mutation to set up a new workspace, a default project,
 * and initial sprints/sections for a given user.
 */
export const SETUP_WORKSPACE_MUTATION = gql `
  mutation SetupWorkspace(
    $userId: ID!
    $workspaceName: String!
    $workspaceDescription: String
    $projectName: String!
    $projectDescription: String
    $industry: String
    $teamSize: String
    $workFields: [String!]
  ) {
    setupWorkspace(
      userId: $userId
      workspaceName: $workspaceName
      workspaceDescription: $workspaceDescription
      projectName: $projectName
      projectDescription: $projectDescription
      industry: $industry
      teamSize: $teamSize
      workFields: $workFields
    ) {
      id
      name
      slug
      description
      industry
      teamSize
      workFields
      owner {
        id
        email
        firstName
      }
      members {
        id
        role
        user {
          id
          email
        }
      }
      projects {
        id
        name
        description
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
          endDate
        }
        sections {
          id
          name
          order
        }
      }
    }
  }
`;
