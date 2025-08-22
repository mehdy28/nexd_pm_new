"use client"

import { useQuery, useMutation } from "@apollo/client"
import { GET_PROMPTS, GET_PROMPT } from "@/graphql/queries/prompt"
import { CREATE_PROMPT, UPDATE_PROMPT, DELETE_PROMPT } from "@/graphql/mutations/prompt"

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
