// graphql/queries/getProjectDetails.ts

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
          avatar # Assuming User has an avatar field
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

      # If you uncomment recent activity, you'd add it here
      # activities {
      #   id
      #   type
      #   data # Raw JSON might be tricky to display directly
      #   createdAt
      #   user {
      #     id
      #     firstName
      #     lastName
      #     avatar
      #   }
      # }
    }
  }
`;