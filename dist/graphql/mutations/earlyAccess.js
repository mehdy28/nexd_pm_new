import { gql } from "@apollo/client";
export const CREATE_EARLY_ACCESS_USER = gql `
  mutation CreateEarlyAccessUser($name: String!, $email: String!) {
    createEarlyAccessUser(name: $name, email: $email) {
      id
      name
      email
      createdAt
    }
  }
`;
