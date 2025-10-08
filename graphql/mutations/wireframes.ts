// src/graphql/mutations/wireframes.ts
import { gql } from "@apollo/client";

export const CREATE_WIREFRAME = gql`
  mutation CreateWireframe($input: CreateWireframeInput!) {
    createWireframe(input: $input) {
      id
      title
      updatedAt
      thumbnail
      projectId
    }
  }
`;

export const UPDATE_WIREFRAME = gql`
  mutation UpdateWireframe($input: UpdateWireframeInput!) {
    updateWireframe(input: $input) {
      id
      title
      updatedAt
      thumbnail
      projectId
    }
  }
`;

export const DELETE_WIREFRAME = gql`
  mutation DeleteWireframe($id: ID!) {
    deleteWireframe(id: $id) {
      id
      title
      projectId
    }
  }
`;