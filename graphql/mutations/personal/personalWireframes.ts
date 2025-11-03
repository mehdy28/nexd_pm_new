import { gql } from "@apollo/client"

export const CREATE_PERSONAL_WIREFRAME = gql`
  mutation CreatePersonalWireframe($input: CreatePersonalWireframeInput!) {
    createPersonalWireframe(input: $input) {
      id
      title
      updatedAt
      thumbnail
      projectId
    }
  }
`

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
`

export const DELETE_WIREFRAME = gql`
  mutation DeleteWireframe($id: ID!) {
    deleteWireframe(id: $id) {
      id
      title
      projectId
    }
  }
`