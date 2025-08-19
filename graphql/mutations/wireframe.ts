import { gql } from "@apollo/client"

export const CREATE_WIREFRAME = gql`
  mutation CreateWireframe($input: CreateWireframeInput!) {
    createWireframe(input: $input) {
      id
      title
      data
      thumbnail
      createdAt
      project {
        id
        name
      }
    }
  }
`

export const UPDATE_WIREFRAME = gql`
  mutation UpdateWireframe($id: ID!, $input: UpdateWireframeInput!) {
    updateWireframe(id: $id, input: $input) {
      id
      title
      data
      thumbnail
      updatedAt
    }
  }
`

export const DELETE_WIREFRAME = gql`
  mutation DeleteWireframe($id: ID!) {
    deleteWireframe(id: $id)
  }
`
