import { gql } from "@apollo/client";

export const CREATE_USER = gql`
  mutation CreateUser(
    $email: String!
    $firstName: String
    $lastName: String
    $role: UserRole
    $invitationToken: String
  ) {
    createUser(
      email: $email
      firstName: $firstName
      lastName: $lastName
      role: $role
      invitationToken: $invitationToken
    ) {
      id
      email
      firstName
      lastName
      role
    }
  }
`;