import { gql } from "@apollo/client"

export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      name
      avatar
      role
      createdAt
      workspaceMembers {
        id
        role
        workspace {
          id
          name
          slug
          avatar
        }
      }
      ownedWorkspaces {
        id
        name
        slug
        avatar
        plan
      }
    }
  }
`

export const GET_USER_ACTIVITIES = gql`
  query GetUserActivities {
    activities {
      id
      type
      data
      createdAt
      user {
        id
        name
        avatar
      }
      project {
        id
        name
        color
      }
      task {
        id
        title
      }
      document {
        id
        title
      }
      wireframe {
        id
        title
      }
    }
  }
`
