// graphql/mutations/ganttMutations.ts
import { gql } from '@apollo/client';

export const CREATE_GANTT_TASK_MUTATION = gql`
  mutation CreateGanttTask($input: CreateGanttTaskInput!) {
    createGanttTask(input: $input) {
      id
      name
      start
      end
      progress
      type
      sprint
      hideChildren
      displayOrder
      description
      assignee {
        id
        firstName
        lastName
        avatar
        __typename
      }
      originalTaskId
      originalType
      __typename
    }
  }
`;

export const UPDATE_GANTT_TASK_MUTATION = gql`
  mutation UpdateGanttTask($input: UpdateGanttTaskInput!) {
    updateGanttTask(input: $input) {
      id
      name
      start
      end
      progress
      type
      sprint
      hideChildren
      displayOrder
      description
      assignee {
        id
        firstName
        lastName
        avatar
        __typename
      }
      originalTaskId
      originalType
      __typename
    }
  }
`;

// Assuming you already have this mutation or define it separately
export const UPDATE_SPRINT_MUTATION = gql`
  mutation UpdateSprint($input: UpdateSprintInput!) {
    updateSprint(input: $input) {
      id
      name
      startDate
      endDate
      isCompleted
      status
      __typename
    }
  }
`;