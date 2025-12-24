// src/graphql/queries/Whiteboards.ts
import { gql } from "@apollo/client";
// Query to get a list of Whiteboards for a specific project
export const GET_PROJECT_WhiteboardS = gql `
  query GetProjectWhiteboards($projectId: ID!, $search: String, $skip: Int, $take: Int) {
    getProjectWhiteboards(projectId: $projectId, search: $search, skip: $skip, take: $take) {
      Whiteboards {
        id
        title
        updatedAt
        thumbnail
        data
        projectId
      }
      totalCount
    }
  }
`;
// Query to get full details of a single Whiteboard
export const GET_WHITEBOARD_DETAILS = gql `
  query GetWhiteboardDetails($id: ID!) {
    getWhiteboardDetails(id: $id) {
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
      personalUser {
        id
        firstName
        lastName
      }
    }
  }
`;
