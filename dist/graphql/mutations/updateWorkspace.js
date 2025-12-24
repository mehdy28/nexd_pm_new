import { gql } from "@apollo/client";
export const UPDATE_WORKSPACE_MUTATION = gql `
  mutation UpdateWorkspace($input: UpdateWorkspaceInput!) {
    updateWorkspace(input: $input) {
      id
      name
      description
      industry
      teamSize
      workFields
    }
  }
`;
