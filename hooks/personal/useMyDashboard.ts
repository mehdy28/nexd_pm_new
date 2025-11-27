import { useQuery } from "@apollo/client"
import { GET_MY_DASHBOARD_DATA } from "@/graphql/queries/personal/myDashboardQuery"

export const useMyDashboard = () => {
  const { data, loading, error, refetch } = useQuery(GET_MY_DASHBOARD_DATA, {
    fetchPolicy: "network-only",
  })

  return {
    dashboardData: data?.getMyDashboardData,
    loading,
    error,
    refetch,
  }
}