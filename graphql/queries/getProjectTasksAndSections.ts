import { gql } from '@apollo/client';

export const GET_PROJECT_TASKS_AND_SECTIONS_QUERY = gql`
  query GetProjectTasksAndSections($projectId: ID!, $sprintId: ID) {
    getProjectTasksAndSections(projectId: $projectId, sprintId: $sprintId) {
      sprints { # List of all sprints for the dropdown filter
        id
        name
      }
      sections {
        id
        name # Maps to title in your UI
        tasks {
          id
          title
          description
          status # Maps to completed in your UI
          priority
          dueDate # Maps to due in your UI
          # Assuming you'll add 'points' to the Task model/schema
          points # Placeholder for Story Points
          assignee { # Detailed assignee information
            id
            firstName
            lastName
            avatar
          }
        }
      }
    }
  }
`;