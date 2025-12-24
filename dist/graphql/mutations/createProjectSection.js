// graphql/mutations/createProjectSection.ts
import { gql } from '@apollo/client';
export const CREATE_PROJECT_SECTION_MUTATION = gql `
  mutation CreateProjectSection($projectId: ID!, $name: String!, $order: Int) {
    createProjectSection(projectId: $projectId, name: $name, order: $order) {
      id
      name
      order
      # Include other fields needed for UI display or cache update
      tasks { # Return tasks to keep consistency with ListView's SectionUI type
        id
        title
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
  }
`;
