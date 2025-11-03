import { gql } from "@apollo/client"

export const UPDATE_PERSONAL_TASK_MUTATION = gql`
  mutation UpdatePersonalTask($input: UpdatePersonalTaskInput!) {
    updatePersonalTask(input: $input) {
      id
      title
      description
      status
      priority
      dueDate
      points
      completed # Derived field
      sprintId # Will be null for personal tasks
      sectionId # Will be null for personal tasks
      assignee {
        id
        firstName
        lastName
        avatar
        __typename
      }
      __typename
    }
  }
`