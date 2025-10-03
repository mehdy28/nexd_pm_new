// graphql/queries/getGanttData.ts

import { gql } from '@apollo/client';

export const GET_GANTT_DATA_QUERY = gql`
  query GetGanttData($projectId: ID!, $sprintId: ID) {
    getGanttData(projectId: $projectId, sprintId: $sprintId) {
      sprints {
        id
        name
      }
      tasks {
        id
        name
        start
        end
        progress
        type
        sprint # This refers to the parent sprint ID
        hideChildren
        displayOrder
        description
        assignee {
          id
          firstName
          lastName
          avatar
        }
      }
    }
  }
`;