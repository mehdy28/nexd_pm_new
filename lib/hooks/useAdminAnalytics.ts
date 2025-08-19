import { useQuery } from "@apollo/client"
import { gql } from "@apollo/client"

const GET_DASHBOARD_METRICS = gql`
  query GetAdminDashboardMetrics {
    adminDashboardMetrics {
      totalUsers
      activeWorkspaces
      totalProjects
      tasksCreated
      documentsCount
      wireframesCount
      monthlyRevenue
      churnRate
    }
  }
`

const GET_USER_GROWTH_DATA = gql`
  query GetAdminUserGrowthData {
    adminUserGrowthData {
      month
      users
      projects
      tasks
    }
  }
`

const GET_SUBSCRIPTION_DATA = gql`
  query GetAdminSubscriptionData {
    adminSubscriptionData {
      name
      value
      color
      workspaces
      projects
      revenue
    }
  }
`

const GET_CONTENT_CREATION_DATA = gql`
  query GetAdminContentCreationData {
    adminContentCreationData {
      month
      documents
      wireframes
      tasks
    }
  }
`

const GET_RECENT_ACTIVITY = gql`
  query GetAdminRecentActivity {
    adminRecentActivity {
      id
      user
      avatar
      action
      target
      workspace
      plan
      time
      type
    }
  }
`

export function useAdminDashboardMetrics() {
  const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_METRICS)

  return {
    metrics: data?.adminDashboardMetrics,
    loading,
    error,
    refetch,
  }
}

export function useAdminUserGrowthData() {
  const { data, loading, error } = useQuery(GET_USER_GROWTH_DATA)

  return {
    userGrowthData: data?.adminUserGrowthData || [],
    loading,
    error,
  }
}

export function useAdminSubscriptionData() {
  const { data, loading, error } = useQuery(GET_SUBSCRIPTION_DATA)

  return {
    subscriptionData: data?.adminSubscriptionData || [],
    loading,
    error,
  }
}

export function useAdminContentCreationData() {
  const { data, loading, error } = useQuery(GET_CONTENT_CREATION_DATA)

  return {
    contentCreationData: data?.adminContentCreationData || [],
    loading,
    error,
  }
}

export function useAdminRecentActivity() {
  const { data, loading, error } = useQuery(GET_RECENT_ACTIVITY)

  return {
    recentActivity: data?.adminRecentActivity || [],
    loading,
    error,
  }
}
