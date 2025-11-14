import { gql } from "@apollo/client"

export const CREATE_PERSONAL_TASK_MUTATION = gql`
  mutation CreatePersonalTask($input: CreatePersonalTaskInput!) {
    createPersonalTask(input: $input) {
      id
      title
      description
      status
      priority
      endDate
      points
      completed # Derived field
      sprintId # Will be null for personal tasks
      personalSectionId # Will be null for personal tasks, use personalSectionId from input
      assignee {
        id
        firstName
        lastName
        avatar
        __typename # <--- Add __typename for consistent Apollo cache behavior
      }
      __typename # <--- Add __typename for consistent Apollo cache behavior
    }
  }
`