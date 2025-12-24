import { gql } from '@apollo/client';
export const DELETE_PROJECT_MUTATION = gql `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) {
      id
      name
    }
  }
`;
