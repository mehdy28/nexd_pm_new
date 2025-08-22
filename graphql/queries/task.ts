import { gql } from "@apollo/client"

export const GET_TASKS = gql`
  query GetTasks($projectId: ID, $userId: ID, $personal: Boolean) {
    tasks(projectId: $projectId, userId: $userId, personal: $personal) {
      id
      title
      description
      status
      priority
      points
      dueDate
      createdAt
      updatedAt
      section {
        id
        title
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

export const GET_TASK_SECTIONS = gql`
  query GetTaskSections($projectId: ID, $userId: ID, $personal: Boolean) {
    taskSections(projectId: $projectId, userId: $userId, personal: $personal) {
      id
      title
      order
      createdAt
      updatedAt
      tasks {
        id
        title
        description
        status
        priority
        points
        dueDate
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
      points
      dueDate
      createdAt
      updatedAt
      section {
        id
        title
      }
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
        points
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
