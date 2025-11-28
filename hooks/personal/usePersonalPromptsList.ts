"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useDebounce } from "use-debounce"

import { GET_MY_PROMPTS_QUERY } from "@/graphql/queries/personal/personalPromptRelatedQueries"
import {
  CREATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
  DELETE_MANY_PROMPTS_MUTATION,
} from "@/graphql/mutations/personal/personalPromptRelatedMutations"
import { Prompt, Block, PromptVariable } from "@/components/prompt-lab/store"

function generateClientKey(prefix: string = ""): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

type PromptCreationData = Partial<{
  title: string
  content: Block[]
  context: string
  description: string
  category: string
  tags: string[]
  isPublic: boolean
  model: string
  variables: Partial<PromptVariable>[]
}>

interface UsePersonalPromptsListHook {
  prompts: Prompt[]
  loadingList: boolean
  listError: string | null
  createPrompt: (initialData?: PromptCreationData) => Promise<Prompt | undefined>
  deletePrompt: (id: string) => Promise<void>
  deleteManyPrompts: (ids: string[]) => Promise<void>
  triggerPromptsListFetch: (forceRefetch?: boolean) => void
  q: string
  setQ: (q: string) => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  totalPages: number
  totalPromptsCount: number
}

const ITEMS_PER_PAGE = 9

