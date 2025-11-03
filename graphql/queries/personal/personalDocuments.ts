import { gql } from "@apollo/client"

export const GET_MY_DOCUMENTS = gql`
  query GetMyDocuments($search: String, $skip: Int, $take: Int) {
    getMyDocuments(search: $search, skip: $skip, take: $take) {
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
        __typename
      }
      __typename
    }
  }
`