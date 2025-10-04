// graphql/mutations/createProjectTask.ts

import { gql } from '@apollo/client';

export const CREATE_PROJECT_TASK_MUTATION = gql`
  mutation CreateProjectTask($input: CreateProjectTaskInput!) {
    createProjectTask(input: $input) {
      id
      title
      description
      status
      priority
      dueDate
      points
      completed # Derived field
      assignee {
        id
        firstName
        lastName
        avatar
      }
    }
  }
`;