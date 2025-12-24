import { gql } from "apollo-server-core";
export const typeDefs = gql `
  type Query {
    me: User
  }

  type Mutation {
    registerUser(idToken: String!): User
  }

  type User {
    id: ID!
    email: String!
    name: String
    role: UserRole!
  }

  enum UserRole {
    ADMIN
    MEMBER
  }
`;
