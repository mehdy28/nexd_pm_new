import { gql } from "@apollo/client"

// Query to get a list of personal Whiteboards for the current user
export const GET_MY_WhiteboardS = gql`
  query GetMyWhiteboards($search: String, $skip: Int, $take: Int) {
    getMyWhiteboards(search: $search, skip: $skip, take: $take) {
      Whiteboards {
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

// Query to get full details of a single Whiteboard (can be personal or project-based)
export const GET_WHITEBOARD_DETAILS = gql`
  query GetWhiteboardDetails($id: ID!) {
    getWhiteboardDetails(id: $id) {
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