// graphql/mutations/createProjectTask.ts
import { gql } from '@apollo/client';
export const CREATE_PROJECT_TASK_MUTATION = gql `
  mutation CreateProjectTask($input: CreateProjectTaskInput!) {
    createProjectTask(input: $input) {
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
        __typename # <--- Add __typename for consistent Apollo cache behavior
      }
      __typename # <--- Add __typename for consistent Apollo cache behavior
    }
  }
`;
