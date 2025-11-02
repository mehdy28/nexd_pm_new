// graphql/queries/projectDashboardQuery.ts

import { gql } from "@apollo/client"

export const GET_PROJECT_DASHBOARD_DATA = gql`
  query GetProjectDashboardData($projectId: ID!, $sprintId: ID) {
    getProjectDashboardData(projectId: $projectId, sprintId: $sprintId) {
      kpis {
        totalTasks
        completedTasks
        inProgressTasks
        overdueTasks
        totalPoints
        completedPoints
        completionPercentage
        velocity
      }
      priorityDistribution {
        name
        value
      }
      statusDistribution {
        name
        value
      }
      burnupChart {
        date
        scope
        actual
      }
      burndownChart {
        date
        ideal
        actual
      }
      memberWorkload {
        assigneeName
        taskCount
        totalPoints
        assigneeAvatar
        assigneeId
      }
      sprints {
        id
        name
      }
    }
  }
`