import { gql } from "@apollo/client";

export const CREATE_Whiteboard = gql`
  mutation CreateWhiteboard($input: CreateWhiteboardInput!) {
    createWhiteboard(input: $input) {
      id
      title
      updatedAt
      thumbnail
      projectId
    }
  }
`;

export const UPDATE_Whiteboard = gql`
  mutation UpdateWhiteboard($input: UpdateWhiteboardInput!) {
    updateWhiteboard(input: $input) {
      id
      title
      updatedAt
      thumbnail
      projectId
    }
  }
`;

export const DELETE_Whiteboard = gql`
  mutation DeleteWhiteboard($id: ID!) {
    deleteWhiteboard(id: $id) {
      id
      title
      projectId
    }
  }
`;

export const DELETE_MANY_WhiteboardS = gql`
  mutation DeleteManyWhiteboards($ids: [ID!]!) {
    deleteManyWhiteboards(ids: $ids) {
      count
    }
  }
`;