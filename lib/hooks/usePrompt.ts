"use client"

import { useQuery, useMutation } from "@apollo/client"
import { gql } from "@apollo/client"

const GET_PROMPTS = gql`
  query GetPrompts($projectId: ID, $userId: ID, $personal: Boolean) {
    prompts(projectId: $projectId, userId: $userId, personal: $personal) {
      id
      title
      description
      category
      tags
      isPublic
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

const GET_PROMPT = gql`
  query GetPrompt($id: ID!) {
    prompt(id: $id) {
      id
      title
      content
      description
      category
      tags
      isPublic
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

const CREATE_PROMPT = gql`
  mutation CreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      id
      title
      content
      description
      category
      tags
      isPublic
      createdAt
    }
  }
`

const UPDATE_PROMPT = gql`
  mutation UpdatePrompt($id: ID!, $input: UpdatePromptInput!) {
    updatePrompt(id: $id, input: $input) {
      id
      title
      content
      description
      category
      tags
      isPublic
      updatedAt
    }
  }
`

const DELETE_PROMPT = gql`
  mutation DeletePrompt($id: ID!) {
    deletePrompt(id: $id)
  }
`

export function usePrompts(projectId?: string, userId?: string, personal?: boolean) {
  const { data, loading, error, refetch } = useQuery(GET_PROMPTS, {
    variables: { projectId, userId, personal },
  })

  return {
    prompts: data?.prompts || [],
    loading,
    error,
    refetch,
  }
}

export function usePrompt(id: string) {
  const { data, loading, error, refetch } = useQuery(GET_PROMPT, {
    variables: { id },
    skip: !id,
  })

  return {
    prompt: data?.prompt,
    loading,
    error,
    refetch,
  }
}

export function useCreatePrompt() {
  const [createPrompt, { loading, error }] = useMutation(CREATE_PROMPT)

  return {
    createPrompt,
    loading,
    error,
  }
}

export function useUpdatePrompt() {
  const [updatePrompt, { loading, error }] = useMutation(UPDATE_PROMPT)

  return {
    updatePrompt,
    loading,
    error,
  }
}

export function useDeletePrompt() {
  const [deletePrompt, { loading, error }] = useMutation(DELETE_PROMPT)

  return {
    deletePrompt,
    loading,
    error,
  }
}
