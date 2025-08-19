"use client"

import { useQuery } from "@apollo/client"
import { gql } from "@apollo/client"

const GET_ACTIVITIES = gql`
  query GetActivities($projectId: ID, $userId: ID, $limit: Int) {
    activities(projectId: $projectId, userId: $userId, limit: $limit) {
      id
      type
      data
      createdAt
      user {
        id
        name
        avatar
      }
      project {
        id
        name
      }
      task {
        id
        title
      }
      document {
        id
        title
      }
      wireframe {
        id
        title
      }
      prompt {
        id
        title
      }
    }
  }
`

export function useActivities(projectId?: string, userId?: string, limit?: number) {
  const { data, loading, error, refetch } = useQuery(GET_ACTIVITIES, {
    variables: { projectId, userId, limit },
  })

  return {
    activities: data?.activities || [],
    loading,
    error,
    refetch,
  }
}
