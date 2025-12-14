// hooks/use-admin-dashboard.ts
import { gql, useQuery } from "@apollo/client"
import { AdminDashboardData } from "@/types" // Assuming types are generated

const GET_ADMIN_DASHBOARD_DATA = gql`
  query AdminGetDashboardData($timeframe: String) {
    adminGetDashboardData(timeframe: $timeframe) {
      kpis {
        totalUsers { value change trend }
        activeWorkspaces { value change trend }
        totalProjects { value change trend }
        tasksCreated { value change trend }
        documents { value change trend }
        Whiteboards { value change trend }
        monthlyRevenue { value change trend }
        churnRate { value change trend }
      }
      userGrowth { date users projects tasks }
      contentCreation { date documents Whiteboards tasks }
      mrrGrowth { date value }
      churnRate { date value }
      subscriptionDistribution { name value }
      revenueByPlan { name value }
      featureAdoption { name value }
      topWorkspaces { id name activityCount }
      recentActivities {
        id
        action
        createdAt
        user {
          id
          firstName
          lastName
          avatar
          avatarColor
        }
        data
      }
    }
  }
`

export const useAdminDashboard = (timeframe: string = "30d") => {
  const { data, loading, error, refetch } = useQuery<{ adminGetDashboardData: AdminDashboardData }>(
    GET_ADMIN_DASHBOARD_DATA,
    {
      variables: { timeframe },
    },
  )

  return {
    data: data?.adminGetDashboardData,
    loading,
    error,
    refetch,
  }
}