// hooks/use-admin-dashboard.ts
import { gql, useQuery } from "@apollo/client"
import { AdminPageData } from "@/types" // Assuming types are generated

const GET_ADMIN_DASHBOARD_PAGE_DATA = gql`
  query AdminGetDashboardPageData {
    adminGetDashboardPageData {
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
        user { id firstName lastName avatar avatarColor }
        data
      }
    }
  }
`

export const useAdminDashboard = () => {
  const { data, loading, error, refetch } = useQuery<{ adminGetDashboardPageData: AdminPageData }>(
    GET_ADMIN_DASHBOARD_PAGE_DATA
  )

  return {
    data: data?.adminGetDashboardPageData,
    loading,
    error,
    refetch,
  }
}