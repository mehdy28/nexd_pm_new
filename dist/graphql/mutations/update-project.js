import { gql } from '@apollo/client';
export const UPDATE_PROJECT_MUTATION = gql `
  mutation UpdateProject($input: UpdateProjectInput!) {
    updateProject(input: $input) {
      id
      name
      description
      color
      status
    }
  }
`;
