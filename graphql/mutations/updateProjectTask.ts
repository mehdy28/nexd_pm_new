// graphql/mutations/updateProjectTask.ts
import { gql } from '@apollo/client';

export const UPDATE_PROJECT_TASK_MUTATION = gql`
  mutation UpdateProjectTask($input: UpdateProjectTaskInput!) {
    updateProjectTask(input: $input) {
      id
      title
      description
      status
      priority
      endDate
      points
      completed # Derived field
      sprintId # <--- ADD THIS
      sectionId # <--- ADD THIS
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
`;