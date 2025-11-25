import { gql } from "@apollo/client"



export // Updated Query to fetch comments
const GET_DOCUMENT_DETAILS_WITH_COMMENTS = gql`
  query GetDocumentDetails($id: ID!) {
    getDocumentDetails(id: $id) {
      id
      title
      content
      dataUrl
      type
      updatedAt
      comments {
        id
        content
        createdAt
        author {
          id
          firstName
          lastName
          avatar
          avatarColor

        }
      }
    }
  }
`






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