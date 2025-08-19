import { gql } from "@apollo/client"

export const GET_PROJECTS = gql`
  query GetProjects($workspaceId: ID!) {
    projects(workspaceId: $workspaceId) {
      id
      name
      description
      color
      privacy
      status
      startDate
      endDate
      createdAt
      workspace {
        id
        name
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
    }
  }
`

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      color
      privacy
      status
      startDate
      endDate
      createdAt
      updatedAt
      workspace {
        id
        name
        slug
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
      tasks {
        id
        title
        description
        status
        priority
        dueDate
        createdAt
        assignee {
          id
          name
          avatar
        }
        creator {
          id
          name
          avatar
        }
        labels {
          id
          name
          color
        }
      }
      documents {
        id
        title
        type
        createdAt
        updatedAt
      }
      wireframes {
        id
        title
        thumbnail
        createdAt
        updatedAt
      }
    }
  }
`
