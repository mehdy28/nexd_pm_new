//graphql/queries/getProjectDetails.ts

import { gql } from '@apollo/client';

export const GET_PROJECT_DETAILS_QUERY = gql`
  query GetProjectDetails($projectId: ID!) {
    getProjectDetails(projectId: $projectId) {
      id
      name
      description
      status
      color
      createdAt

      # Add this block
      workspace {
        id
      }

      # Project statistics (computed in resolver)
      totalTasks
      completedTasks
      inProgressTasks
      overdueTasks
      upcomingDeadlines

      # Project Members
      members {
        id
        role
        user {
          id
          email
          firstName
          lastName
          avatar
          avatarColor
        }
      }

      # Sprints
      sprints {
        id
        name
        description
        startDate
        endDate
        isCompleted
      }
    }
  }
`;
