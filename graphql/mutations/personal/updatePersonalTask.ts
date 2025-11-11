// graphql/mutations/personal/updatePersonalTask.ts
import { gql } from "@apollo/client"

export const UPDATE_PERSONAL_TASK_MUTATION = gql`
  mutation UpdatePersonalTask($input: UpdatePersonalTaskInput!) {
    updatePersonalTask(input: $input) {
      id
      title
      description
      status
      priority
      endDate
      points
      completed # Derived field
      personalSectionId # Will be null for personal tasks
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