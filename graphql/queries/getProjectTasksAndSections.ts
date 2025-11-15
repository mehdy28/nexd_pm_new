// graphql/queries/getProjectTasksAndSections.ts
import { gql } from '@apollo/client';

export const GET_PROJECT_TASKS_AND_SECTIONS_QUERY = gql`
  query GetProjectTasksAndSections($projectId: ID!, $sprintId: ID) {
    getProjectTasksAndSections(projectId: $projectId, sprintId: $sprintId) {
      sprints {
        id
        name
        __typename # <--- Add __typename
      }
      sections {
        id
        name
        order # <--- ADD THIS FOR SECTION REORDERING
        tasks {
          id
          title
          description
          status
          priority
          endDate
          points
          completed # <--- ADD THIS (derived field for UI)
          sprintId # <--- ADD THIS
          sectionId # <--- ADD THIS
          assignee {
            id
            firstName
            lastName
            avatar
            __typename # <--- Add __typename
          }
          __typename # <--- Add __typename
        }
        __typename # <--- Add __typename
      }
      # Removed defaultSelectedSprintId from here as it's confusing state management.
      # Client-side derived from sprintIdFromProps or local default.
      projectMembers {
        id
        role
        user {
          id
          firstName
          lastName
          avatar
          email
          __typename # <--- Add __typename
        }
        __typename # <--- Add __typename
      }
      __typename # <--- Add __typename
    }
  }
`;