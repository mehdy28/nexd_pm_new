import { gql } from "@apollo/client";

export const GET_EARLY_ACCESS_USERS = gql`
  query GetEarlyAccessUsers {
    earlyAccessUsers {
      id
      name
      email
      createdAt
    }
  }
`;