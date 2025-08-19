import { gql } from "@apollo/client"

export const GET_TASKS = gql`
  query GetTasks($projectId: ID!) {
    tasks(projectId: $projectId) {
      id
      title
      description
      status
      priority
      dueDate
      createdAt
      updatedAt
      assignee {
        id
        name
        email
        avatar
      }
      creator {
        id
        name
        email
        avatar
      }
      parent {
        id
        title
      }
      subtasks {
        id
        title
        status
        assignee {
          id
          name
          avatar
        }
      }
      labels {
        id
        name
        color
      }
      comments {
        id
        content
        createdAt
        author {
          id
          name
          avatar
        }
      }
    }
  }
`

export const GET_TASK = gql`
  query GetTask($id: ID!) {
    task(id: $id) {
      id
      title
      description
      status
      priority
      dueDate
      createdAt
      updatedAt
      project {
        id
        name
        color
      }
      assignee {
        id
        name
        email
        avatar
      }
      creator {
        id
        name
        email
        avatar
      }
      parent {
        id
        title
        status
      }
      subtasks {
        id
        title
        description
        status
        priority
        dueDate
        assignee {
          id
          name
          avatar
        }
      }
      labels {
        id
        name
        color
      }
      comments {
        id
        content
        createdAt
        updatedAt
        author {
          id
          name
          avatar
        }
        mentions {
          id
          name
        }
      }
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
      }
    }
  }
`
