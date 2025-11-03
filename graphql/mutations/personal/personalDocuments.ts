import { gql } from "@apollo/client"

export const CREATE_PERSONAL_DOCUMENT = gql`
  mutation CreatePersonalDocument($input: CreatePersonalDocumentInput!) {
    createPersonalDocument(input: $input) {
      id
      title
      updatedAt
      type
      projectId
    }
  }
`

export const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($input: UpdateDocumentInput!) {
    updateDocument(input: $input) {
      id
      title
      updatedAt
      type
      projectId
    }
  }
`

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id) {
      id
      title
      updatedAt
      type
      projectId
    }
  }
`