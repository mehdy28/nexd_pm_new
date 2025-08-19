import { gql } from "@apollo/client"

export const GET_WORKSPACES = gql`
  query GetWorkspaces {
    workspaces {
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
      members {
        id
        role
        user {
          id
          name
          email
          avatar
        }
      }
      projects {
        id
        name
        color
        status
        privacy
      }
    }
  }
`

export const GET_WORKSPACE = gql`
  query GetWorkspace($id: ID!) {
    workspace(id: $id) {
      id
      name
      slug
      description
      avatar
      plan
      createdAt
      updatedAt
      owner {
        id
        name
        email
        avatar
      }
      members {
        id
        role
        joinedAt
        user {
          id
          name
          email
          avatar
        }
      }
      projects {
        id
        name
        description
        color
        status
        privacy
        createdAt
        members {
          id
          user {
            id
            name
            avatar
          }
        }
      }
      subscription {
        id
        plan
        status
        currentPeriodEnd
        cancelAtPeriodEnd
      }
      settings {
        id
        allowGuestAccess
        defaultProjectPrivacy
        timeZone
      }
    }
  }
`
