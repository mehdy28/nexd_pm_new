// hooks/useProjectDashboard.ts

import { useQuery } from "@apollo/client"
import { GET_PROJECT_DASHBOARD_DATA } from "@/graphql/queries/projectDashboardQuery"


export const useProjectDashboard = (projectId: string, sprintId?: string | null) => {
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_DASHBOARD_DATA, {
    variables: {
      projectId,
      sprintId,
    },
    skip: !projectId,
    fetchPolicy: "network-only",
  })

  return {
    dashboardData: data?.getProjectDashboardData,
    loading,
    error,
    refetch,
  }
}
