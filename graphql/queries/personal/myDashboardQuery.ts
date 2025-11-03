import { gql } from "@apollo/client"

export const GET_MY_DASHBOARD_DATA = gql`
  query GetMyDashboardData {
    getMyDashboardData {
      kpis {
        totalTasks
        completedTasks
        inProgressTasks
        overdueTasks
      }
      priorityDistribution {
        name
        value
      }
      statusDistribution {
        name
        value
      }
    }
  }
`