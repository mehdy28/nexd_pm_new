"use client"

import { useQuery, useMutation } from "@apollo/client"
import { gql } from "@apollo/client"

const GET_WIREFRAMES = gql`
  query GetWireframes($projectId: ID, $userId: ID, $personal: Boolean) {
    wireframes(projectId: $projectId, userId: $userId, personal: $personal) {
      id
      title
      thumbnail
      createdAt
      updatedAt
      project {
        id
        name
        color
      }
    }
  }
`

const GET_WIREFRAME = gql`
  query GetWireframe($id: ID!) {
    wireframe(id: $id) {
      id
      title
      data
      thumbnail
      createdAt
      updatedAt
      project {
        id
        name
        color
      }
      comments {
        id
        content
        createdAt
        author {
          id
          name
          avatar
        }
      }
    }
  }
`

const CREATE_WIREFRAME = gql`
  mutation CreateWireframe($input: CreateWireframeInput!) {
    createWireframe(input: $input) {
      id
      title
      data
      thumbnail
      createdAt
    }
  }
`

const UPDATE_WIREFRAME = gql`
  mutation UpdateWireframe($id: ID!, $input: UpdateWireframeInput!) {
    updateWireframe(id: $id, input: $input) {
      id
      title
      data
      thumbnail
      updatedAt
    }
  }
`

const DELETE_WIREFRAME = gql`
  mutation DeleteWireframe($id: ID!) {
    deleteWireframe(id: $id)
  }
`
export function useWireframes(projectId?: string, userId?: string, personal?: boolean) {
  const { data, loading, error, refetch } = useQuery(GET_WIREFRAMES, {
    variables: { projectId, userId, personal },
  })

  return {
    wireframes: data?.wireframes || [],
    loading,
    error,
    refetch,
  }
}

export function useWireframe(id: string) {
  const { data, loading, error, refetch } = useQuery(GET_WIREFRAME, {
    variables: { id },
    skip: !id,
  })

  return {
    wireframe: data?.wireframe,
    loading,
    error,
    refetch,
  }
}

export function useCreateWireframe() {
  const [createWireframe, { loading, error }] = useMutation(CREATE_WIREFRAME)

  return {
    createWireframe,
    loading,
    error,
  }
}

export function useUpdateWireframe() {
  const [updateWireframe, { loading, error }] = useMutation(UPDATE_WIREFRAME)

  return {
    updateWireframe,
    loading,
    error,
  }
}

export function useDeleteWireframe() {
  const [deleteWireframe, { loading, error }] = useMutation(DELETE_WIREFRAME)

  return {
    deleteWireframe,
    loading,
    error,
  }
}