export function usePersonalPromptsList(selectedId: string | null): UsePersonalPromptsListHook {
  const [localListError, setLocalListError] = useState<string | null>(null)

  // Search and Pagination State
  const [q, setQ] = useState("")
  const [debouncedQ] = useDebounce(q, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE)

  // --- QUERY ---
  const {
    data: promptsListData,
    loading: apolloListLoading,
    error: apolloListError,
    refetch: apolloRefetchPromptsList,
  } = useQuery(GET_MY_PROMPTS_QUERY, {
    variables: {
      skip: (page - 1) * pageSize,
      take: pageSize,
      q: debouncedQ,
    },
    skip: selectedId !== null,
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
    onError: err => {
      console.error("[usePersonalPromptsList] [Error: QueryList]", err)
      setLocalListError("Failed to load prompts list.")
    },
  })

  // --- DERIVED STATE (Fix for Deletion Issue) ---
  // We use useMemo instead of onCompleted + useState to ensure UI stays in sync with Apollo Cache/Refetches
  const prompts = useMemo(() => {
    if (!promptsListData?.getMyPrompts?.prompts) {
      return []
    }
    
    console.log(`[usePersonalPromptsList] [Trace: Memo] Recalculating prompts. Count: ${promptsListData.getMyPrompts.prompts.length}`)

    return promptsListData.getMyPrompts.prompts.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      tags: p.tags,
      isPublic: p.isPublic,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      model: p.model || "gpt-4o",
      projectId: p.projectId,
      activeVersion: undefined,
      versions: [],
    })) as Prompt[]
  }, [promptsListData])

  const totalPromptsCount = useMemo(() => {
    return promptsListData?.getMyPrompts?.totalCount || 0
  }, [promptsListData])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalPromptsCount / pageSize))
  }, [totalPromptsCount, pageSize])

  // --- MUTATIONS ---

  const [createPromptMutation] = useMutation(CREATE_PROMPT_MUTATION, {
    refetchQueries: [
      {
        query: GET_MY_PROMPTS_QUERY,
        variables: { skip: (page - 1) * pageSize, take: pageSize, q: debouncedQ },
      },
    ],
    awaitRefetchQueries: true,
    onError: err => setLocalListError("Failed to create prompt."),
  })

  const [deletePromptMutation] = useMutation(DELETE_PROMPT_MUTATION, {
    refetchQueries: [
      {
        query: GET_MY_PROMPTS_QUERY,
        variables: { skip: (page - 1) * pageSize, take: pageSize, q: debouncedQ },
      },
    ],
    awaitRefetchQueries: true,
    onCompleted: data => {
      console.log(`[usePersonalPromptsList] [Trace: DeleteMutation] Completed. Deleted ID: ${data?.deletePrompt?.id}`)
      // If we deleted the last item on the page, go back
      if (prompts.length === 1 && page > 1) {
        setPage(p => p - 1)
      }
    },
    onError: err => setLocalListError("Failed to delete prompt."),
  })

  const [deleteManyPromptsMutation] = useMutation(DELETE_MANY_PROMPTS_MUTATION, {
    refetchQueries: [
      {
        query: GET_MY_PROMPTS_QUERY,
        variables: { skip: (page - 1) * pageSize, take: pageSize, q: debouncedQ },
      },
    ],
    awaitRefetchQueries: true,
    onCompleted: data => {
      const count = data?.deleteManyPrompts?.count || 0
      console.log(`[usePersonalPromptsList] [Trace: DeleteManyMutation] Completed. Deleted count: ${count}`)
      if (prompts.length <= count && page > 1) {
        setPage(p => p - 1)
      }
    },
    onError: err => setLocalListError("Failed to delete selected prompts."),
  })

  // --- HANDLERS ---

  const handleSetQ = (newQ: string) => {
    setPage(1)
    setQ(newQ)
  }

  const handleSetPageSize = (newPageSize: number) => {
    setPage(1)
    setPageSize(newPageSize)
  }

  const triggerPromptsListFetch = useCallback(
    (forceRefetch: boolean = false) => {
      if (forceRefetch) {
        console.log("[usePersonalPromptsList] [Trace] Force refetch triggering.")
        setLocalListError(null)
        setPage(1)
        apolloRefetchPromptsList()
      }
    },
    [apolloRefetchPromptsList],
  )

  const createPrompt = useCallback(
    async (initialData?: PromptCreationData): Promise<Prompt | undefined> => {
      setLocalListError(null)
      try {
        const defaultPromptInput = {
          title: "Untitled Prompt",
          content: [],
          context: "",
          description: "",
          category: "",
          tags: [],
          isPublic: false,
          model: "gpt-4o",
          projectId: null,
          variables: [],
        }

        const finalInput = { ...defaultPromptInput, ...initialData }
        const cleanContent = finalInput.content?.map(({ __typename, id, ...block }, index) => ({
            ...block,
            order: index,
          })) ?? []
        const cleanVariables = finalInput.variables?.map(({ __typename, id, ...variable }) => variable) ?? []

        const { data } = await createPromptMutation({
          variables: {
            input: { ...finalInput, content: cleanContent, variables: cleanVariables },
          },
        })

        if (data?.createPrompt) {
            // Helper to format returned data
            const newPrompt: Prompt = {
              id: data.createPrompt.id,
              title: data.createPrompt.title,
              description: data.createPrompt.description,
              tags: data.createPrompt.tags,
              isPublic: data.createPrompt.isPublic,
              createdAt: data.createPrompt.createdAt,
              updatedAt: data.createPrompt.updatedAt,
              model: data.createPrompt.model,
              projectId: data.createPrompt.projectId,
              activeVersion: data.createPrompt.activeVersion ? {
                  ...data.createPrompt.activeVersion,
                  content: data.createPrompt.activeVersion.content as Block[],
                  variables: data.createPrompt.activeVersion.variables as PromptVariable[],
              } : undefined,
              versions: data.createPrompt.versions.map((v: any) => ({
                ...v,
                id: v.id || generateClientKey("db-ver-"),
              })),
            }
          return newPrompt
        }
      } catch (err) {
        console.error(err)
        setLocalListError("Failed to create prompt.")
      }
      return undefined
    },
    [createPromptMutation],
  )

  const deletePrompt = useCallback(
    async (id: string) => {
      setLocalListError(null)
      console.log(`[usePersonalPromptsList] [Trace: Delete] Calling mutation for ID: ${id}`)
      await deletePromptMutation({ variables: { id } })
    },
    [deletePromptMutation],
  )

  const deleteManyPrompts = useCallback(
    async (ids: string[]) => {
      setLocalListError(null)
      console.log(`[usePersonalPromptsList] [Trace: DeleteMany] Calling mutation for IDs: ${ids.join(', ')}`)
      await deleteManyPromptsMutation({ variables: { ids } })
    },
    [deleteManyPromptsMutation]
  )

  return {
    prompts,
    loadingList: apolloListLoading,
    listError: localListError || apolloListError?.message || null,
    createPrompt,
    deletePrompt,
    deleteManyPrompts,
    triggerPromptsListFetch,
    q,
    setQ: handleSetQ,
    page,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    totalPages,
    totalPromptsCount,
  }
}