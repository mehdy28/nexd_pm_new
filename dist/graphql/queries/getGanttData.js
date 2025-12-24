// graphql/queries/getGanttData.ts
import { gql } from '@apollo/client';
export const GET_GANTT_DATA_QUERY = gql `
  query GetGanttData($projectId: ID!, $sprintId: ID) {
    getGanttData(projectId: $projectId, sprintId: $sprintId) {
      sprints {
        id
        name
        __typename
      }
      tasks {
        id
        name
        start
        end
        progress
        type
        sprint # parent sprint ID
        hideChildren
        displayOrder
        description
        assignee { # Assignee for task type
          id
          firstName
          lastName
          avatar
          __typename
        }
        originalTaskId # To link back to Task.id or Milestone.id for mutations
        originalType # "TASK" or "MILESTONE"
        __typename
      }
      __typename
    }
  }
`;
