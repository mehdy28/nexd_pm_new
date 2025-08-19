import { gql } from "@apollo/client"

export const CREATE_WORKSPACE = gql`
  mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
      id
      name
      slug
      description
      avatar
      plan
      createdAt
      owner {
        id
        name
        email
      }
    }
  }
`

export const UPDATE_WORKSPACE = gql`
  mutation UpdateWorkspace($id: ID!, $input: UpdateWorkspaceInput!) {
    updateWorkspace(id: $id, input: $input) {
      id
      name
      description
      avatar
      updatedAt
    }
  }
`

export const DELETE_WORKSPACE = gql`
  mutation DeleteWorkspace($id: ID!) {
    deleteWorkspace(id: $id)
  }
`
