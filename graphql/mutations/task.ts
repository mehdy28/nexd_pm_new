import { gql } from "@apollo/client"

export const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      description
      status
      priority
      points
      dueDate
      createdAt
      section {
        id
        title
      }
      project {
        id
        name
      }
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
`

export const CREATE_TASK_SECTION = gql`
  mutation CreateTaskSection($input: CreateTaskSectionInput!) {
    createTaskSection(input: $input) {
      id
      title
      order
      createdAt
      tasks {
        id
        title
        status
        priority
        points
      }
    }
  }
`

export const UPDATE_TASK_SECTION = gql`
  mutation UpdateTaskSection($id: ID!, $input: UpdateTaskSectionInput!) {
    updateTaskSection(id: $id, input: $input) {
      id
      title
      order
      updatedAt
    }
  }
`

export const DELETE_TASK_SECTION = gql`
  mutation DeleteTaskSection($id: ID!) {
    deleteTaskSection(id: $id)
  }
`

export const UPDATE_TASK = gql`
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      id
      title
      description
      status
      priority
      points
      dueDate
      updatedAt
      section {
        id
        title
      }
      assignee {
        id
        name
        avatar
      }
    }
  }
`

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`
