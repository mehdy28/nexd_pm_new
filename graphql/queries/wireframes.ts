// src/graphql/queries/wireframes.ts
import { gql } from "@apollo/client";

// Query to get a list of wireframes for a specific project
export const GET_PROJECT_WIREFRAMES = gql`
  query GetProjectWireframes($projectId: ID!) {
    getProjectWireframes(projectId: $projectId) {
      id
      title
      updatedAt
      thumbnail
      projectId
    }
  }
`;

// Query to get full details of a single wireframe
export const GET_WIREFRAME_DETAILS = gql`
  query GetWireframeDetails($id: ID!) {
    getWireframeDetails(id: $id) {
      id
      title
      data
      thumbnail
      createdAt
      updatedAt
      project {
        id
        name
      }
      personalUser { # Include if personal wireframes are also fetched by this query
        id
        firstName
        lastName
      }
    }
  }
`;