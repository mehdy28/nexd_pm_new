// graphql/queries/documents.ts

import { gql } from "@apollo/client"

export const GET_PROJECT_DOCUMENTS = gql`
  query GetProjectDocuments($projectId: ID!, $search: String, $skip: Int, $take: Int) {
    getProjectDocuments(projectId: $projectId, search: $search, skip: $skip, take: $take) {
      documents {
        id
        title
        updatedAt
        type
        projectId
      }
      totalCount
    }
  }
`

// GET_DOCUMENT_DETAILS remains the same
export const GET_DOCUMENT_DETAILS = gql`
 query GetDocumentDetails($id: ID!) {

  getDocumentDetails(id: $id) {
    id
    title
    content
    createdAt
    updatedAt
    project {
      id
      __typename
    }
    personalUser {
      id
      firstName
      lastName
      avatarColor
      __typename
    }
    __typename
  }
}
`