// graphql/queries/getProjectTasksAndSections.ts

import { gql } from '@apollo/client';

export const GET_PROJECT_TASKS_AND_SECTIONS_QUERY = gql`
  query GetProjectTasksAndSections($projectId: ID!, $sprintId: ID) {
    getProjectTasksAndSections(projectId: $projectId, sprintId: $sprintId) {
      sprints {
        id
        name
      }
      sections {
        id
        name
        tasks {
          id
          title
          description
          status
          priority
          dueDate
          points
          assignee {
            id
            firstName
            lastName
            avatar
          }
        }
      }
      projectMembers {
        id
        role
        user {
          id
          firstName
          lastName
          avatar
          email
        }
      }
      defaultSelectedSprintId # NEW: Add this field
    }
  }
`;