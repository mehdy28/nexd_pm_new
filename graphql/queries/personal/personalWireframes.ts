import { gql } from "@apollo/client"

// Query to get a list of personal wireframes for the current user
export const GET_MY_WIREFRAMES = gql`
  query GetMyWireframes($search: String, $skip: Int, $take: Int) {
    getMyWireframes(search: $search, skip: $skip, take: $take) {
      wireframes {
        id
        title
        updatedAt
        data
        thumbnail
        projectId
      }
      totalCount
    }
  }
`

// Query to get full details of a single wireframe (can be personal or project-based)
export const GET_WIREFRAME_DETAILS = gql`
  query GetWireframeDetails($id: ID!) {
    getWireframeDetails(id: $id) {
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
`